import { Download, Plus, Printer, RotateCcw, Save, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '../components/Button.tsx';
import { Card } from '../components/Card.tsx';
import { ComparisonTable } from '../components/ComparisonTable.tsx';
import { ConfirmDialog } from '../components/ConfirmDialog.tsx';
import { MoneyInput } from '../components/MoneyInput.tsx';
import { ResultCards } from '../components/ResultCards.tsx';
import { SavingsChart } from '../components/SavingsChart.tsx';
import { DateField } from '../components/DateField.tsx';
import { TextField } from '../components/TextField.tsx';
import { fieldClass } from '../components/cn.ts';
import { WarningBanner } from '../components/WarningBanner.tsx';
import { SelectMenu } from '../components/SelectMenu.tsx';
import type { CalculationFormulas } from '../engine/formula.ts';
import { formatMoney } from '../engine/format.ts';
import {
  standardDeductionFor,
  calculatePlan,
  optionFigures,
  suggestedLcdFigures,
  suggestedQuarterlyContribution,
  writeOffFromDonation,
  type ClientStatus,
  type Plan,
  type PlanResult,
} from '../engine/plan.ts';
import { requestPrint } from '../state/print.ts';
import { usePlans } from '../state/plans-context.tsx';
import { useSettings } from '../state/settings-context.tsx';
import { useToast } from '../components/Toast.tsx';

function GuideBlock({ option, agi }: { option: Plan['options'][number]; agi: number }) {
  const guide = suggestedLcdFigures(option, agi);
  if (!guide || guide.writeOff <= 0) return null;
  return (
    <div>
      <p className="mb-1.5 text-[11px] leading-none text-ink-muted">(From AGI, for reference)</p>
      <div className="rounded-md border border-white/10 bg-black/50 px-2.5 py-1.5">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-[11px] text-ink-muted">Maximum Write Off</p>
          <p className="text-[13px] leading-none font-semibold text-[#7dcea8] tabular-nums">
            {formatMoney(guide.writeOff)}
          </p>
        </div>
        <div className="mt-1.5 flex items-baseline justify-between gap-3 border-t border-white/10 pt-1.5">
          <p className="text-[11px] text-ink-muted">Max Donation to LCD</p>
          <p className="text-[13px] leading-none font-semibold text-[#7dcea8] tabular-nums">
            {formatMoney(guide.donation)}
          </p>
        </div>
      </div>
    </div>
  );
}

function ComputedMoney({ id, label, value }: { id: string; label: string; value: number }) {
  const shown = formatMoney(value).replace(/^\$/, '');
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-ink-muted">
        {label}
      </label>
      <div className="relative">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-ink-muted"
        >
          $
        </span>
        <input id={id} readOnly tabIndex={-1} className={`${fieldClass} pl-7 tabular-nums`} value={shown} />
      </div>
    </div>
  );
}

function previewShell(plan: Plan, multiplier: number, formulas: CalculationFormulas): PlanResult {
  const blank = {
    maxDeduction: 0,
    newAGI: 0,
    taxableIncome: 0,
    federalTax: 0,
    rateOnAGI: null,
    rateOnTaxable: null,
  };
  return {
    now: blank,
    nowMessages: [],
    warnings: [],
    options: plan.options.map((option) => {
      const gasOil = Number.isFinite(option.gasOil) ? option.gasOil : 0;
      const figures = optionFigures(option, plan.agi, multiplier, formulas, {
        standard: plan.standardDeduction,
        qbi: plan.qbi,
      });
      return {
        ...blank,
        id: option.id,
        name: option.name.trim() || 'Option',
        messages: [],
        maxDeduction: figures.writeOff,
        cashOut: figures.donation + gasOil,
      };
    }),
  };
}

function hasWork(plan: Plan): boolean {
  return (
    plan.clientName.trim() !== '' ||
    plan.agi > 0 ||
    plan.qbi > 0 ||
    plan.options.some(
      (option) =>
        option.gasOil > 0 ||
        option.lcd > 0 ||
        (option.writeOff ?? 0) > 0 ||
        !['Option 1 (Only LCD)', 'LCD (30)%', 'LCD (50)%'].includes(option.name.trim()),
    ) ||
    plan.planningFees > 0
  );
}

