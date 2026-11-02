import type { Bracket } from './brackets.ts';

export interface TaxSlice {
  from: number;
  to: number;
  rate: number;
  /** Income sitting inside this bracket. */
  taxed: number;
  tax: number;
}

function orderedBrackets(brackets: readonly Bracket[]): Bracket[] {
  return [...brackets].sort((a, b) => {
    if (a.upTo === null) return 1;
    if (b.upTo === null) return -1;
    return a.upTo - b.upTo;
  });
}

/** Each bracket slice that actually receives income. Empty when income is not positive. */
export function taxSlices(income: number, brackets: readonly Bracket[]): TaxSlice[] {
  if (!Number.isFinite(income) || income <= 0) return [];

  const slices: TaxSlice[] = [];
  let lower = 0;

  for (const bracket of orderedBrackets(brackets)) {
    const upper = bracket.upTo ?? Number.POSITIVE_INFINITY;
    const taxed = Math.min(income, upper) - lower;
    if (taxed > 0) {
      slices.push({
        from: lower,
        to: Math.min(income, upper),
        rate: bracket.rate,
        taxed,
        tax: taxed * bracket.rate,
      });
    }
    lower = upper;
    if (income <= upper) break;
  }

  return slices;
}

/**
 * Progressive tax across a sorted bracket table.
 * `upTo` is the top of the bracket; the last bracket uses `null` for no ceiling.
 * Income at or below zero is taxed at 0. The bracket array is not mutated.
 */
export function progressiveTax(income: number, brackets: readonly Bracket[]): number {
  return taxSlices(income, brackets).reduce((sum, slice) => sum + slice.tax, 0);
}
