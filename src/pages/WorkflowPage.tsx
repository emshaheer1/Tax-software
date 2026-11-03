import { useLayoutEffect, useRef, useState } from 'react';
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

  const client = current.clientName.trim();

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-4 px-4 py-4 sm:px-5">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-white/12 pb-3">
        <div>
          <p className="live-line">
            <span className="live-dot" aria-hidden="true" />
            <span className="live-word">Live</span>
            <span className="live-msg">Live results generated from Engine</span>
          </p>
          <h1 className="mt-1 text-lg">Workflow</h1>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-ink-muted">
            {client ? `${client}'s plan, mapped from the planner fields.` : 'The open plan, mapped from the planner fields.'}{' '}
            {settings.year} · {status} · {optionName}
          </p>
        </div>
        <a
          href="#/planner"
          className="inline-flex h-8 items-center rounded-md border border-white/15 px-3 text-[13px] font-medium text-[#f6f1e6] transition-colors hover:border-white/30 hover:bg-white/8"
        >
          Open planner
        </a>
      </header>

      {ready ? null : (
        <p className="mt-4 rounded-xl border border-[#e6c27a]/40 bg-[#e6c27a]/10 px-3 py-2 text-sm text-[#e6c27a]">
          Enter an AGI on the Planner. The sheet stays in place and fills in as soon as that number is there.
        </p>
      )}

      <section aria-label="Planner map" className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-sm">Planner map</h2>
            <p className="mt-1 max-w-xl text-xs leading-relaxed text-ink-muted">
              Each arrow is one planner field feeding the next figure.
            </p>
          </div>
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
            <Button variant="ghost" onClick={() => setPlay((value) => value + 1)}>
              Replay
            </Button>
          </div>
        </div>
        <FlowMap key={`${selectedId ?? 'none'}-${play}`} steps={steps} />
      </section>

      <section aria-label="Bracket math" className="space-y-3">
        <h2 className="text-sm">Bracket math</h2>
        <p className="mt-1 max-w-xl text-xs leading-relaxed text-ink-muted">
          Taxable income split across the {settings.year} {status} table. Each slice times its rate, then added.
        </p>
        <div className="mt-4 grid items-stretch gap-4 lg:grid-cols-2">
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

const mapPlace: Record<string, { col: number; row: number }> = {
  agi: { col: 1, row: 1 },
  standard: { col: 1, row: 2 },
  qbi: { col: 1, row: 3 },
  donation: { col: 1, row: 4 },
  gas: { col: 1, row: 5 },
  fees: { col: 1, row: 6 },
  'now-taxable': { col: 2, row: 2 },
  'write-off': { col: 2, row: 3 },
  deduction: { col: 2, row: 4 },
  cash: { col: 2, row: 5 },
  'now-tax': { col: 3, row: 2 },
  'option-taxable': { col: 3, row: 3 },
  'option-tax': { col: 3, row: 4 },
  saved: { col: 4, row: 2 },
  net: { col: 4, row: 4 },
  roi: { col: 4, row: 5 },
};

const mapEdges: Array<{ from: string; to: string; label: string }> = [
  { from: 'agi', to: 'now-taxable', label: 'starts' },
  { from: 'standard', to: 'now-taxable', label: 'minus' },
  { from: 'qbi', to: 'now-taxable', label: 'minus' },
  { from: 'now-taxable', to: 'now-tax', label: 'brackets' },
  { from: 'donation', to: 'write-off', label: '× 5' },
  { from: 'write-off', to: 'deduction', label: 'compare' },
  { from: 'standard', to: 'deduction', label: 'or this' },
  { from: 'agi', to: 'option-taxable', label: 'starts' },
  { from: 'qbi', to: 'option-taxable', label: 'minus' },
  { from: 'deduction', to: 'option-taxable', label: 'minus' },
  { from: 'gas', to: 'option-taxable', label: 'minus' },
  { from: 'option-taxable', to: 'option-tax', label: 'brackets' },
  { from: 'now-tax', to: 'saved', label: 'now tax' },
  { from: 'option-tax', to: 'saved', label: 'minus' },
  { from: 'donation', to: 'cash', label: 'plus' },
  { from: 'gas', to: 'cash', label: 'plus' },
  { from: 'saved', to: 'net', label: 'saved' },
  { from: 'cash', to: 'net', label: 'minus' },
  { from: 'fees', to: 'net', label: 'minus' },
  { from: 'net', to: 'roi', label: 'net' },
  { from: 'cash', to: 'roi', label: '÷ cash' },
];

const mapLanes = ['Planner', 'Figures', 'Tax', 'Outcome'];

type MapLine = { d: string; from: string; to: string; label: string; lx: number; ly: number; delay: number };

