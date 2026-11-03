import { useState } from 'react';
import { Button } from '../components/Button.tsx';
import { MoneyInput } from '../components/MoneyInput.tsx';
import { fieldClass } from '../components/cn.ts';
import { SelectMenu } from '../components/SelectMenu.tsx';
import {
  BRACKET_DISCLAIMER,
  builtinBrackets,
  builtinStandard,
  filingStatusLabel,
  findBracketSet,
  validateBrackets,
  type Bracket,
  type FilingStatus,
} from '../engine/brackets.ts';
import { roundHalfAwayFromZero } from '../engine/format.ts';
import { useSettings } from '../state/settings-context.tsx';

interface DraftRow {
  key: string;
  upTo: string;
  rate: string;
  open: boolean;
}

function rateText(rate: number): string {
  return String(roundHalfAwayFromZero(rate * 10_000) / 100);
}

function draftFrom(brackets: Bracket[] | undefined): DraftRow[] {
  if (!brackets || brackets.length === 0) {
    return [{ key: crypto.randomUUID(), upTo: '', rate: '37', open: true }];
  }
  return brackets.map((bracket) => ({
    key: crypto.randomUUID(),
    upTo: bracket.upTo == null ? '' : String(bracket.upTo),
    rate: rateText(bracket.rate),
    open: bracket.upTo == null,
  }));
}

function toBrackets(rows: DraftRow[]): Bracket[] | null {
  const brackets: Bracket[] = [];
  for (const row of rows) {
    const ratePct = Number(row.rate);
    if (!Number.isFinite(ratePct)) return null;
    if (row.open) {
      brackets.push({ upTo: null, rate: ratePct / 100 });
      continue;
    }
    const upTo = Number(row.upTo.replace(/,/g, ''));
    if (!Number.isFinite(upTo)) return null;
    brackets.push({ upTo, rate: ratePct / 100 });
  }
  return brackets;
}

