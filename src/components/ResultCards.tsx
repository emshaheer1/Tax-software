import { formatMoney, formatPercent } from '../engine/format.ts';
import type { ResolvedOption } from '../engine/plan.ts';
import { Badge } from './Badge.tsx';
import { cn } from './cn.ts';

function tone(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value) || value === 0) return 'text-ink';
  return value > 0 ? 'text-positive' : 'text-negative';
}

export function ResultCards({
  options,
  bestOptionId,
  planningFees = 0,
  compact = false,
  paper = false,
}: {
  options: ResolvedOption[];
  bestOptionId?: string;
  planningFees?: number;
  compact?: boolean;
  paper?: boolean;
}) {
  if (options.length === 0) return null;

  return (
    <div
      className={
        compact
          ? 'grid grid-cols-3 gap-2'
          : 'grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]'
      }
    >
      {options.map((option) => {
        const best = option.id === bestOptionId;
        return (
          <article
            key={option.id}
            className={cn(
              'keep rounded-[10px]',
              paper || compact
                ? 'border bg-white p-3.5 shadow-none'
                : 'glass p-3.5',
              best ? 'border-[#0f8b8d]' : paper || compact ? 'border-[#d7d2c8]' : 'border-line',
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="report-heading min-w-0 text-sm font-semibold text-ink">{option.name}</h3>
              {best ? <Badge>Best net</Badge> : null}
            </div>
            <p
              className={cn(
                'mt-3 font-semibold tracking-tight tabular-nums',
                compact ? 'text-[22px] leading-none' : 'text-[26px] leading-none',
                tone(option.net),
              )}
            >
              {formatMoney(option.net ?? null)}
            </p>
            <p className="report-field mt-1 text-xs font-semibold text-ink-muted">Net amount</p>
            <dl className={cn('space-y-1 border-t border-line text-sm', compact ? 'mt-2 pt-2' : 'mt-4 pt-3')}>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="report-field text-xs font-semibold text-ink-muted">Total saving</dt>
                <dd className={cn('font-medium tabular-nums', tone(option.taxSavings))}>
                  {formatMoney(option.taxSavings ?? null)}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="report-field text-xs font-semibold text-ink-muted">Cash out</dt>
                <dd className="font-medium text-ink tabular-nums">{formatMoney(option.cashOut ?? null)}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="report-field text-xs font-semibold text-ink-muted">Planning fees</dt>
                <dd className="font-medium text-ink tabular-nums">{formatMoney(planningFees)}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="report-field text-xs font-semibold text-ink-muted">ROI</dt>
                <dd className={cn('font-medium tabular-nums', tone(option.roi))}>{formatPercent(option.roi)}</dd>
              </div>
            </dl>
          </article>
        );
      })}
    </div>
  );
}
