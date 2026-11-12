import { Printer, Download } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { Button } from '../components/Button.tsx';
import { ComparisonTable } from '../components/ComparisonTable.tsx';
import { ResultCards } from '../components/ResultCards.tsx';
import { SavingsChart } from '../components/SavingsChart.tsx';
import { filingStatusLabel } from '../engine/brackets.ts';
import { clientStatusLabel } from '../engine/plan.ts';
import { formatDate, formatMoney, todayISO } from '../engine/format.ts';
import { DISCLAIMER, calculatePlan, displayName } from '../engine/plan.ts';
import { requestPrint, schedulePrintFromStorage } from '../state/print.ts';
import { usePlans } from '../state/plans-context.tsx';
import { useSettings } from '../state/settings-context.tsx';

export function ReportPage({ printing = false }: { printing?: boolean }) {
  useEffect(() => {
    if (printing) return;
    schedulePrintFromStorage();
    const onPrint = () => schedulePrintFromStorage();
    window.addEventListener('ptc-print', onPrint);
    return () => {
      window.removeEventListener('ptc-print', onPrint);
    };
  }, [printing]);

  return (
    <div className={printing ? undefined : 'px-4 py-6 sm:px-6'}>
      {printing ? null : (
        <div className="no-print mx-auto mb-4 flex w-full max-w-[210mm] flex-wrap items-center justify-between gap-3">
          <a href="#/planner" className="text-sm font-medium text-ink">
            Back to planner
          </a>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => requestPrint()}>
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
      <div className="report-page-one">
        <header className="flex items-center justify-between gap-4 border-b border-line pb-3">
          <div className="flex items-center gap-3">
            <img src="/pta-logo.png" alt="" className="h-10 w-auto" />
            <div>
              <p className="text-sm font-semibold tracking-tight text-navy-900">Premium Tax Planners Inc.</p>
              <p className="no-print text-xs text-ink-muted">Tax Planning Calculator</p>
            </div>
          </div>
          <p className="text-right text-xs text-ink-muted">
            {settings.year}
            <br />
            {current.clientStatus ? clientStatusLabel(current.clientStatus) : filingStatusLabel(settings.filingStatus)}
          </p>
        </header>

        <h1 className="report-heading mt-3 text-xl font-semibold">Tax Planning Summary</h1>
        <p className="mt-1 text-sm text-ink">
          <span className="report-field">Client name :</span> {displayName(current)}
        </p>
        <p className="mt-0.5 text-sm text-ink">
          <span className="report-field">Date of preparation :</span> {formatDate(current.date || todayISO())}
        </p>
        <p className="mt-2 text-xs text-ink-muted">
          <span className="report-field">AGI</span> {formatMoney(current.agi)}
          <span aria-hidden="true"> · </span>
          <span className="report-field">Standard / other deductions</span> {formatMoney(current.standardDeduction)}
          <span aria-hidden="true"> · </span>
          <span className="report-field">QBI</span> {formatMoney(current.qbi)}
        </p>

        {result ? (
          <div className="mt-5 space-y-5">
            <ResultCards
              options={result.options}
              bestOptionId={result.bestOptionId}
              planningFees={current.planningFees}
              paper
            />
            <ComparisonTable plan={current} result={result} settings={settings} scroll={false} />
            {result.warnings.length > 0 ? (
              <ul className="text-sm leading-relaxed text-warning">
                {result.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : (
          <p className="mt-6 text-sm text-ink-muted">Enter the client’s AGI on the Planner to build this summary.</p>
        )}

        <footer className="report-footer report-footer-page1 mt-8 border-t border-line pt-4 text-ink-muted">
          <p>{DISCLAIMER}</p>
        </footer>
      </div>

      {result && result.options.length > 0 ? (
        <section className="report-chart-page" aria-label="Tax saved and cash out">
          <h2 className="report-heading font-semibold">Tax saved and cash out</h2>
          <p className="mt-1 text-sm text-ink-muted">Each option’s tax saved next to cash out.</p>
          <div className="report-chart mt-4">
            <SavingsChart options={result.options} height={460} paper />
          </div>
          <footer className="report-footer mt-8 border-t border-line pt-4 text-ink-muted">
            <p>{DISCLAIMER}</p>
          </footer>
        </section>
      ) : null}
    </article>
  );
}