export function PlannerPage() {
  const { settings } = useSettings();
  const {
    current,
    updateCurrent,
    updateOption,
    addOption,
    removeOption,
    newPlan,
    resetNumbers,
    saveCurrent,
  } = usePlans();
  const toast = useToast();
  const [confirm, setConfirm] = useState<'new' | 'reset' | null>(null);
  const result = useMemo(() => calculatePlan(current, settings), [current, settings]);
  const preview = result ?? previewShell(current, settings.lcdMultiplier, settings.formulas);
  const quarter = suggestedQuarterlyContribution(current.agi, settings);
  const quarterHint =
    quarter == null ? undefined : `Suggested max per quarter: ${formatMoney(quarter)}`;

  const summary = preview.options
    .map((option) => `${option.name} net ${formatMoney(option.net ?? null)}`)
    .join('. ');

  function askNew() {
    if (hasWork(current)) setConfirm('new');
    else newPlan();
  }

  function askReset() {
    if (hasWork(current)) setConfirm('reset');
    else resetNumbers();
  }

  return (
    <div className="grid gap-3 p-3 lg:min-h-[calc(100vh-3.5rem)] lg:grid-cols-[minmax(300px,380px)_minmax(0,1fr)] lg:p-4">
      <section aria-label="Plan inputs" className="glass min-w-0 space-y-3 rounded-xl p-3.5 sm:p-4">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div>
            <h1 className="text-lg">Tax plan</h1>
          </div>
          <Button variant="secondary" onClick={askNew}>
            New plan
          </Button>
        </div>

        <Card title="Client">
          <div className="space-y-3">
            <TextField
              id="client-name"
              label="Client name"
              value={current.clientName}
              maxLength={120}
              autoComplete="off"
              onChange={(clientName) => updateCurrent({ clientName })}
            />
            <div>
              <label htmlFor="client-status" className="mb-1.5 block text-xs font-medium text-ink-muted">
                Filing status
              </label>
              <SelectMenu<ClientStatus>
                id="client-status"
                value={current.clientStatus ?? 'single'}
                options={[
                  { value: 'single', label: 'Single' },
                  { value: 'mfj', label: 'Married Filing Jointly' },
                  { value: 'hoh', label: 'Heads of Households' },
                ]}
                onChange={(clientStatus) =>
                  updateCurrent({ clientStatus, standardDeduction: standardDeductionFor(settings, clientStatus) })
                }
              />
            </div>
            <DateField
              id="plan-date"
              label="Plan date"
              value={current.date}
              onChange={(date) => updateCurrent({ date: date || current.date })}
            />
          </div>
        </Card>

        <Card title="Income">
          <div className="space-y-3">
            <MoneyInput
              id="agi"
              label="AGI Number"
              value={current.agi}
              onChange={(agi) => updateCurrent({ agi })}
            />
            <MoneyInput
              id="standard"
              label="Standard / Other Deductions"
              value={current.standardDeduction}
              onChange={(standardDeduction) => updateCurrent({ standardDeduction })}
            />
            <MoneyInput
              id="qbi"
              label="QBI Deductions"
              value={current.qbi}
              onChange={(qbi) => updateCurrent({ qbi })}
            />
            {result?.nowMessages.map((message) => (
              <p key={message} className="text-xs leading-relaxed text-warning" role="status">
                {message}
              </p>
            ))}
          </div>
        </Card>

        <Card title="Options">
          <div className="space-y-3">
            {current.options.length === 0 ? (
              <p className="text-sm text-ink-muted">Add an option to compare it with the current tax.</p>
            ) : null}
            {current.options.map((option, index) => {
              const messages = result?.options.find((item) => item.id === option.id)?.messages ?? [];
              const charity = messages.filter((message) => message.includes('AGI limit'));
              const other = messages.filter((message) => !message.includes('AGI limit'));
              return (
                <article key={option.id} className="rounded-[10px] border border-line p-4">
                  <div className="mb-4 flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <label htmlFor={`option-name-${option.id}`} className="mb-1.5 block text-xs font-medium text-ink-muted">
                        Option name
                      </label>
                      <input
                        id={`option-name-${option.id}`}
                        className="h-10 w-full rounded-lg border border-line bg-field px-3 text-sm font-medium text-ink"
                        value={option.name}
                        maxLength={80}
                        onChange={(event) => updateOption(option.id, { name: event.target.value })}
                      />
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="mt-6"
                      aria-label={`Remove ${option.name || `option ${index + 1}`}`}
                      onClick={() => removeOption(option.id)}
                    >
                      <Trash2 size={14} aria-hidden="true" />
                      Remove
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {option.writeOffRate == null ? null : <GuideBlock option={option} agi={current.agi} />}
                    <MoneyInput
                      id={`lcd-${option.id}`}
                      label="Max Donation to LCD"
                      value={option.lcd}
                      hint={quarterHint}
                      onChange={(lcd) =>
                        updateOption(option.id, {
                          lcd,
                          writeOff:
                            option.writeOffRate == null
                              ? option.writeOff
                              : writeOffFromDonation(option, lcd, settings.lcdMultiplier),
                        })
                      }
                    />
                    {option.writeOffRate == null ? null : (
                      <ComputedMoney
                        id={`write-off-${option.id}`}
                        label="Maximum Write off"
                        value={optionFigures(option, current.agi, settings.lcdMultiplier, settings.formulas, {
                          standard: current.standardDeduction,
                          qbi: current.qbi,
                        }).writeOff}
                      />
                    )}
                    {charity.map((message) => (
                      <p key={message} className="text-xs leading-relaxed text-warning" role="status">
                        {message}
                      </p>
                    ))}
                    <MoneyInput
                      id={`oil-${option.id}`}
                      label="Gas & Oil Deductions"
                      value={option.gasOil}
                      onChange={(gasOil) => updateOption(option.id, { gasOil })}
                    />
                    {other.map((message) => (
                      <p key={message} className="text-xs leading-relaxed text-warning" role="status">
                        {message}
                      </p>
                    ))}
                  </div>
                </article>
              );
            })}
            <Button variant="secondary" onClick={addOption} disabled={current.options.length >= 3}>
              <Plus size={16} aria-hidden="true" />
              Add option
            </Button>
            {current.options.length >= 3 ? (
              <p className="text-xs text-ink-muted">Three options is the maximum.</p>
            ) : null}
            <MoneyInput
              id="planning-fees"
              label="Planning Fees"
              value={current.planningFees}
              onChange={(planningFees) => updateCurrent({ planningFees })}
            />
          </div>
        </Card>
      </section>

      <section aria-label="Preview" className="glass flex min-w-0 flex-col rounded-xl p-3.5 sm:p-4">
        <p className="sr-only" aria-live="polite">
          {summary}
          {preview.bestOptionId ? ' Best net is marked.' : ''}
        </p>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg">Preview</h2>
            <p className="mt-1 text-xs text-ink-muted">Updates as you edit the tax plan.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => {
              saveCurrent();
              toast('Plan saved.');
            }}
          >
            <Save size={14} aria-hidden="true" />
            Save plan
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              toast('Choose Save as PDF in the print dialog.');
              requestPrint();
            }}
          >
            <Download size={14} aria-hidden="true" />
            Download PDF
          </Button>
          <Button variant="secondary" onClick={() => requestPrint()}>
            <Printer size={14} aria-hidden="true" />
            Print
          </Button>
          <Button variant="ghost" onClick={askReset}>
            <RotateCcw size={14} aria-hidden="true" />
            Reset
          </Button>
          </div>
        </div>

        <div className="space-y-3">
          <WarningBanner messages={preview.warnings} />
          <ResultCards
            options={preview.options}
            bestOptionId={preview.bestOptionId}
            planningFees={current.planningFees}
          />
          <div className="glass min-w-0 rounded-lg p-3">
            <h3 className="mb-2 text-sm">Comparison</h3>
            <ComparisonTable plan={current} result={preview} settings={settings} />
          </div>
          {preview.options.length > 0 ? (
            <div className="glass rounded-lg p-3">
              <h3 className="mb-2 text-sm">Tax saved and cash out</h3>
              <SavingsChart options={preview.options} />
            </div>
          ) : null}
        </div>
      </section>

      <ConfirmDialog
        open={confirm === 'new'}
        title="Start a new plan?"
        body="The numbers on this screen will be cleared. A copy you already saved stays in Saved plans."
        confirmLabel="New plan"
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          newPlan();
          setConfirm(null);
        }}
      />
      <ConfirmDialog
        open={confirm === 'reset'}
        title="Reset this plan?"
        body="AGI, deductions, and option amounts will be cleared. The client name and date stay. Saved copies are not changed."
        confirmLabel="Reset"
        danger
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          resetNumbers();
          setConfirm(null);
        }}
      />
    </div>
  );
}