function FlowMap({ steps }: { steps: StoryStep[] }) {
  const boardRef = useRef<HTMLDivElement>(null);
  const [lines, setLines] = useState<MapLine[]>([]);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [active, setActive] = useState<string | null>(null);

  useLayoutEffect(() => {
    const board = boardRef.current;
    if (!board) return;
    const draw = () => {
      const rect = board.getBoundingClientRect();
      const boxOf = (id: string) => {
        const node = board.querySelector<HTMLElement>(`[data-node="${id}"]`);
        if (!node) return null;
        const bounds = node.getBoundingClientRect();
        return {
          left: bounds.left - rect.left,
          right: bounds.right - rect.left,
          top: bounds.top - rect.top,
          bottom: bounds.bottom - rect.top,
          height: bounds.height,
          col: mapPlace[id]?.col ?? 0,
        };
      };
      type Box = NonNullable<ReturnType<typeof boxOf>>;
      const boxes = Object.keys(mapPlace)
        .map((id) => boxOf(id))
        .filter((box): box is Box => box != null);
      type Item = {
        edge: (typeof mapEdges)[number];
        index: number;
        start: Box;
        end: Box;
        y1: number;
        y2: number;
      };
      const items: Item[] = [];
      mapEdges.forEach((edge, index) => {
        const start = boxOf(edge.from);
        const end = boxOf(edge.to);
        if (!start || !end) return;
        items.push({
          edge,
          index,
          start,
          end,
          y1: start.top + start.height / 2,
          y2: end.top + end.height / 2,
        });
      });
      const fan = (group: Item[], side: 'y1' | 'y2', box: Box) => {
        const ordered = [...group].sort((a, b) => (side === 'y1' ? a.end.top - b.end.top : a.start.top - b.start.top));
        ordered.forEach((item, index) => {
          item[side] = box.top + box.height * ((index + 1) / (ordered.length + 1));
        });
      };
      const outgoing: Map<string, Item[]> = new Map();
      const incomingLeft: Map<string, Item[]> = new Map();
      const incomingRight: Map<string, Item[]> = new Map();
      for (const item of items) {
        outgoing.set(item.edge.from, [...(outgoing.get(item.edge.from) ?? []), item]);
        const sameColumn = item.start.col === item.end.col;
        const bucket = sameColumn ? incomingRight : incomingLeft;
        bucket.set(item.edge.to, [...(bucket.get(item.edge.to) ?? []), item]);
      }
      for (const group of outgoing.values()) fan(group, 'y1', group[0]!.start);
      for (const group of incomingLeft.values()) fan(group, 'y2', group[0]!.end);
      for (const group of incomingRight.values()) fan(group, 'y2', group[0]!.end);

      const gutterOf = (afterCol: number) => {
        const sources = boxes.filter((box) => box.col === afterCol);
        const targets = boxes.filter((box) => box.col === afterCol + 1);
        if (sources.length === 0 || targets.length === 0) return null;
        return {
          left: Math.max(...sources.map((box) => box.right)) + 12,
          right: Math.min(...targets.map((box) => box.left)) - 16,
        };
      };
      const neighbors = items.filter((item) => item.end.col === item.start.col + 1);
      const laneOf: Map<Item, number> = new Map();
      const byGutter: Map<number, Item[]> = new Map();
      for (const item of neighbors) byGutter.set(item.start.col, [...(byGutter.get(item.start.col) ?? []), item]);
      for (const [col, list] of byGutter) {
        const lanes: Item[][] = [];
        const ordered = [...list].sort((a, b) => Math.min(a.y1, a.y2) - Math.min(b.y1, b.y2));
        for (const item of ordered) {
          const top = Math.min(item.y1, item.y2);
          const bottom = Math.max(item.y1, item.y2);
          let lane = lanes.findIndex((placed) =>
            placed.every((other) => {
              const otherTop = Math.min(other.y1, other.y2);
              const otherBottom = Math.max(other.y1, other.y2);
              return bottom < otherTop - 16 || top > otherBottom + 16;
            }),
          );
          if (lane < 0) {
            lane = lanes.length;
            lanes.push([]);
          }
          lanes[lane]!.push(item);
          laneOf.set(item, lane);
        }
        byGutter.set(col, list);
      }
      const laneCount = (col: number) => {
        const list = byGutter.get(col) ?? [];
        return Math.max(...list.map((item) => laneOf.get(item) ?? 0), 0) + (list.length ? 1 : 1);
      };

      const skips = items
        .filter((item) => item.end.col > item.start.col + 1)
        .sort((a, b) => a.y1 - b.y1 || a.y2 - b.y2);
      const skipLane: Map<Item, number> = new Map();
      skips.forEach((item, index) => skipLane.set(item, index));
      const lowest = Math.max(...boxes.map((box) => box.bottom), 0);
      const busTop = lowest + 36;

      const next: MapLine[] = [];
      for (const item of items) {
        const { start, end, y1, y2, edge, index } = item;
        let d = '';
        if (start.col === end.col) {
          const same = items.filter((other) => other.start.col === start.col && other.end.col === end.col);
          const lane = Math.max(same.indexOf(item), 0);
          const x = start.left + 22 + lane * 16;
          d = `M ${x} ${start.bottom} V ${end.top}`;
        } else if (end.col === start.col + 1) {
          const lane = laneOf.get(item) ?? 0;
          const count = laneCount(start.col);
          const gutter = gutterOf(start.col);
          const left = gutter?.left ?? start.right + 12;
          const right = (gutter?.right ?? end.left - 16) - (start.col === 2 ? 56 : 0);
          const room = Math.max(right - left, 12);
          const step = count <= 1 ? 0 : Math.min(18, (room - 4) / (count - 1));
          const mid = left + (room - (count - 1) * step) / 2 + lane * step;
          d = `M ${start.right + 2} ${y1} H ${mid} V ${y2} H ${end.left - 9}`;
        } else {
          const lane = skipLane.get(item) ?? 0;
          const bus = busTop + lane * 22;
          const fromLeft = start.col === 1;
          const leftLane = Math.max(skips.filter((skip) => skip.start.col === 1).indexOf(item), 0);
          const downLane = Math.max(skips.filter((skip) => skip.start.col === start.col && skip.start.col !== 1).indexOf(item), 0);
          const riseLane = Math.max(skips.filter((skip) => skip.end.col === end.col).indexOf(item), 0);
          const drop = fromLeft ? 18 + leftLane * 16 : start.left + 24 + downLane * 16;
          const rise = end.col === 4
            ? rect.width - 24 - riseLane * 16
            : (gutterOf(end.col - 1)?.right ?? end.left - 18) - riseLane * 16;
          if (fromLeft) {
            d = `M ${start.left} ${y1} H ${drop} V ${bus} H ${rise} V ${y2} H ${end.col === 4 ? end.right : end.left - 9}`;
          } else {
            d = `M ${drop} ${start.bottom} V ${bus} H ${rise} V ${y2} H ${end.col === 4 ? end.right : end.left - 9}`;
          }
        }
        next.push({
          from: edge.from,
          to: edge.to,
          label: edge.label,
          lx: 0,
          ly: 0,
          delay: index * 0.08,
          d,
        });
      }
      setSize({ width: board.clientWidth, height: board.clientHeight });
      setLines(next);
    };
    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(board);
    return () => observer.disconnect();
  }, [steps]);

  return (
    <div className="map-scroll">
      <div ref={boardRef} className="map-board">
        <svg className="map-lines" width={size.width} height={size.height} aria-hidden="true">
          <defs>
            <marker id="map-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto">
              <path d="M0 0.5 9 5 0 9.5 Z" fill="#d7eee4" />
            </marker>
          </defs>
          {lines.map((line) => {
            const hot = active != null && (line.from === active || line.to === active);
            const dim = active != null && !hot;
            return (
              <g key={`${line.from}-${line.to}`}>
                <path
                  d={line.d}
                  markerEnd="url(#map-arrow)"
                  className={cn('map-edge', hot && 'map-edge-hot', dim && 'map-edge-dim')}
                />
                <path
                  d={line.d}
                  className={cn('map-spark', dim && 'map-spark-dim')}
                  style={{ animationDelay: `${line.delay}s` }}
                />
              </g>
            );
          })}
        </svg>
        {mapLanes.map((label, index) => (
          <p key={label} className="map-lane" style={{ gridColumn: index * 2 + 1, gridRow: 1 }}>
            {label}
          </p>
        ))}
        {steps.map((step) => {
          const place = mapPlace[step.id];
          if (!place) return null;
          const outcome = step.id === 'net' || step.id === 'roi' || step.id === 'saved';
          return (
            <article
              key={step.id}
              data-node={step.id}
              className={cn('map-node', outcome && 'map-node-outcome')}
              style={{ gridColumn: place.col * 2 - 1, gridRow: place.row + 1 }}
              title={step.detail}
              onMouseEnter={() => setActive(step.id)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(step.id)}
              onBlur={() => setActive(null)}
              tabIndex={0}
            >
              <p className="map-node-kicker">{step.kicker}</p>
              <h3 className="map-node-title">{step.title}</h3>
              <p className="map-node-value">{step.value}</p>
            </article>
          );
        })}
      </div>
    </div>
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
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-black/25">
      <header className="px-5 py-4">
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
        <p className="mt-1.5 text-[13px] leading-relaxed text-ink-muted">
          {money(income)} through the {year} {status} brackets. Each slice times its rate, then added.
        </p>
      </header>
      {slices.length === 0 ? (
        <p className="px-5 pb-4 text-sm text-ink-muted">No taxable income yet, so the tax is {money(0)}.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="wf-table w-full min-w-[420px] border-collapse text-[13px]">
            <thead>
              <tr>
                <th scope="col">From</th>
                <th scope="col">To</th>
                <th scope="col">Rate</th>
                <th scope="col">Tax</th>
              </tr>
            </thead>
            <tbody>
              {slices.map((slice, index) => {
                const last = index === slices.length - 1;
                return (
                  <tr key={`${slice.from}-${slice.rate}`} className={last ? 'wf-slice-last' : undefined}>
                    <td>{money(slice.from)}</td>
                    <td>{money(slice.to)}</td>
                    <td>{formatPlainPercent(slice.rate)}%</td>
                    <td>{money(slice.tax)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-auto flex items-baseline justify-between gap-3 border-t border-white/10 px-5 py-3 text-sm">
        <span className="text-ink-muted">Federal tax</span>
        <span className="font-semibold text-[#7dcea8] tabular-nums">{money(total)}</span>
      </p>
    </article>
  );
}
