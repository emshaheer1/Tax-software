import { describe, expect, it } from 'vitest';
import { defaultSettings, type Settings } from './brackets.ts';
import { formatPercent } from './format.ts';
import {
  applySampleData,
  calculatePlan,
  createEmptyPlan,
  suggestedQuarterlyContribution,
  type Plan,
} from './plan.ts';

function goldenPlan(overrides: Partial<Plan> = {}): Plan {
  const plan = createEmptyPlan(defaultSettings(), '2026-10-08', new Date('2026-10-08T12:00:00'));
  return {
    ...plan,
    clientStatus: undefined,
    agi: 695_000,
    standardDeduction: 18_000,
    qbi: 0,
    options: [
      { id: 'lcd-40', name: 'LCD 40,000', lcd: 40_000, gasOil: 0 },
      { id: 'lcd-35', name: 'LCD 35,000', lcd: 35_000, gasOil: 0 },
      { id: 'oil', name: 'Oil & gas 50,000', lcd: 0, gasOil: 50_000 },
    ],
    ...overrides,
  };
}

describe('calculatePlan golden cases', () => {
  const settings = defaultSettings();
  const result = calculatePlan(goldenPlan(), settings);

  it('returns the Now column', () => {
    expect(result).not.toBeNull();
    const now = result!.now;
    expect(now.maxDeduction).toBe(0);
    expect(now.newAGI).toBe(695_000);
    expect(now.taxableIncome).toBe(677_000);
    expect(now.federalTax).toBeCloseTo(206_447.25, 2);
    expect(now.taxSavings).toBeUndefined();
    expect(now.cashOut).toBeUndefined();
    expect(now.net).toBeUndefined();
    expect(now.roi).toBeUndefined();
    expect(now.rateOnAGI).toBeCloseTo(206_447.25 / 695_000, 6);
    expect(formatPercent(now.rateOnAGI)).toBe('29.70%');
  });

  it('prices an LCD contribution of 40,000', () => {
    const option = result!.options[0]!;
    expect(option.maxDeduction).toBe(160_000);
    expect(option.newAGI).toBe(535_000);
    expect(option.taxableIncome).toBe(535_000);
    expect(option.federalTax).toBeCloseTo(156_019.25, 2);
    expect(option.taxSavings).toBeCloseTo(50_428, 2);
    expect(option.cashOut).toBe(40_000);
    expect(option.net).toBeCloseTo(10_428, 2);
    expect(option.roi).toBeCloseTo(10_428 / 40_000, 6);
    expect(formatPercent(option.roi)).toBe('26.07%');
    expect(option.rateOnTaxable).toBeCloseTo(156_019.25 / 535_000, 6);
    expect(formatPercent(option.rateOnTaxable)).toBe('29.16%');
  });

  it('prices an LCD contribution of 35,000', () => {
    const option = result!.options[1]!;
    expect(option.maxDeduction).toBe(140_000);
    expect(option.newAGI).toBe(555_000);
    expect(option.taxableIncome).toBe(555_000);
    expect(option.federalTax).toBeCloseTo(163_019.25, 2);
    expect(option.taxSavings).toBeCloseTo(43_428, 2);
    expect(option.cashOut).toBe(35_000);
    expect(option.net).toBeCloseTo(8_428, 2);
    expect(option.roi).toBeCloseTo(8_428 / 35_000, 6);
    expect(formatPercent(option.roi)).toBe('24.08%');
  });

  it('prices a dollar-for-dollar oil and gas deduction and counts it as cash out', () => {
    const option = result!.options[2]!;
    expect(option.maxDeduction).toBe(0);
    expect(option.newAGI).toBe(695_000);
    expect(option.taxableIncome).toBe(627_000);
    expect(option.federalTax).toBeCloseTo(188_219.25, 2);
    expect(option.taxSavings).toBeCloseTo(18_228, 2);
    expect(option.cashOut).toBe(50_000);
    expect(option.net).toBeCloseTo(-31_772, 2);
    expect(option.roi).toBeCloseTo(-31_772 / 50_000, 6);
    expect(formatPercent(option.roi)).toBe('-63.54%');
  });

  it('marks the highest positive net when more than one option is ahead', () => {
    expect(result!.bestOptionId).toBe('lcd-40');
  });
});

