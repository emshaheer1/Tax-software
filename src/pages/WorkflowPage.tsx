import { useState } from 'react';
import { Button } from '../components/Button.tsx';
import { cn } from '../components/cn.ts';
import { activeBrackets, filingStatusLabel, type FilingStatus, type Settings } from '../engine/brackets.ts';
import { formatMoney, formatPercent, formatPlainPercent } from '../engine/format.ts';
import {
  calculatePlan,
  clientStatusLabel,
  optionFigures,
  standardDeductionFor,
  type Plan,
} from '../engine/plan.ts';
import { taxSlices } from '../engine/tax.ts';
import { usePlans } from '../state/plans-context.tsx';
import { useSettings } from '../state/settings-context.tsx';

function money(value: number): string {
  return formatMoney(Number.isFinite(value) ? value : 0);
}

function planStatus(plan: Plan, settings: Settings): FilingStatus {
  if (plan.clientStatus === 'single' || plan.clientStatus === 'mfj' || plan.clientStatus === 'hoh') {
    return plan.clientStatus;
  }
  return settings.filingStatus;
}

function statusName(plan: Plan, settings: Settings): string {
  return plan.clientStatus ? clientStatusLabel(plan.clientStatus) : filingStatusLabel(settings.filingStatus);
}

export function WorkflowPage() {
  const { current } = usePlans();
  const { settings } = useSettings();
  const result = calculatePlan(current, settings);
  const [picked, setPicked] = useState<string | null>(null);
  const [play, setPlay] = useState(0);
  const fallbackId = result?.bestOptionId ?? current.options[0]?.id ?? null;
  const selectedId = current.options.some((option) => option.id === picked) ? picked : fallbackId;
  const input = current.options.find((option) => option.id === selectedId);
  const resolved = result?.options.find((option) => option.id === selectedId);
  const figures = input
    ? optionFigures(input, current.agi, settings.lcdMultiplier, settings.formulas, {
        standard: current.standardDeduction,
        qbi: current.qbi,
      })
    : { writeOff: 0, donation: 0 };

  const agi = Number.isFinite(current.agi) ? current.agi : 0;
  const standard = Number.isFinite(current.standardDeduction) ? current.standardDeduction : 0;
  const qbi = Number.isFinite(current.qbi) ? current.qbi : 0;
  const gas = input && Number.isFinite(input.gasOil) ? input.gasOil : 0;
  const deductionUsed = Math.max(standard, figures.writeOff);
  const filing = planStatus(current, settings);
  const brackets = activeBrackets({ ...settings, filingStatus: filing });
  const status = statusName(current, settings);
  const tableStandard =
    current.clientStatus != null ? standardDeductionFor(settings, current.clientStatus) : standard;
  const nowTaxable = result?.now.taxableIncome ?? 0;
  const nowTax = result?.now.federalTax ?? 0;
  const optionTaxable = resolved?.taxableIncome ?? 0;
  const optionTax = resolved?.federalTax ?? 0;
  const taxSaved = resolved?.taxSavings ?? 0;
  const cashOut = resolved?.cashOut ?? figures.donation + gas;
  const fees = Number.isFinite(current.planningFees) ? current.planningFees : 0;
  const net = resolved?.net ?? 0;
  const ready = result != null;
  const optionName = input?.name.trim() || 'Option';

  const rated = input?.writeOffRate === 0.3 || input?.writeOffRate === 0.5;
  const writeFormula = rated
    ? `${money(figures.donation)} × 5`
    : `${money(figures.donation)} × ${settings.lcdMultiplier}`;
  const nowSlices = taxSlices(nowTaxable, brackets);
  const optionSlices = taxSlices(optionTaxable, brackets);

  const steps: StoryStep[] = [
    {
      id: 'agi',
      kicker: 'Starts here',
      title: 'AGI',
      detail: 'Typed on the tax plan. Both tax paths start from this number.',
      value: money(agi),
    },
    {
      id: 'standard',
      kicker: 'Comes off AGI',
      title: 'Standard deduction',
      detail:
        tableStandard === standard
          ? `${status} fills this from the ${settings.year} table. It comes off AGI on the Now path.`
          : `Edited on this plan. The ${status} table starts at ${money(tableStandard)}.`,
      value: money(standard),
    },
    {
      id: 'qbi',
      kicker: 'Comes off both paths',
      title: 'QBI',
      detail: 'Taken off the Now path and the option path. Left blank, it is zero.',
      value: money(qbi),
    },
    {
      id: 'now-taxable',
      kicker: 'AGI minus those two',
      title: 'Now taxable income',
      detail: `${money(agi)} − ${money(standard)} − ${money(qbi)}`,
      value: money(nowTaxable),
    },
    {
      id: 'now-tax',
      kicker: `${settings.year} ${status} brackets`,
      title: 'Now federal tax',
      detail: 'Taxable income is split across the table. Each slice times its rate, then added.',
      value: money(nowTax),
    },
    {
      id: 'donation',
      kicker: optionName,
      title: 'Max donation to LCD',
      detail: 'Typed on this option. This is the cash paid in, before gas and oil.',
      value: money(figures.donation),
    },
    {
      id: 'write-off',
      kicker: 'From the donation',
      title: 'Maximum write-off',
      detail: rated
        ? `${writeFormula}. The AGI guide on the planner is not used here.`
        : `${writeFormula}. A hand-entered donation uses the settings multiplier.`,
      value: money(figures.writeOff),
    },
    {
      id: 'deduction',
      kicker: 'Larger of the two',
      title: 'Deduction used',
      detail: `The larger of ${money(standard)} and ${money(figures.writeOff)}. They are not added together.`,
      value: money(deductionUsed),
    },
    {
      id: 'gas',
      kicker: 'Option only',
      title: 'Gas and oil',
      detail: 'Comes off this option’s taxable income, and is added on top of the donation for cash out.',
      value: money(gas),
    },
    {
      id: 'option-taxable',
      kicker: 'AGI minus the option items',
      title: 'Option taxable income',
      detail: `${money(agi)} − ${money(deductionUsed)} − ${money(qbi)} − ${money(gas)}`,
      value: money(optionTaxable),
    },
    {
      id: 'option-tax',
      kicker: 'Same bracket table',
      title: 'Option federal tax',
      detail: `The option’s taxable income runs through the same ${settings.year} ${status} brackets.`,
      value: money(optionTax),
    },
    {
      id: 'saved',
      kicker: 'Now tax minus option tax',
      title: 'Tax saved',
      detail: `${money(nowTax)} − ${money(optionTax)}`,
      value: money(taxSaved),
    },
    {
      id: 'cash',
      kicker: 'Donation plus gas and oil',
      title: 'Cash out',
      detail: `${money(figures.donation)} + ${money(gas)}`,
      value: money(cashOut),
    },
    {
      id: 'fees',
      kicker: 'Same on every option',
      title: 'Planning fees',
      detail: 'Taken off the net of every option, including an option with no donation.',
      value: money(fees),
    },
    {
      id: 'net',
      kicker: 'Tax saved, minus cash, minus fees',
      title: 'Net',
      detail: `${money(taxSaved)} − ${money(cashOut)} − ${money(fees)}`,
      value: money(net),
    },
    {
      id: 'roi',
      kicker: 'Net divided by cash out',
      title: 'ROI',
      detail: cashOut > 0 ? `${money(net)} ÷ ${money(cashOut)}` : 'Cash out is zero, so ROI is not available.',
      value: formatPercent(resolved?.roi),
    },
  ];

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-4 px-4 py-4 sm:px-5">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-white/12 pb-3">
        <div>
          <h1 className="text-lg">Workflow</h1>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-ink-muted">
            {current.clientName.trim()
              ? `${current.clientName.trim()}'s plan, with the formula beside each result.`
              : 'The open plan, with the formula beside each result.'}
          </p>
        </div>
        <a href="#/planner" className="text-sm font-medium text-[#7dcea8] hover:underline">
          Back to the planner
        </a>
      </div>

      {ready ? null : (
        <p className="rounded-xl border border-[#e6c27a]/40 bg-[#e6c27a]/10 px-3 py-2 text-sm text-[#e6c27a]">
          Enter an AGI on the Planner. The sheet stays in place and fills in as soon as that number is there.
        </p>
      )}

      <section aria-label="Result summary" className="space-y-3">
        <h2 className="text-base">Results</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Summary label="Now federal tax" value={money(nowTax)} note={`On ${money(nowTaxable)} taxable`} />
          <Summary label="Option federal tax" value={money(optionTax)} note={optionName} />
          <Summary label="Tax saved" value={money(taxSaved)} note={`${money(nowTax)} − ${money(optionTax)}`} />
          <Summary
            label="Net"
            value={money(net)}
            note={cashOut > 0 ? `ROI ${formatPercent(resolved?.roi)}` : 'Cash out is zero'}
          />
        </div>
      </section>

      <section aria-label="Calculation" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base">How each result is calculated</h2>
          <div className="flex flex-wrap items-center gap-2">
            {current.options.map((option) => {
              const selected = option.id === selectedId;
              return (
                <Button
                  key={option.id}
                  variant={selected ? 'primary' : 'secondary'}
                  aria-pressed={selected}
                  onClick={() => setPicked(option.id)}
                >
                  {option.name.trim() || 'Option'}
                </Button>
              );
            })}
            <Button variant="secondary" onClick={() => setPlay((value) => value + 1)}>
              Play again
            </Button>
          </div>
        </div>
        <Story key={`${selectedId ?? 'none'}-${play}`} steps={steps} />
      </section>

      <section aria-label="Bracket math" className="space-y-3">
        <h2 className="text-base">Bracket math</h2>
        <div className="grid items-stretch gap-3 lg:grid-cols-2">
        <SliceCard
          title="Now tax, slice by slice"
          income={nowTaxable}
          total={nowTax}
          slices={nowSlices}
          year={settings.year}
          status={status}
        />
        <SliceCard
          title="Option tax, slice by slice"
          income={optionTaxable}
          total={optionTax}
          slices={optionSlices}
          year={settings.year}
          status={status}
        />
        </div>
      </section>
    </div>
  );
}

