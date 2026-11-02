import { Copy, Download, Search, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '../components/Button.tsx';
import { ConfirmDialog } from '../components/ConfirmDialog.tsx';
import { EmptyState } from '../components/EmptyState.tsx';
import { useToast } from '../components/Toast.tsx';
import { fieldClass } from '../components/cn.ts';
import { formatDate, formatMoney, todayISO } from '../engine/format.ts';
import { calculatePlan, displayName, type Plan } from '../engine/plan.ts';
import { usePlans } from '../state/plans-context.tsx';
import { useSettings } from '../state/settings-context.tsx';

export function SavedPlansPage() {
  const { plans, openPlan, duplicatePlan, deletePlan } = usePlans();
  const { settings } = useSettings();
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [pendingDelete, setPendingDelete] = useState<Plan | null>(null);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return plans.filter((plan) => {
      if (!needle) return true;
      return displayName(plan).toLowerCase().includes(needle) || plan.clientName.toLowerCase().includes(needle);
    });
  }, [plans, query]);

  function exportPlans() {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      plans,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pta-tax-plans-${todayISO()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast(`Exported ${plans.length} ${plans.length === 1 ? 'plan' : 'plans'}.`);
  }

  return (
    <div className="mx-auto w-full max-w-[1360px] px-4 py-4 sm:px-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg">Saved plans</h1>
          <p className="mt-1 text-sm text-ink-muted">Plans stay in this browser until you export them.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={exportPlans}>
            <Download size={16} aria-hidden="true" />
            Export all
          </Button>
        </div>
      </div>

      <div className="relative mt-6 max-w-md">
        <label htmlFor="plan-search" className="sr-only">
          Search by client name
        </label>
        <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
        <input
          id="plan-search"
          className={`${fieldClass} pl-9`}
          placeholder="Search by client name"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      {plans.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="No saved plans yet"
            body="Save a plan from the Planner. It will be listed here with the client, the AGI, and the strongest net benefit."
            action={
              <a href="#/planner" className="inline-flex h-10 items-center rounded-lg bg-[#efe6d4] px-3.5 text-sm font-medium text-[#16130e]">
                Go to Planner
              </a>
            }
          />
        </div>
      ) : visible.length === 0 ? (
        <p className="mt-8 text-sm text-ink-muted">No plans match that name.</p>
      ) : (
        <ul className="glass mt-6 divide-y divide-line overflow-hidden rounded-[10px]">
          {visible.map((plan) => {
            const result = calculatePlan(plan, settings);
            const best = result?.options.find((option) => option.id === result.bestOptionId);
            const top =
              best ??
              result?.options.reduce<(typeof result.options)[number] | undefined>((winner, option) => {
                if (!winner || (option.net ?? 0) > (winner.net ?? 0)) return option;
                return winner;
              }, undefined);
            return (
              <li key={plan.id} className="flex flex-col gap-3 p-3.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-semibold tracking-tight text-ink">{displayName(plan)}</p>
                  <p className="mt-1 text-sm text-ink-muted">
                    {formatDate(plan.date)}
                    <span aria-hidden="true"> · </span>
                    AGI {formatMoney(plan.agi)}
                    {top ? (
                      <>
                        <span aria-hidden="true"> · </span>
                        {top.name}
                        <span aria-hidden="true"> · </span>
                        Net {formatMoney(top.net ?? null)}
                      </>
                    ) : (
                      <>
                        <span aria-hidden="true"> · </span>
                        No result yet
                      </>
                    )}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      openPlan(plan.id);
                      window.location.hash = '#/planner';
                    }}
                  >
                    Open
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      duplicatePlan(plan.id);
                      toast('Plan duplicated.');
                    }}
                  >
                    <Copy size={14} aria-hidden="true" />
                    Duplicate
                  </Button>
                  <Button variant="destructive" onClick={() => setPendingDelete(plan)}>
                    <Trash2 size={14} aria-hidden="true" />
                    Delete
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        open={pendingDelete != null}
        title="Delete this plan?"
        body={`Delete the plan for ${pendingDelete ? displayName(pendingDelete) : 'this client'}? This cannot be undone.`}
        confirmLabel="Delete"
        danger
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) {
            deletePlan(pendingDelete.id);
            toast('Plan deleted.');
          }
          setPendingDelete(null);
        }}
      />
    </div>
  );
}
