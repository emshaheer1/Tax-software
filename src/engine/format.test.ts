import { describe, expect, it } from 'vitest';
import { formatDate, formatMoney, formatPercent, parseMoney } from './format.ts';

describe('formatters', () => {
  it('formats money to the nearest dollar', () => {
    expect(formatMoney(207_510.25)).toBe('$207,510');
    expect(formatMoney(17_013)).toBe('$17,013');
    expect(formatMoney(0)).toBe('$0');
  });

  it('formats negatives with a leading minus and a dollar sign', () => {
    expect(formatMoney(-31_500)).toBe('-$31,500');
    expect(formatMoney(-31_500.5)).toBe('-$31,501');
  });

  it('formats percents to two decimals and null as n/a', () => {
    expect(formatPercent(0.425325)).toBe('42.53%');
    expect(formatPercent(0.428942857)).toBe('42.89%');
    expect(formatPercent(-0.63)).toBe('-63.00%');
    expect(formatPercent(null)).toBe('n/a');
    expect(formatPercent(Number.POSITIVE_INFINITY)).toBe('n/a');
    expect(formatMoney(null)).toBe('n/a');
    expect(formatMoney(Number.NaN)).toBe('n/a');
  });

  it('parses money text and treats an empty field as zero', () => {
    expect(parseMoney('')).toBe(0);
    expect(parseMoney('$40,000')).toBe(40_000);
    expect(parseMoney('40,000.5')).toBe(40_000.5);
    expect(parseMoney('abc')).toBe(0);
  });

  it('formats an ISO date in en-US', () => {
    expect(formatDate('2026-10-08')).toBe('October 8, 2026');
  });
});
