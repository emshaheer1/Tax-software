import {
  activeBrackets,
  builtinStandard,
  findBracketSet,
  type Bracket,
  type FilingStatus,
  type Settings,
} from './brackets.ts';
import { applyInputFormulas, applyResultFormulas, defaultFormulas, type CalculationFormulas } from './formula.ts';
import { formatMoney, formatPlainPercent } from './format.ts';
import { progressiveTax } from './tax.ts';

export type ClientStatus = 'single' | 'mfj' | 'hoh';
export type WriteOffRate = 0.3 | 0.5;

export function clientStatusLabel(status: ClientStatus): string {
  if (status === 'mfj') return 'Married Filing Jointly';
  if (status === 'hoh') return 'Heads of Households';
  return 'Single';
}

export function isClientStatus(value: unknown): value is ClientStatus {
  return value === 'single' || value === 'mfj' || value === 'hoh';
}

export interface OptionInput {
  id: string;
  name: string;
  /** Max donation typed on the option. This is the amount used in the preview. */
  lcd: number;
  gasOil: number;
  /** Write-off typed on the option. A percent option fills this as the donation times 5. */
  writeOff?: number;
  /** When set, the option shows an AGI guide. That guide is not used in the preview. */
  writeOffRate?: WriteOffRate;
}

export interface Plan {
  id: string;
  clientName: string;
  /** ISO date, yyyy-mm-dd. */
  date: string;
  agi: number;
  standardDeduction: number;
  qbi: number;
  options: OptionInput[];
  /** Filing status chosen on the plan. Drives the starting standard deduction and the brackets. */
  clientStatus?: ClientStatus;
  /** Subtracted from the net of every option. */
  planningFees: number;
  updatedAt: string;
}

export interface ColumnResult {
  maxDeduction: number;
  newAGI: number;
  taxableIncome: number;
  federalTax: number;
  rateOnAGI: number | null;
  rateOnTaxable: number | null;
  taxSavings?: number;
  cashOut?: number;
  net?: number;
  roi?: number | null;
}

export interface ResolvedOption extends ColumnResult {
  id: string;
  name: string;
  /** Messages for this option's inputs. The banner list is `PlanResult.warnings`. */
  messages: string[];
}

export interface PlanResult {
  now: ColumnResult;
  nowMessages: string[];
  options: ResolvedOption[];
  /** Set only when more than one option has a net above zero. Ties keep the first. */
  bestOptionId?: string;
  warnings: string[];
}

const CHARITY_WARNING = (capRatio: number, limit: number) =>
  `Deduction is above the ${formatPlainPercent(capRatio)}% of AGI limit (${formatMoney(limit)}). Review before presenting.`;

const TAXABLE_WARNING = 'Deductions exceed income; taxable income set to $0.';

export const DISCLAIMER =
  'This material has been prepared for informational purposes only, and is not intended to provide, and should not be relied on for, tax, legal or financial advice.';

export const MAX_OPTIONS = 3;

function newId(): string {
  return crypto.randomUUID();
}

export function defaultLcdOptions(): OptionInput[] {
  return [
    { id: newId(), name: 'LCD (30)%', lcd: 0, gasOil: 0, writeOffRate: 0.3 },
    { id: newId(), name: 'LCD (50)%', lcd: 0, gasOil: 0, writeOffRate: 0.5 },
  ];
}

/** AGI percent and that amount divided by 5. Shown as a guide only. */
export function suggestedLcdFigures(
  option: OptionInput,
  agi: number,
): { writeOff: number; donation: number } | null {
  if (option.writeOffRate !== 0.3 && option.writeOffRate !== 0.5) return null;
  const income = Number.isFinite(agi) && agi > 0 ? agi : 0;
  const writeOff = income * option.writeOffRate;
  return { writeOff, donation: writeOff / 5 };
}

/** Write-off that follows a typed max donation. Percent options use × 5. Others use the settings multiplier. */
export function writeOffFromDonation(option: OptionInput, donation: number, multiplier: number): number {
  const cash = Number.isFinite(donation) && donation > 0 ? donation : 0;
  if (option.writeOffRate === 0.3 || option.writeOffRate === 0.5) return cash * 5;
  const factor = Number.isFinite(multiplier) && multiplier > 0 ? multiplier : 0;
  return cash * factor;
}

