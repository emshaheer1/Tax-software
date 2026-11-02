import { describe, expect, it } from 'vitest';
import { applyInputFormulas, defaultFormulas, explainFormula, formulaProblem } from './formula.ts';

describe('workflow formulas', () => {
  it('rejects names that are not part of the plan', () => {
    expect(formulaProblem('alert(1)')).toMatch(/Only max and min/);
    expect(formulaProblem('')).toMatch(/Enter a formula/);
  });

  it('keeps the percent write-off and the divide-by-5 donation', () => {
    const applied = applyInputFormulas(
      {
        agi: 1_000_000,
        standard: 16_100,
        qbi: 0,
        gasOil: 0,
        writeOffRate: 0.5,
        multiplier: 4,
        contribution: 0,
      },
      defaultFormulas(),
    );
    expect(applied.writeOff).toBe(500_000);
    expect(applied.donation).toBe(100_000);
    expect(applied.deductionUsed).toBe(500_000);
    expect(applied.optionTaxable).toBe(500_000);
  });

  it('evaluates a changed donation formula', () => {
    const formulas = { ...defaultFormulas(), donation: 'writeOffRate > 0 ? writeOff / 4 : contribution' };
    const base = {
      agi: 1_000_000,
      standard: 16_100,
      qbi: 0,
      gasOil: 0,
      multiplier: 4,
      contribution: 0,
    };
    expect(applyInputFormulas({ ...base, writeOffRate: 0.3 }, formulas).donation).toBe(75_000);
    expect(applyInputFormulas({ ...base, writeOffRate: 0.5 }, formulas).donation).toBe(125_000);
    expect(explainFormula('writeOff / 4', { writeOff: 500_000 }).ok).toBe(true);
  });
});
