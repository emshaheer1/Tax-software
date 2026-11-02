import { describe, expect, it } from 'vitest';
import { MFJ_2025, SINGLE_2025, cloneBrackets } from './brackets.ts';
import { progressiveTax, taxSlices } from './tax.ts';

describe('progressiveTax', () => {
  it('builds the same tax from the slices the workflow shows', () => {
    const slices = taxSlices(250_525, SINGLE_2025);
    expect(slices.length).toBeGreaterThan(1);
    expect(slices.reduce((sum, slice) => sum + slice.tax, 0)).toBeCloseTo(progressiveTax(250_525, SINGLE_2025), 2);
    expect(taxSlices(0, SINGLE_2025)).toEqual([]);
  });

  it('taxes zero and negative income at zero', () => {
    expect(progressiveTax(0, SINGLE_2025)).toBe(0);
    expect(progressiveTax(-100, SINGLE_2025)).toBe(0);
  });

  it('matches the bracket-edge constants the Excel shortcut used', () => {
    expect(progressiveTax(250_525, SINGLE_2025)).toBeCloseTo(57_231, 2);
    expect(progressiveTax(626_350, SINGLE_2025)).toBeCloseTo(188_769.75, 2);
  });

  it('taxes income inside every Single 2025 bracket and above the top edge', () => {
    const cases: Array<[number, number]> = [
      [10_000, 1_000],
      [11_925, 1_192.5],
      [30_000, 3_361.5],
      [48_475, 5_578.5],
      [80_000, 12_514],
      [103_350, 17_651],
      [150_000, 28_847],
      [197_300, 40_199],
      [220_000, 47_463],
      [250_525, 57_231],
      [400_000, 109_547.25],
      [626_350, 188_769.75],
      [700_000, 216_020.25],
    ];

    for (const [income, tax] of cases) {
      expect(progressiveTax(income, SINGLE_2025)).toBeCloseTo(tax, 2);
    }
  });

  it('does not mutate the bracket table', () => {
    const brackets = cloneBrackets(SINGLE_2025).reverse();
    const snapshot = JSON.stringify(brackets);
    progressiveTax(100_000, brackets);
    expect(JSON.stringify(brackets)).toBe(snapshot);
  });

  it('uses a different table for married filing jointly', () => {
    const income = 677_000;
    expect(progressiveTax(income, MFJ_2025)).toBeCloseTo(176_044.5, 2);
    expect(progressiveTax(income, MFJ_2025)).not.toBeCloseTo(
      progressiveTax(income, SINGLE_2025),
      2,
    );
  });
});