describe('calculatePlan edge cases', () => {
  const settings = defaultSettings();

  it('returns no result for a missing or zero AGI', () => {
    expect(calculatePlan(goldenPlan({ agi: 0 }), settings)).toBeNull();
    expect(calculatePlan(goldenPlan({ agi: Number.NaN }), settings)).toBeNull();
  });

  it('returns a null ROI when cash out is zero', () => {
    const result = calculatePlan(
      goldenPlan({
        options: [{ id: 'zero', name: 'No cash', lcd: 0, gasOil: 0 }],
      }),
      settings,
    );
    expect(result!.options[0]!.roi).toBeNull();
    expect(result!.options[0]!.cashOut).toBe(0);
    expect(result!.bestOptionId).toBeUndefined();
  });

  it('warns when the deduction is above 30% of AGI and still calculates', () => {
    const result = calculatePlan(
      goldenPlan({
        options: [{ id: 'big', name: 'Large LCD', lcd: 60_000, gasOil: 0 }],
      }),
      settings,
    );
    expect(result!.options[0]!.maxDeduction).toBe(240_000);
    expect(result!.warnings.some((warning) => warning.includes('30% of AGI limit'))).toBe(true);
    expect(result!.options[0]!.messages[0]).toBe(
      'Deduction is above the 30% of AGI limit ($208,500). Review before presenting.',
    );
  });

  it('clamps a negative taxable income to zero and warns', () => {
    const result = calculatePlan(
      goldenPlan({
        agi: 10_000,
        options: [{ id: 'only', name: 'Only', lcd: 0, gasOil: 0 }],
      }),
      settings,
    );
    expect(result!.now.taxableIncome).toBe(0);
    expect(result!.now.federalTax).toBe(0);
    expect(result!.nowMessages).toContain('Deductions exceed income; taxable income set to $0.');
  });

  it('gives married filing jointly a different federal tax', () => {
    const plan = goldenPlan();
    const single = calculatePlan(plan, settings)!;
    const mfj = calculatePlan(plan, { ...settings, filingStatus: 'mfj' })!;
    expect(mfj.now.federalTax).toBeCloseTo(174_488.5, 2);
    expect(mfj.now.federalTax).not.toBeCloseTo(single.now.federalTax, 2);
  });

  it('changes the tax when a bracket rate changes', () => {
    const plan = goldenPlan();
    const before = calculatePlan(plan, settings)!;
    const edited: Settings = structuredClone(settings);
    const set = edited.bracketSets.find((item) => item.filingStatus === 'single' && item.year === 2026)!;
    const top = set.brackets.find((bracket) => bracket.upTo === null)!;
    top.rate = 0.4;
    const after = calculatePlan(plan, edited)!;
    expect(after.now.federalTax).not.toBeCloseTo(before.now.federalTax, 2);
    expect(after.now.federalTax).toBeGreaterThan(before.now.federalTax);
  });

  it('suggests a quarterly LCD of AGI times the cap divided by four', () => {
    expect(suggestedQuarterlyContribution(695_000, settings)).toBe(52_125);
    expect(suggestedQuarterlyContribution(0, settings)).toBeNull();
  });

  it('uses the typed donation, and the write-off is five times that donation', () => {
    const plan = createEmptyPlan(settings, '2026-10-08');
    plan.agi = 1_000_000;
    plan.options[0]!.lcd = 60_000;
    plan.options[0]!.writeOff = 300_000;
    plan.options[1]!.lcd = 100_000;
    plan.options[1]!.writeOff = 500_000;
    const blank = createEmptyPlan(settings, '2026-10-08');
    blank.agi = 1_000_000;
    const untouched = calculatePlan(blank, settings)!;
    expect(untouched.options[0]!.maxDeduction).toBe(0);
    expect(untouched.options[0]!.cashOut).toBe(0);
    const result = calculatePlan(plan, settings)!;
    expect(plan.clientStatus).toBe('single');
    expect(plan.standardDeduction).toBe(16_100);
    expect(result.now.taxableIncome).toBe(983_900);
    expect(result.now.federalTax).toBeCloseTo(320_000.25, 2);
    expect(result.options[0]!.name).toBe('LCD (30)%');
    expect(result.options[0]!.maxDeduction).toBe(300_000);
    expect(result.options[0]!.taxableIncome).toBe(700_000);
    expect(result.options[0]!.federalTax).toBeCloseTo(214_957.25, 2);
    expect(result.options[0]!.cashOut).toBe(60_000);
    expect(result.options[0]!.taxSavings).toBeCloseTo(105_043, 2);
    expect(result.options[0]!.net).toBeCloseTo(45_043, 2);
    expect(result.options[1]!.name).toBe('LCD (50)%');
    expect(result.options[1]!.maxDeduction).toBe(500_000);
    expect(result.options[1]!.taxableIncome).toBe(500_000);
    expect(result.options[1]!.federalTax).toBeCloseTo(143_769.25, 2);
    expect(result.options[1]!.cashOut).toBe(100_000);
    expect(result.options[1]!.taxSavings).toBeCloseTo(176_231, 2);
  });

  it('subtracts planning fees from every option net', () => {
    const plan = goldenPlan();
    plan.planningFees = 1_000;
    const result = calculatePlan(plan, settings)!;
    expect(result.options[0]!.net).toBeCloseTo(10_428 - 1_000, 2);
    expect(result.options[1]!.net).toBeCloseTo(8_428 - 1_000, 2);
    expect(result.options[2]!.net).toBeCloseTo(-31_772 - 1_000, 2);
  });

  it('loads the sample numbers used on the first screen', () => {
    const plan = applySampleData(createEmptyPlan(settings, '2026-10-08'));
    const result = calculatePlan(plan, settings)!;
    expect(plan.agi).toBe(695_000);
    expect(plan.options).toHaveLength(2);
    expect(plan.options[1]!.name).toBe('Option 2 (LCD 35k)');
    expect(result.options[0]!.net).toBeCloseTo(10_428, 2);
    expect(result.bestOptionId).toBe(plan.options[0]!.id);
  });
});