type StoryStep = {
  id: string;
  kicker: string;
  title: string;
  detail: string;
  value: string;
};

function Story({ steps }: { steps: StoryStep[] }) {
  return (
    <ol className="story-grid grid list-none grid-cols-1 gap-x-14 gap-y-12 p-0 sm:grid-cols-2 xl:grid-cols-4">
      {steps.map((step, index) => (
        <li key={step.id} className="story-cell relative h-[220px]">
          <article
            className="story-card glass flex h-[220px] flex-col rounded-xl p-4"
            style={{ animationDelay: `${index * 0.42}s` }}
          >
            <p className="text-sm font-medium text-ink-muted">{step.kicker}</p>
            <h3 className="mt-1.5 text-base leading-snug">{step.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">{step.detail}</p>
            <p className="mt-auto pt-4 text-xl leading-none font-semibold text-[#7dcea8] tabular-nums">
              {step.value}
            </p>
          </article>
          <span className="story-arrow story-arrow-right" style={{ animationDelay: `${index * 0.42 + 0.24}s` }} aria-hidden>
            <FlowArrow />
          </span>
          <span className="story-arrow story-arrow-down" style={{ animationDelay: `${index * 0.42 + 0.24}s` }} aria-hidden>
            <FlowArrow />
          </span>
        </li>
      ))}
    </ol>
  );
}

function FlowArrow() {
  return (
    <svg width="28" height="16" viewBox="0 0 28 16" fill="none">
      <path d="M1 8h19" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M16 3.5 22.5 8 16 12.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Summary({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <article className="glass flex h-full min-h-[118px] flex-col rounded-xl p-4">
      <p className="text-sm font-medium text-ink-muted">{label}</p>
      <p className="mt-3 text-2xl leading-none font-semibold text-[#7dcea8] tabular-nums">{value}</p>
      <p className="mt-auto pt-3 text-sm leading-relaxed text-ink-muted">{note}</p>
    </article>
  );
}

function SliceCard({
  title,
  income,
  total,
  slices,
  year,
  status,
}: {
  title: string;
  income: number;
  total: number;
  slices: ReturnType<typeof taxSlices>;
  year: number;
  status: string;
}) {
  return (
    <article className="glass flex h-full flex-col rounded-xl p-4">
      <h2 className="text-base">{title}</h2>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
        {money(income)} through the {year} {status} brackets. Each slice times its rate, then added.
      </p>
      {slices.length === 0 ? (
        <p className="mt-3 text-sm text-ink-muted">No taxable income yet, so the tax is {money(0)}.</p>
      ) : (
        <div className="mt-3">
          <div className="slice-line slice-line-head">
            <span>From</span>
            <span>To</span>
            <span>Rate</span>
            <span>Tax</span>
          </div>
          {slices.map((slice, index) => {
            const last = index === slices.length - 1;
            return (
              <div key={`${slice.from}-${slice.rate}`} className={cn('slice-line', last && 'slice-line-last')}>
                <span>{money(slice.from)}</span>
                <span>{money(slice.to)}</span>
                <span>{formatPlainPercent(slice.rate)}%</span>
                <span>{money(slice.tax)}</span>
              </div>
            );
          })}
        </div>
      )}
      <p className="mt-auto pt-3 text-base font-semibold">
        Federal tax <span className="text-[#7dcea8] tabular-nums">{money(total)}</span>
      </p>
    </article>
  );
}
