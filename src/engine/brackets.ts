import { defaultFormulas, type CalculationFormulas } from './formula.ts';

export type FilingStatus = 'single' | 'mfj' | 'mfs' | 'hoh';

/** Upper edge of the bracket. `null` means no upper limit (the top rate). */
export interface Bracket {
  upTo: number | null;
  /** Decimal rate, for example 0.35 for 35%. */
  rate: number;
}

export interface BracketSet {
  year: number;
  filingStatus: FilingStatus;
  /** Standard deduction stored with this table. The planner fills it when that status is chosen. */
  standardDeduction: number;
  brackets: Bracket[];
}

export interface Settings {
  year: number;
  filingStatus: FilingStatus;
  /** Cash contributed to an LCD is multiplied by this to get the deduction. */
  lcdMultiplier: number;
  /** Charitable deduction cap as a decimal (0.30 = 30% of AGI). */
  charityCapPct: number;
  quartersPerYear: number;
  defaultStandardDeduction: number;
  bracketSets: BracketSet[];
  /** Expressions edited on the Workflow page. Results follow these. */
  formulas: CalculationFormulas;
}

export const BRACKET_DISCLAIMER = 'Verify against IRS before use';

/** Single filer, tax year 2025. Limits are the top of each bracket. */
export const SINGLE_2025: readonly Bracket[] = [
  { upTo: 11_925, rate: 0.1 },
  { upTo: 48_475, rate: 0.12 },
  { upTo: 103_350, rate: 0.22 },
  { upTo: 197_300, rate: 0.24 },
  { upTo: 250_525, rate: 0.32 },
  { upTo: 626_350, rate: 0.35 },
  { upTo: null, rate: 0.37 },
];

/**
 * Heads of household, tax year 2026. Tops of each bracket.
 * Source: IRS Rev. Proc. 2025-32, Table 2, section 1(j)(2)(B).
 */
export const HOH_2026: readonly Bracket[] = [
  { upTo: 17_700, rate: 0.1 },
  { upTo: 67_450, rate: 0.12 },
  { upTo: 105_700, rate: 0.22 },
  { upTo: 201_750, rate: 0.24 },
  { upTo: 256_200, rate: 0.32 },
  { upTo: 640_600, rate: 0.35 },
  { upTo: null, rate: 0.37 },
];

/** Married filing jointly, tax year 2025. */
export const MFJ_2025: readonly Bracket[] = [
  { upTo: 23_850, rate: 0.1 },
  { upTo: 96_950, rate: 0.12 },
  { upTo: 206_700, rate: 0.22 },
  { upTo: 394_600, rate: 0.24 },
  { upTo: 501_050, rate: 0.32 },
  { upTo: 751_600, rate: 0.35 },
  { upTo: null, rate: 0.37 },
];

/**
 * 2026 ordinary brackets. Tops of each bracket.
 * Source: IRS Rev. Proc. 2025-32, as used in the planning workbook.
 */
export const SINGLE_2026: readonly Bracket[] = [
  { upTo: 12_400, rate: 0.1 },
  { upTo: 50_400, rate: 0.12 },
  { upTo: 105_700, rate: 0.22 },
  { upTo: 201_775, rate: 0.24 },
  { upTo: 256_225, rate: 0.32 },
  { upTo: 640_600, rate: 0.35 },
  { upTo: null, rate: 0.37 },
];

export const MFJ_2026: readonly Bracket[] = [
  { upTo: 24_800, rate: 0.1 },
  { upTo: 100_800, rate: 0.12 },
  { upTo: 211_400, rate: 0.22 },
  { upTo: 403_550, rate: 0.24 },
  { upTo: 512_450, rate: 0.32 },
  { upTo: 768_700, rate: 0.35 },
  { upTo: null, rate: 0.37 },
];

