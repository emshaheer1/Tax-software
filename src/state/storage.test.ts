import { afterEach, describe, expect, it } from 'vitest';
import { defaultSettings, MFJ_2025, SINGLE_2025 } from '../engine/brackets.ts';
import { createEmptyPlan } from '../engine/plan.ts';
import {
  CURRENT_PLAN_KEY,
  PLANS_KEY,
  SETTINGS_KEY,
  loadCurrentPlan,
  loadPlans,
  loadSettings,
  parsePlansImport,
  savePlans,
  saveSettings,
} from './storage.ts';

afterEach(() => {
  localStorage.clear();
});

describe('storage', () => {
  it('falls back to default settings when storage is missing or corrupt', () => {
    expect(loadSettings()).toEqual(defaultSettings());

    localStorage.setItem(SETTINGS_KEY, '{not json');
    expect(loadSettings()).toEqual(defaultSettings());

    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ year: 'nope' }));
    expect(loadSettings()).toEqual(defaultSettings());

    localStorage.setItem(SETTINGS_KEY, 'null');
    expect(loadSettings()).toEqual(defaultSettings());
  });

  it('upgrades an untouched 2025 seed to the 2026 workbook and keeps a custom multiplier', () => {
    localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({
        year: 2025,
        filingStatus: 'single',
        lcdMultiplier: 5,
        charityCapPct: 0.3,
        quartersPerYear: 4,
        defaultStandardDeduction: 18_000,
        bracketSets: [
          { year: 2025, filingStatus: 'single', brackets: SINGLE_2025 },
          { year: 2025, filingStatus: 'mfj', brackets: MFJ_2025 },
        ],
      }),
    );
    const loaded = loadSettings();
    expect(loaded.year).toBe(2026);
    expect(loaded.lcdMultiplier).toBe(5);
    expect(loaded.bracketSets.some((set) => set.filingStatus === 'hoh' && set.standardDeduction === 24_150)).toBe(true);
  });

  it('keeps an edited 2025 table and adds the missing 2026 tables', () => {
    const single = SINGLE_2025.map((bracket) => ({ ...bracket }));
    single[0] = { upTo: single[0]!.upTo, rate: 0.11 };
    localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({
        year: 2025,
        filingStatus: 'single',
        lcdMultiplier: 4,
        charityCapPct: 0.3,
        quartersPerYear: 4,
        defaultStandardDeduction: 18_000,
        bracketSets: [
          { year: 2025, filingStatus: 'single', brackets: single },
          { year: 2025, filingStatus: 'mfj', brackets: MFJ_2025 },
        ],
      }),
    );
    const loaded = loadSettings();
    expect(loaded.year).toBe(2025);
    expect(loaded.bracketSets.find((set) => set.year === 2025 && set.filingStatus === 'single')?.brackets[0]?.rate).toBe(0.11);
    expect(loaded.bracketSets.filter((set) => set.year === 2026)).toHaveLength(4);
  });

  it('round-trips valid settings', () => {
    const settings = defaultSettings();
    settings.lcdMultiplier = 5;
    saveSettings(settings);
    expect(loadSettings().lcdMultiplier).toBe(5);
  });

  it('drops corrupt plans and keeps valid ones', () => {
    expect(loadPlans()).toEqual([]);
    localStorage.setItem(PLANS_KEY, 'not-json');
    expect(loadPlans()).toEqual([]);

    const plan = createEmptyPlan(defaultSettings(), '2026-10-08');
    localStorage.setItem(PLANS_KEY, JSON.stringify([plan, { id: 1 }, null]));
    expect(loadPlans()).toEqual([plan]);
  });

  it('saves the plan list and ignores a corrupt current draft', () => {
    const plan = createEmptyPlan(defaultSettings(), '2026-10-08');
    savePlans([plan]);
    expect(loadPlans()).toEqual([plan]);

    localStorage.setItem(CURRENT_PLAN_KEY, '{"agi":"big"}');
    expect(loadCurrentPlan()).toBeNull();
  });

  it('parses an exported file and rejects a file with no valid plans', () => {
    const plan = createEmptyPlan(defaultSettings(), '2026-10-08');
    expect(parsePlansImport({ version: 1, plans: [plan] })).toEqual([plan]);
    expect(parsePlansImport([plan])).toEqual([plan]);
    expect(parsePlansImport({ plans: [{ nope: true }] })).toBeNull();
    expect(parsePlansImport('nope')).toBeNull();
  });
});
