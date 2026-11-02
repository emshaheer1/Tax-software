import { Printer, Download } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { Button } from '../components/Button.tsx';
import { ComparisonTable } from '../components/ComparisonTable.tsx';
import { ResultCards } from '../components/ResultCards.tsx';
import { SavingsChart } from '../components/SavingsChart.tsx';
import { useToast } from '../components/Toast.tsx';
import { BRACKET_DISCLAIMER, filingStatusLabel } from '../engine/brackets.ts';
import { clientStatusLabel } from '../engine/plan.ts';
import { formatDate, formatMoney } from '../engine/format.ts';
import { DISCLAIMER, calculatePlan, displayName } from '../engine/plan.ts';
import { requestPrint, schedulePrintFromStorage } from '../state/print.ts';
import { usePlans } from '../state/plans-context.tsx';
import { useSettings } from '../state/settings-context.tsx';

export function ReportPage({ printing = false }: { printing?: boolean }) {
  const toast = useToast();

  useEffect(() => {
    if (printing) return;
    schedulePrintFromStorage();
    const onPrint = () => schedulePrintFromStorage();
    window.addEventListener('ptc-print', onPrint);
    return () => window.removeEventListener('ptc-print', onPrint);
  }, [printing]);

  return (
    <div className={printing ? undefined : 'px-4 py-6 sm:px-6'}>
      {printing ? null : (
        <div className="no-print mx-auto mb-4 flex w-full max-w-[210mm] flex-wrap items-center justify-between gap-3">
          <a href="#/planner" className="text-sm font-medium text-ink">
            Back to planner
          </a>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                toast('Choose Save as PDF in the print dialog.');
                requestPrint();
              }}
            >
              <Download size={16} aria-hidden="true" />
              Download PDF
            </Button>
            <Button onClick={() => requestPrint()}>
              <Printer size={16} aria-hidden="true" />
              Print
            </Button>
          </div>
        </div>
      )}
      <div className={printing ? undefined : 'flex justify-center'}>
        <ReportDocument />
      </div>
    </div>
  );
}

export function ReportDocument() {
  const { current } = usePlans();
  const { settings } = useSettings();
  const result = useMemo(() => calculatePlan(current, settings), [current, settings]);

  return (
    <article className="report-sheet text-ink">
      <header className="flex items-center justify-between gap-4 border-b border-line pb-3">
        <div className="flex items-center gap-3">
          <img src="/pta-logo.png" alt="" className="h-10 w-auto" />
          <div>
            <p className="text-sm font-semibold tracking-tight text-navy-900">Premium Tax Planners Inc.</p>
            <p className="text-xs text-ink-muted">Tax Planning Calculator</p>
          </div>
        </div>
        <p className="text-right text-xs text-ink-muted">
          {settings.year}
          <br />
          {current.clientStatus ? clientStatusLabel(current.clientStatus) : filingStatusLabel(settings.filingStatus)}
        </p>
      </header>

      <h1 className="mt-3 text-xl">Tax Planning Summary</h1>
      <p className="mt-1 text-sm text-ink">
        {displayName(current)}
        <span aria-hidden="true"> · </span>
        {formatDate(current.date)}
      </p>
      <p className="mt-2 text-xs text-ink-muted">
        AGI {formatMoney(current.agi)} · Standard / other deductions {formatMoney(current.standardDeduction)} · QBI{' '}
        {formatMoney(current.qbi)}
      </p>

      {result ? (
        <div className="mt-3 space-y-3">
          <ResultCards
            options={result.options}
            bestOptionId={result.bestOptionId}
            planningFees={current.planningFees}
            compact
          />
          <ComparisonTable plan={current} result={result} settings={settings} scroll={false} compact />
          {result.options.length > 0 ? <SavingsChart options={result.options} height={118} compact /> : null}
          {result.warnings.length > 0 ? (
            <ul className="text-[11px] leading-relaxed text-warning">
              {result.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : (
        <p className="mt-6 text-sm text-ink-muted">Enter the client’s AGI on the Planner to build this summary.</p>
      )}

      <footer className="mt-4 border-t border-line pt-3 text-[10px] leading-relaxed text-ink-muted">
        <p>{DISCLAIMER}</p>
        <p className="mt-1">
          {`Prepared with tax year ${settings.year}, ${current.clientStatus ? clientStatusLabel(current.clientStatus) : filingStatusLabel(settings.filingStatus)}. ${BRACKET_DISCLAIMER}.`}
        </p>
      </footer>
    </article>
  );
}