function BracketTable({
  year,
  filingStatus,
  resetEpoch,
}: {
  year: number;
  filingStatus: FilingStatus;
  resetEpoch: number;
}) {
  const { settings, setSettings, updateSettings } = useSettings();
  const identity = `${year}:${filingStatus}:${resetEpoch}`;
  const [seenKey, setSeenKey] = useState(identity);
  const [rows, setRows] = useState<DraftRow[]>(() => draftFrom(findBracketSet(settings, year, filingStatus)?.brackets));
  const [error, setError] = useState('');
  const inUse = settings.year === year && settings.filingStatus === filingStatus;

  if (seenKey !== identity) {
    setSeenKey(identity);
    setRows(draftFrom(findBracketSet(settings, year, filingStatus)?.brackets));
    setError('');
  }

  function commit(nextRows: DraftRow[]) {
    const brackets = toBrackets(nextRows);
    if (!brackets) {
      setError('Enter a number in every limit and rate.');
      return;
    }
    const problems = validateBrackets(brackets);
    if (problems.length > 0) {
      setError(problems[0] ?? '');
      return;
    }
    setError('');
    setSettings({
      ...settings,
      bracketSets: settings.bracketSets.map((set) =>
        set.year === year && set.filingStatus === filingStatus ? { ...set, brackets } : set,
      ),
    });
  }

  function updateRow(key: string, patch: Partial<DraftRow>) {
    const next = rows.map((row) => (row.key === key ? { ...row, ...patch } : row));
    setRows(next);
    commit(next);
  }

  function addRow() {
    const finite = rows.filter((row) => !row.open);
    const last = Number(finite[finite.length - 1]?.upTo.replace(/,/g, '') ?? '0');
    const nextLimit = Number.isFinite(last) ? last + 50_000 : 50_000;
    const open = rows.find((row) => row.open) ?? {
      key: crypto.randomUUID(),
      upTo: '',
      rate: '37',
      open: true,
    };
    const next = [
      ...finite,
      {
        key: crypto.randomUUID(),
        upTo: String(nextLimit),
        rate: finite[finite.length - 1]?.rate ?? '32',
        open: false,
      },
      open,
    ];
    setRows(next);
    commit(next);
  }

  function removeRow(key: string) {
    const next = rows.filter((row) => row.key !== key);
    setRows(next);
    commit(next);
  }

  function removeSet() {
    if (settings.bracketSets.length <= 1) return;
    const remaining = settings.bracketSets.filter(
      (set) => !(set.year === year && set.filingStatus === filingStatus),
    );
    const next = remaining[0];
    if (!next) return;
    setSettings({
      ...settings,
      year: inUse ? next.year : settings.year,
      filingStatus: inUse ? next.filingStatus : settings.filingStatus,
      bracketSets: remaining,
    });
  }

  return (
    <article className="glass rounded-xl p-3.5">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold tracking-tight text-ink">
            {year} · {filingStatusLabel(filingStatus)}
          </h3>
          <p className="mt-1 text-xs text-ink-muted">This table is separate from the other years.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {inUse ? (
            <span className="rounded-full border border-[#d9c7a3]/40 px-2.5 py-1 text-xs font-medium text-[#efe6d4]">
              In use
            </span>
          ) : (
            <Button size="sm" variant="secondary" onClick={() => updateSettings({ year, filingStatus })}>
              Use this table
            </Button>
          )}
        </div>
      </div>
      <div className="mb-3 max-w-xs">
        <MoneyInput
          id={`standard-${year}-${filingStatus}`}
          label="Standard deduction"
          value={findBracketSet(settings, year, filingStatus)?.standardDeduction ?? builtinStandard(filingStatus)}
          onChange={(standardDeduction) => {
            setSettings({
              ...settings,
              bracketSets: settings.bracketSets.map((set) =>
                set.year === year && set.filingStatus === filingStatus ? { ...set, standardDeduction } : set,
              ),
            });
          }}
        />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[13px]">
          <caption className="sr-only">
            Tax brackets for {year}, {filingStatusLabel(filingStatus)}
          </caption>
          <thead>
            <tr className="border-b border-white/15 text-left">
              <th scope="col" className="py-1.5 pr-2 text-[11px] font-medium tracking-wide text-ink-muted uppercase">
                Taxable income up to
              </th>
              <th scope="col" className="py-1.5 pr-2 text-[11px] font-medium tracking-wide text-ink-muted uppercase">
                Rate
              </th>
              <th scope="col" className="py-1.5 text-[11px] font-medium text-ink-muted">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.key} className="border-b border-white/8">
                <td className="py-1.5 pr-2">
                  {row.open ? (
                    <span className="text-ink">and above</span>
                  ) : (
                    <input
                      className={fieldClass}
                      inputMode="decimal"
                      aria-label={`Bracket ${index + 1} upper limit`}
                      value={row.upTo}
                      onChange={(event) => updateRow(row.key, { upTo: event.target.value })}
                    />
                  )}
                </td>
                <td className="py-1.5 pr-2">
                  <div className="flex items-center gap-2">
                    <input
                      className={fieldClass}
                      inputMode="decimal"
                      aria-label={`Bracket ${index + 1} rate percent`}
                      value={row.rate}
                      onChange={(event) => updateRow(row.key, { rate: event.target.value })}
                    />
                    <span className="text-ink-muted">%</span>
                  </div>
                </td>
                <td className="py-1.5 text-right">
                  {row.open ? null : (
                    <Button variant="ghost" size="sm" onClick={() => removeRow(row.key)}>
                      Remove
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {error ? (
        <p className="mt-3 text-sm text-warning" role="alert">
          {error}
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" onClick={addRow}>
          Add bracket
        </Button>
        <Button variant="ghost" size="sm" onClick={removeSet} disabled={settings.bracketSets.length <= 1}>
          Remove this table
        </Button>
      </div>
    </article>
  );
}

export function BracketEditor() {
  const { settings, setSettings, resetEpoch } = useSettings();
  const [error, setError] = useState('');
  const [newYear, setNewYear] = useState(String(settings.year));
  const [newStatus, setNewStatus] = useState<FilingStatus>(settings.filingStatus === 'single' ? 'mfj' : 'single');
  const tables = [...settings.bracketSets].sort((a, b) => a.year - b.year || a.filingStatus.localeCompare(b.filingStatus));

  function addSet() {
    const year = Number(newYear);
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      setError('Enter a year between 2000 and 2100.');
      return;
    }
    if (year === 2025 || year === 2027 || newStatus === 'mfs') {
      setError('Use the 2026 Single, Married filing jointly, or Heads of Households table.');
      return;
    }
    if (findBracketSet(settings, year, newStatus)) {
      setError(
        `A ${year} ${filingStatusLabel(newStatus)} table already exists. The existing table was left unchanged.`,
      );
      return;
    }
    setError('');
    setSettings({
      ...settings,
      bracketSets: [
        ...settings.bracketSets,
        {
          year,
          filingStatus: newStatus,
          standardDeduction: builtinStandard(newStatus),
          brackets: builtinBrackets(newStatus),
        },
      ],
    });
  }

  return (
    <div className="space-y-3">
      <p className="text-xs leading-relaxed text-ink-muted">{BRACKET_DISCLAIMER}.</p>
      <div className="grid items-start gap-3 lg:grid-cols-2">
        {tables.map((set) => (
          <BracketTable
            key={`${set.year}:${set.filingStatus}:${resetEpoch}`}
            year={set.year}
            filingStatus={set.filingStatus}
            resetEpoch={resetEpoch}
          />
        ))}
      </div>
      <div className="rounded-xl border border-dashed border-[#d9c7a3]/35 p-3.5">
        <h3 className="text-sm font-semibold tracking-tight text-ink">New bracket table</h3>
        <p className="mt-1 text-xs leading-relaxed text-ink-muted">
          Adding a table creates a new one. It does not change a table that is already here.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <div>
            <label htmlFor="new-year" className="mb-1.5 block text-xs font-medium text-ink-muted">
              Year
            </label>
            <input
              id="new-year"
              className={fieldClass}
              inputMode="numeric"
              value={newYear}
              onChange={(event) => setNewYear(event.target.value)}
            />
          </div>
          <div>
            <label htmlFor="new-status" className="mb-1.5 block text-xs font-medium text-ink-muted">
              Status
            </label>
            <SelectMenu<FilingStatus>
              id="new-status"
              value={newStatus}
              options={(['single', 'mfj', 'hoh'] as const).map((status) => ({
                value: status,
                label: filingStatusLabel(status),
              }))}
              onChange={setNewStatus}
            />
          </div>
          <Button onClick={addSet}>Add table</Button>
        </div>
        {error ? (
          <p className="mt-3 text-sm text-warning" role="alert">
            {error}
          </p>
        ) : (
          <p className="mt-3 text-xs text-ink-muted">Limits must ascend. Rates must be from 0 to 100.</p>
        )}
      </div>
    </div>
  );
}
