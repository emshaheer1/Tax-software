import { AlertTriangle } from 'lucide-react';
import type { Settings } from '../engine/brackets.ts';
import { formatMoney, formatPercent } from '../engine/format.ts';
import { optionFigures, type Plan, type PlanResult } from '../engine/plan.ts';
import { cn } from './cn.ts';
import { InfoTip } from './InfoTip.tsx';

type Kind = 'money' | 'percent';

interface Row {
  key: string;
  label: string;
  kind: Kind | 'section';
  emphasis?: boolean;
  tip?: string;
  now: number | null;
  values: Array<number | null>;
  nowWarning?: string;
  warnings?: Array<string | undefined>;
}

function Cell({
  value,
  kind,
  muted,
  emphasis,
  warning,
  compact,
}: {
  value: number | null;
  kind: Kind;
  muted?: boolean;
  emphasis?: boolean;
  warning?: string;
  compact?: boolean;
}) {
  const missing = value == null || !Number.isFinite(value);
  const negative = !missing && value < 0;
  const text = kind === 'money' ? formatMoney(value) : formatPercent(value);
  return (
    <td
      className={cn(
        'text-right align-middle whitespace-nowrap tabular-nums',
        compact ? 'px-2 py-1' : 'px-2.5 py-1.5',
        emphasis && 'font-semibold',
        negative ? 'text-negative' : muted ? 'text-ink-muted' : 'text-ink',
      )}
    >
      <span className="inline-flex items-center justify-end gap-1">
        {warning ? <AlertTriangle size={13} className="text-warning" aria-label={warning} /> : null}
        {text}
      </span>
    </td>
  );
}