/** Married filing separately. Same columns as Single until the 37% bracket. */
export const MFS_2026: readonly Bracket[] = [
  { upTo: 12_400, rate: 0.1 },
  { upTo: 50_400, rate: 0.12 },
  { upTo: 105_700, rate: 0.22 },
  { upTo: 201_775, rate: 0.24 },
  { upTo: 256_225, rate: 0.32 },
  { upTo: 384_350, rate: 0.35 },
  { upTo: null, rate: 0.37 },
];

export const WORKBOOK_YEAR = 2026;

const WORKBOOK_BRACKETS: Record<FilingStatus, readonly Bracket[]> = {
  single: SINGLE_2026,
  mfj: MFJ_2026,
  mfs: MFS_2026,
  hoh: HOH_2026,
};

const WORKBOOK_STANDARD: Record<FilingStatus, number> = {
  single: 16_100,
  mfj: 32_200,
  mfs: 16_100,
  hoh: 24_150,
};

export function cloneBrackets(brackets: readonly Bracket[]): Bracket[] {
  return brackets.map((bracket) => ({ upTo: bracket.upTo, rate: bracket.rate }));
}

export function workbookSet(filingStatus: FilingStatus, year = WORKBOOK_YEAR): BracketSet {
  return {
    year,
    filingStatus,
    standardDeduction: WORKBOOK_STANDARD[filingStatus],
    brackets: cloneBrackets(WORKBOOK_BRACKETS[filingStatus]),
  };
}

export function defaultBracketSets(): BracketSet[] {
  return (['single', 'mfj', 'mfs', 'hoh'] as const).map((status) => workbookSet(status));
}

export function defaultSettings(): Settings {
  return {
    year: WORKBOOK_YEAR,
    filingStatus: 'single',
    lcdMultiplier: 4,
    charityCapPct: 0.3,
    quartersPerYear: 4,
    defaultStandardDeduction: WORKBOOK_STANDARD.single,
    bracketSets: defaultBracketSets(),
    formulas: defaultFormulas(),
  };
}

export function filingStatusLabel(status: FilingStatus): string {
  if (status === 'mfj') return 'Married filing jointly';
  if (status === 'mfs') return 'Married filing separately';
  if (status === 'hoh') return 'Heads of Households';
  return 'Single';
}

export function findBracketSet(
  settings: Settings,
  year = settings.year,
  filingStatus = settings.filingStatus,
): BracketSet | undefined {
  return settings.bracketSets.find(
    (set) => set.year === year && set.filingStatus === filingStatus,
  );
}

export function validateBrackets(brackets: Bracket[]): string[] {
  const errors: string[] = [];
  let previous = 0;
  let seenOpen = false;

  if (brackets.length === 0) {
    errors.push('Add at least one bracket.');
  }

  for (const bracket of brackets) {
    if (!Number.isFinite(bracket.rate) || bracket.rate < 0 || bracket.rate > 1) {
      errors.push('Rates must be between 0% and 100%.');
    }
    if (bracket.upTo === null) {
      if (seenOpen) errors.push('Only one bracket can be open-ended.');
      seenOpen = true;
      continue;
    }
    if (seenOpen) errors.push('The open-ended bracket must be last.');
    if (!Number.isFinite(bracket.upTo) || bracket.upTo <= previous) {
      errors.push('Bracket limits must ascend.');
    } else {
      previous = bracket.upTo;
    }
  }

  if (brackets.length > 0 && !seenOpen) {
    errors.push('Add a top bracket with no upper limit.');
  }

  return [...new Set(errors)];
}

/** Brackets used for a calculation. Invalid edits fall back to the 2026 workbook table. */
export function activeBrackets(settings: Settings): Bracket[] {
  const set = findBracketSet(settings);
  if (set && validateBrackets(set.brackets).length === 0) {
    return set.brackets;
  }
  return builtinBrackets(settings.filingStatus);
}

export function builtinBrackets(filingStatus: FilingStatus): Bracket[] {
  return cloneBrackets(WORKBOOK_BRACKETS[filingStatus]);
}

export function builtinStandard(filingStatus: FilingStatus): number {
  return WORKBOOK_STANDARD[filingStatus];
}
