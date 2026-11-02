/**
 * Illinois state income tax.
 *
 * TODO: Out of scope for v1. A future module can compute Illinois tax from
 * taxable income and surface it beside the federal result. Do not call this
 * from calculatePlan until that work is specified — it currently returns 0
 * and is not part of any client-facing total.
 */
export function illinoisStateTax(taxableIncome: number): number {
  if (!Number.isFinite(taxableIncome)) return 0;
  return 0;
}