function previewInputs(
  option: OptionInput,
  agi: number,
  multiplier: number,
  base: { standard?: number; qbi?: number } = {},
): {
  agi: number;
  standard: number;
  qbi: number;
  gasOil: number;
  writeOffRate: number;
  multiplier: number;
  contribution: number;
} {
  const income = Number.isFinite(agi) && agi > 0 ? agi : 0;
  const contribution = Number.isFinite(option.lcd) && option.lcd > 0 ? option.lcd : 0;
  const typed =
    option.writeOff != null && Number.isFinite(option.writeOff) && option.writeOff > 0
      ? option.writeOff
      : writeOffFromDonation(option, contribution, multiplier);
  const factor = contribution > 0 && typed > 0 ? typed / contribution : multiplier;
  return {
    agi: income,
    standard: base.standard ?? 0,
    qbi: base.qbi ?? 0,
    gasOil: Number.isFinite(option.gasOil) && option.gasOil > 0 ? option.gasOil : 0,
    writeOffRate: 0,
    multiplier: Number.isFinite(factor) && factor > 0 ? factor : 0,
    contribution,
  };
}

export function optionFigures(
  option: OptionInput,
  agi: number,
  multiplier: number,
  formulas: CalculationFormulas = defaultFormulas(),
  base: { standard?: number; qbi?: number } = {},
): { writeOff: number; donation: number } {
  const applied = applyInputFormulas(previewInputs(option, agi, multiplier, base), formulas);
  return { writeOff: applied.writeOff, donation: applied.donation };
}

export function standardDeductionFor(settings: Settings, status: ClientStatus): number {
  const set = findBracketSet(settings, settings.year, status);
  if (set && Number.isFinite(set.standardDeduction)) return set.standardDeduction;
  return builtinStandard(status);
}

export function createEmptyPlan(settings: Settings, date: string, now = new Date()): Plan {
  return {
    id: newId(),
    clientName: '',
    date,
    clientStatus: 'single',
    agi: 0,
    standardDeduction: standardDeductionFor(settings, 'single'),
    qbi: 0,
    planningFees: 0,
    options: defaultLcdOptions(),
    updatedAt: now.toISOString(),
  };
}

/** Hand-entered LCD sample. Tax follows the active bracket table and the larger-of deduction rule. */
export function applySampleData(plan: Plan, now = new Date()): Plan {
  const firstId = plan.options[0]?.id ?? newId();
  return {
    ...plan,
    agi: 695_000,
    standardDeduction: 18_000,
    qbi: 0,
    options: [
      { id: firstId, name: 'Option 1 (Only LCD)', lcd: 40_000, gasOil: 0 },
      { id: newId(), name: 'Option 2 (LCD 35k)', lcd: 35_000, gasOil: 0 },
    ],
    updatedAt: now.toISOString(),
  };
}

export function suggestedQuarterlyContribution(agi: number, settings: Settings): number | null {
  if (!(agi > 0) || !(settings.quartersPerYear > 0)) return null;
  return (agi * settings.charityCapPct) / settings.quartersPerYear;
}

interface ColumnDraft {
  result: ColumnResult;
  messages: string[];
}

function bracketsFor(plan: Plan, settings: Settings): Bracket[] {
  const status: FilingStatus =
    plan.clientStatus === 'single' || plan.clientStatus === 'mfj' || plan.clientStatus === 'hoh'
      ? plan.clientStatus
      : settings.filingStatus;
  return activeBrackets({ ...settings, filingStatus: status });
}

function buildColumn(
  agi: number,
  standardDeduction: number,
  qbi: number,
  deduction: number,
  gasOil: number,
  settings: Settings,
  brackets: readonly Bracket[],
  checkCap: boolean,
  taxableFromFormula: number,
): ColumnDraft {
  const maxDeduction = deduction;
  const newAGI = agi - maxDeduction;
  const classicTaxable = agi - Math.max(standardDeduction, maxDeduction) - qbi - gasOil;
  const taxableIncome = Math.max(0, taxableFromFormula);
  const federalTax = progressiveTax(taxableIncome, brackets);
  const messages: string[] = [];
  const limit = settings.charityCapPct * agi;

  if (checkCap && maxDeduction > limit) {
    messages.push(CHARITY_WARNING(settings.charityCapPct, limit));
  }
  if (classicTaxable < 0 || taxableFromFormula < 0) {
    messages.push(TAXABLE_WARNING);
  }

  return {
    result: {
      maxDeduction,
      newAGI,
      taxableIncome,
      federalTax,
      rateOnAGI: agi > 0 ? federalTax / agi : null,
      rateOnTaxable: taxableIncome > 0 ? federalTax / taxableIncome : null,
    },
    messages,
  };
}

