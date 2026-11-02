import { normalizeFormulas } from '../engine/formula.ts';
import {
  builtinStandard,
  defaultSettings,
  MFJ_2025,
  SINGLE_2025,
  validateBrackets,
  workbookSet,
  WORKBOOK_YEAR,
  type Bracket,
  type BracketSet,
  type FilingStatus,
  type Settings,
} from '../engine/brackets.ts';
import type { OptionInput, Plan } from '../engine/plan.ts';

export const SETTINGS_KEY = 'ptc.settings.v1';
export const PLANS_KEY = 'ptc.plans.v1';
export const CURRENT_PLAN_KEY = 'ptc.currentPlan.v1';

function memory(): Storage | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage;
  } catch {
    return null;
  }
}

function readRaw(key: string): unknown {
  try {
    const store = memory();
    if (!store) return undefined;
    const raw = store.getItem(key);
    if (raw == null || raw === '') return undefined;
    return JSON.parse(raw) as unknown;
  } catch {
    return undefined;
  }
}

function writeRaw(key: string, value: unknown): void {
  try {
    memory()?.setItem(key, JSON.stringify(value));
  } catch {
    // A full or blocked store should not take the app down.
  }
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isFilingStatus(value: unknown): value is FilingStatus {
  return value === 'single' || value === 'mfj' || value === 'mfs' || value === 'hoh';
}

function isBracket(value: unknown): value is Bracket {
  if (!value || typeof value !== 'object') return false;
  const bracket = value as Bracket;
  const upToOk = bracket.upTo === null || isFiniteNumber(bracket.upTo);
  return upToOk && isFiniteNumber(bracket.rate);
}

function isBracketSet(value: unknown): value is BracketSet {
  if (!value || typeof value !== 'object') return false;
  const set = value as BracketSet;
  const standard = (set as { standardDeduction?: unknown }).standardDeduction;
  return (
    typeof set.year === 'number' &&
    isFilingStatus(set.filingStatus) &&
    (standard == null || isFiniteNumber(standard)) &&
    Array.isArray(set.brackets) &&
    set.brackets.every(isBracket)
  );
}

function sameBrackets(saved: Bracket[], builtin: readonly Bracket[]): boolean {
  return (
    saved.length === builtin.length &&
    saved.every((bracket, index) => bracket.upTo === builtin[index]?.upTo && bracket.rate === builtin[index]?.rate)
  );
}

/** Saved copies of the original 2025 seed become the 2026 workbook, keeping any custom planning rules. */
function isUntouched2025(settings: Settings): boolean {
  if (settings.year !== 2025 || settings.filingStatus !== 'single' || settings.defaultStandardDeduction !== 18_000) {
    return false;
  }
  if (settings.bracketSets.length !== 2) return false;
  const single = settings.bracketSets.find((set) => set.year === 2025 && set.filingStatus === 'single');
  const married = settings.bracketSets.find((set) => set.year === 2025 && set.filingStatus === 'mfj');
  if (!single || !married) return false;
  return sameBrackets(single.brackets, SINGLE_2025) && sameBrackets(married.brackets, MFJ_2025);
}

function withWorkbookTables(settings: Settings): Settings {
  if (isUntouched2025(settings)) {
    return {
      ...defaultSettings(),
      lcdMultiplier: settings.lcdMultiplier,
      charityCapPct: settings.charityCapPct,
      quartersPerYear: settings.quartersPerYear,
    };
  }
  const bracketSets = settings.bracketSets.map((set) => ({
    ...set,
    standardDeduction: Number.isFinite(set.standardDeduction) ? set.standardDeduction : builtinStandard(set.filingStatus),
  }));
  for (const status of ['single', 'mfj', 'mfs', 'hoh'] as const) {
    if (!bracketSets.some((set) => set.year === WORKBOOK_YEAR && set.filingStatus === status)) {
      bracketSets.push(workbookSet(status));
    }
  }
  return { ...settings, bracketSets };
}

export function isSettings(value: unknown): value is Settings {
  if (!value || typeof value !== 'object') return false;
  const settings = value as Settings;
  return (
    isFiniteNumber(settings.year) &&
    isFilingStatus(settings.filingStatus) &&
    isFiniteNumber(settings.lcdMultiplier) &&
    isFiniteNumber(settings.charityCapPct) &&
    isFiniteNumber(settings.quartersPerYear) &&
    isFiniteNumber(settings.defaultStandardDeduction) &&
    Array.isArray(settings.bracketSets) &&
    settings.bracketSets.length > 0 &&
    settings.bracketSets.every(isBracketSet)
  );
}

function isOption(value: unknown): value is OptionInput {
  if (!value || typeof value !== 'object') return false;
  const option = value as OptionInput;
  return (
    typeof option.id === 'string' &&
    typeof option.name === 'string' &&
    isFiniteNumber(option.lcd) &&
    isFiniteNumber(option.gasOil)
  );
}

export function isPlan(value: unknown): value is Plan {
  if (!value || typeof value !== 'object') return false;
  const plan = value as Plan;
  return (
    typeof plan.id === 'string' &&
    typeof plan.clientName === 'string' &&
    typeof plan.date === 'string' &&
    isFiniteNumber(plan.agi) &&
    isFiniteNumber(plan.standardDeduction) &&
    isFiniteNumber(plan.qbi) &&
    typeof plan.updatedAt === 'string' &&
    Array.isArray(plan.options) &&
    plan.options.length <= 3 &&
    plan.options.every(isOption)
  );
}

export function loadSettings(): Settings {
  const parsed = readRaw(SETTINGS_KEY);
  if (!isSettings(parsed)) return defaultSettings();
  const active = parsed.bracketSets.find(
    (set) => set.year === parsed.year && set.filingStatus === parsed.filingStatus,
  );
  if (!active || validateBrackets(active.brackets).length > 0) {
    return defaultSettings();
  }
  const ready = withWorkbookTables(parsed);
  return { ...ready, formulas: normalizeFormulas(ready.formulas) };
}

export function saveSettings(settings: Settings): void {
  writeRaw(SETTINGS_KEY, settings);
}

export function loadPlans(): Plan[] {
  const parsed = readRaw(PLANS_KEY);
  if (!Array.isArray(parsed)) return [];
  return parsed.filter(isPlan);
}

export function savePlans(plans: Plan[]): void {
  writeRaw(PLANS_KEY, plans);
}

export function loadCurrentPlan(): Plan | null {
  const parsed = readRaw(CURRENT_PLAN_KEY);
  return isPlan(parsed) ? parsed : null;
}

export function saveCurrentPlan(plan: Plan): void {
  writeRaw(CURRENT_PLAN_KEY, plan);
}

export function parsePlansImport(value: unknown): Plan[] | null {
  const list = Array.isArray(value)
    ? value
    : value && typeof value === 'object' && Array.isArray((value as { plans?: unknown }).plans)
      ? (value as { plans: unknown[] }).plans
      : null;
  if (!list) return null;
  const plans = list.filter(isPlan);
  if (plans.length === 0 && list.length > 0) return null;
  return plans;
}