export function ComparisonTable({
  plan,
  result,
  settings,
  scroll = true,
  compact = false,
}: {
  plan: Plan;
  result: PlanResult;
  settings: Settings;
  scroll?: boolean;
  compact?: boolean;
}) {
  const deductionTip = `These rows use the donation and write-off typed on the option. On an LCD percent option, typing the donation sets the write-off to that donation times 5. A contribution with no percent is multiplied by ${settings.lcdMultiplier}. Tax uses the larger of the standard deduction or that write-off. The AGI guide on the option is not included here.`;
  const charity = (messages: string[]) => messages.find((message) => message.includes('AGI limit'));
  const floor = (messages: string[]) => messages.find((message) => message.includes('taxable income'));

  const rows: Row[] = [
    {
      key: 'agi',
      label: 'AGI Number',
      kind: 'money',
      now: plan.agi,
      values: result.options.map(() => plan.agi),
    },
    {
      key: 'lcd',
      label: 'Max Donation to LCD',
      kind: 'money',
      now: 0,
      values: result.options.map((option) => {
        const input = plan.options.find((item) => item.id === option.id);
        return input
          ? optionFigures(input, plan.agi, settings.lcdMultiplier, settings.formulas, {
              standard: plan.standardDeduction,
              qbi: plan.qbi,
            }).donation
          : 0;
      }),
    },
    {
      key: 'deduction',
      label: 'Maximum Write off',
      kind: 'money',
      tip: deductionTip,
      now: result.now.maxDeduction,
      values: result.options.map((option) => option.maxDeduction),
      warnings: result.options.map((option) => charity(option.messages)),
    },
    {
      key: 'new-agi',
      label: 'New AGI',
      kind: 'money',
      now: result.now.newAGI,
      values: result.options.map((option) => option.newAGI),
    },
    {
      key: 'standard',
      label: 'Standard / Other Deductions',
      kind: 'money',
      now: plan.standardDeduction,
      values: result.options.map(() => plan.standardDeduction),
    },
    {
      key: 'qbi',
      label: 'QBI Deductions',
      kind: 'money',
      now: plan.qbi,
      values: result.options.map(() => plan.qbi),
    },
    {
      key: 'oil',
      label: 'Gas & Oil Deductions',
      kind: 'money',
      now: 0,
      values: result.options.map((option) => {
        const input = plan.options.find((item) => item.id === option.id);
        return input?.gasOil ?? 0;
      }),
    },
    {
      key: 'taxable',
      label: 'New Taxable Income',
      kind: 'money',
      now: result.now.taxableIncome,
      values: result.options.map((option) => option.taxableIncome),
      nowWarning: floor(result.nowMessages),
      warnings: result.options.map((option) => floor(option.messages)),
    },
    {
      key: 'tax',
      label: 'Federal Tax Owed',
      kind: 'money',
      emphasis: true,
      now: result.now.federalTax,
      values: result.options.map((option) => option.federalTax),
    },
    {
      key: 'approx',
      label: 'Approx Fed Tax Savings',
      kind: 'money',
      now: null,
      values: result.options.map((option) => option.taxSavings ?? null),
    },
    { key: 'results', label: 'Results', kind: 'section', now: null, values: [] },
    {
      key: 'saving',
      label: 'Total Saving',
      kind: 'money',
      now: null,
      values: result.options.map((option) => option.taxSavings ?? null),
    },
    {
      key: 'cash',
      label: 'Cash Out',
      kind: 'money',
      now: null,
      values: result.options.map((option) => option.cashOut ?? null),
    },
    {
      key: 'fees',
      label: 'Planning Fees',
      kind: 'money',
      now: 0,
      values: result.options.map(() => plan.planningFees ?? 0),
    },
    {
      key: 'net',
      label: 'Net Amount',
      kind: 'money',
      emphasis: true,
      now: null,
      values: result.options.map((option) => option.net ?? null),
    },
    {
      key: 'roi',
      label: 'Percentage (ROI)',
      kind: 'percent',
      now: null,
      values: result.options.map((option) => option.roi ?? null),
    },
    { key: 'rates', label: 'Rates', kind: 'section', now: null, values: [] },
    {
      key: 'rate-agi',
      label: 'Effective rate on AGI',
      kind: 'percent',
      tip: 'Federal tax divided by AGI.',
      now: result.now.rateOnAGI,
      values: result.options.map((option) => option.rateOnAGI),
    },
    {
      key: 'rate-taxable',
      label: 'Rate on taxable income',
      kind: 'percent',
      tip: 'Federal tax divided by new taxable income.',
      now: result.now.rateOnTaxable,
      values: result.options.map((option) => option.rateOnTaxable),
    },
  ];

  const columnCount = 2 + result.options.length;

  return (
    <div className={scroll ? 'overflow-x-auto' : undefined}>
      <table className={cn('w-full table-fixed border-collapse', compact ? 'text-[11px]' : 'text-[13px]')}>
        <caption className="sr-only">Comparison of the current tax and each planning option</caption>
        <thead>
          <tr className="border-b border-line text-left">
            <th scope="col" className={cn('sticky left-0 z-10 bg-sticky font-medium text-ink-muted', compact ? 'px-2 py-1.5' : 'px-2.5 py-2')}>
              <span className="sr-only">Line</span>
            </th>
            <th scope="col" className={cn('text-right font-medium text-ink-muted', compact ? 'px-2 py-1.5' : 'px-2.5 py-2')}>
              Now
            </th>
            {result.options.map((option) => (
              <th
                key={option.id}
                scope="col"
                className={cn(
                  'text-right align-bottom font-semibold whitespace-normal text-ink',
                  compact ? 'px-2 py-1.5' : 'px-2.5 py-2',
                )}
              >
                {option.name}
                {option.id === result.bestOptionId ? <span className="sr-only">, best net</span> : null}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            if (row.kind === 'section') {
              return (
                <tr key={row.key}>
                  <th
                    scope="colgroup"
                    colSpan={columnCount}
                    className={cn(
                      'report-heading text-left font-semibold tracking-[0.14em] text-ink-muted uppercase',
                      compact ? 'px-2 pt-3 pb-0.5 text-[10px]' : 'px-3 pt-5 pb-1 text-xs',
                    )}
                  >
                    {row.label}
                  </th>
                </tr>
              );
            }
            const kind = row.kind;
            return (
              <tr key={row.key} className="border-b border-line/80">
                <th
                  scope="row"
                  className={cn(
                    'report-field sticky left-0 z-10 bg-sticky text-left font-semibold whitespace-normal text-ink',
                    compact ? 'px-2 py-1' : 'px-2.5 py-1.5',
                  )}
                >
                  <span className="inline-flex items-center gap-1">
                    {row.label}
                    {row.tip ? <InfoTip text={row.tip} /> : null}
                  </span>
                </th>
                <Cell
                  value={row.now}
                  kind={kind}
                  muted
                  emphasis={row.emphasis}
                  warning={row.nowWarning}
                  compact={compact}
                />
                {row.values.map((value, index) => (
                  <Cell
                    key={result.options[index]?.id ?? index}
                    value={value}
                    kind={kind}
                    emphasis={row.emphasis}
                    warning={row.warnings?.[index]}
                    compact={compact}
                  />
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