/** Pure plan calculation. Returns null when AGI is missing or not positive. */
export function calculatePlan(plan: Plan, settings: Settings): PlanResult | null {
  if (!Number.isFinite(plan.agi) || plan.agi <= 0) return null;

  const brackets = bracketsFor(plan, settings);
  const standard = finiteOrZero(plan.standardDeduction);
  const qbi = finiteOrZero(plan.qbi);
  const formulas = settings.formulas ?? defaultFormulas();
  const nowMath = applyInputFormulas(
    {
      agi: plan.agi,
      standard,
      qbi,
      gasOil: 0,
      writeOffRate: 0,
      multiplier: settings.lcdMultiplier,
      contribution: 0,
    },
    formulas,
  );
  const now = buildColumn(plan.agi, standard, qbi, 0, 0, settings, brackets, false, nowMath.nowTaxable);

  const options: ResolvedOption[] = plan.options.slice(0, MAX_OPTIONS).map((option) => {
    const gasOil = finiteOrZero(option.gasOil);
    const rated = option.writeOffRate === 0.3 || option.writeOffRate === 0.5;
    const inputs = previewInputs(option, plan.agi, settings.lcdMultiplier, { standard, qbi });
    const contribution = inputs.contribution;
    const figures = applyInputFormulas({ ...inputs, gasOil, standard, qbi }, formulas);
    const column = buildColumn(
      plan.agi,
      standard,
      qbi,
      figures.writeOff,
      gasOil,
      settings,
      brackets,
      !rated,
      figures.optionTaxable,
    );
    const outcome = applyResultFormulas(
      {
        agi: plan.agi,
        standard,
        qbi,
        gasOil,
        writeOffRate: 0,
        multiplier: inputs.multiplier,
        contribution,
        writeOff: figures.writeOff,
        donation: figures.donation,
        deductionUsed: figures.deductionUsed,
        nowTaxable: nowMath.nowTaxable,
        optionTaxable: figures.optionTaxable,
        nowTax: now.result.federalTax,
        optionTax: column.result.federalTax,
        taxSaved: 0,
        cashOut: 0,
        net: 0,
      },
      formulas,
    );
    const taxSavings = outcome.taxSaved;
    const cashOut = outcome.cashOut;
    const net = outcome.net - finiteOrZero(plan.planningFees);
    return {
      ...column.result,
      id: option.id,
      name: option.name.trim() || 'Option',
      messages: column.messages,
      taxSavings,
      cashOut,
      net,
      roi: cashOut > 0 ? net / cashOut : null,
    };
  });

  const positive = options.filter((option) => (option.net ?? 0) > 0);
  let bestOptionId: string | undefined;
  if (positive.length > 1) {
    bestOptionId = positive.reduce((best, option) =>
      (option.net ?? 0) > (best.net ?? 0) ? option : best,
    ).id;
  }

  const warnings = [
    ...now.messages,
    ...options.flatMap((option) => option.messages.map((message) => `${option.name}: ${message}`)),
  ];

  return {
    now: now.result,
    nowMessages: now.messages,
    options,
    bestOptionId,
    warnings,
  };
}

function finiteOrZero(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

export function displayName(plan: Plan): string {
  const name = plan.clientName.trim();
  return name || 'Untitled client';
}

function nonNegative(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  return value;
}

/** Money fields are never negative. Used when a draft is loaded or edited. */
export function sanitizePlan(plan: Plan): Plan {
  return {
    ...plan,
    clientName: plan.clientName.slice(0, 120),
    agi: nonNegative(plan.agi),
    standardDeduction: nonNegative(plan.standardDeduction),
    qbi: nonNegative(plan.qbi),
    planningFees: nonNegative(plan.planningFees ?? 0),
    clientStatus: isClientStatus(plan.clientStatus) ? plan.clientStatus : undefined,
    options: plan.options.slice(0, MAX_OPTIONS).map((option) => ({
      ...option,
      name: option.name.slice(0, 80),
      lcd: nonNegative(option.lcd),
      gasOil: nonNegative(option.gasOil),
      writeOff:
        option.writeOff == null || !Number.isFinite(option.writeOff) ? undefined : nonNegative(option.writeOff),
      writeOffRate: option.writeOffRate === 0.3 || option.writeOffRate === 0.5 ? option.writeOffRate : undefined,
    })),
  };
}
