import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type XAxisTickContentProps,
} from 'recharts';
import { formatMoney } from '../engine/format.ts';
import type { ResolvedOption } from '../engine/plan.ts';

interface ChartRow {
  id: string;
  name: string;
  taxSaved: number;
  cashOut: number;
  net: number;
}

const SAVED = '#0F8B8D';
const CASH = '#8A97A8';
const CASH_STROKE = '#6E7C8C';

function chartInk(compact: boolean): { label: string; muted: string; grid: string; tip: string } {
  if (compact) {
    return { label: '#1B2430', muted: '#5B6676', grid: '#E3DFD7', tip: '#ffffff' };
  }
  return { label: '#F4F1EA', muted: '#C5CED8', grid: 'rgba(255,255,255,0.1)', tip: '#161616' };
}

function shorten(name: string): string {
  return name.length > 22 ? `${name.slice(0, 20)}…` : name;
}

function NetTick({
  x = 0,
  y = 0,
  payload,
  rows,
  compact,
}: XAxisTickContentProps & { rows: ChartRow[]; compact: boolean }) {
  const id = String(payload?.value ?? '');
  const row = rows.find((item) => item.id === id);
  const net = row?.net ?? 0;
  const ink = chartInk(compact);
  const fill = net < 0 ? (compact ? '#B3392F' : '#F0A8A2') : net > 0 ? (compact ? '#1E7F4F' : '#7DCEA8') : ink.label;
  const left = typeof x === 'number' ? x : Number(x);
  const top = typeof y === 'number' ? y : Number(y);

  return (
    <g transform={`translate(${left},${top})`}>
      <text textAnchor="middle" fill={ink.label} fontSize={12} dy={14}>
        {shorten(row?.name ?? '')}
      </text>
      <text textAnchor="middle" fill={fill} fontSize={11} dy={30}>
        Net {formatMoney(row ? row.net : null)}
      </text>
    </g>
  );
}

export function SavingsChart({
  options,
  height = 300,
  compact = false,
  paper = false,
}: {
  options: ResolvedOption[];
  height?: number;
  compact?: boolean;
  paper?: boolean;
}) {
  const rows: ChartRow[] = options.map((option) => ({
    id: option.id,
    name: option.name,
    taxSaved: option.taxSavings ?? 0,
    cashOut: option.cashOut ?? 0,
    net: option.net ?? 0,
  }));

  if (rows.length === 0) return null;

  const onPaper = compact || paper;
  const ink = chartInk(onPaper);
  const summary = rows
    .map((row) => `${row.name}: tax saved ${formatMoney(row.taxSaved)}, cash out ${formatMoney(row.cashOut)}, net ${formatMoney(row.net)}`)
    .join('. ');

  const roomy = paper && !compact;

  return (
    <div role="img" aria-label={`Tax saved compared with cash out. ${summary}`}>
      <div aria-hidden="true" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={rows}
            margin={{
              top: roomy ? 16 : 4,
              right: roomy ? 16 : 8,
              left: roomy ? 8 : 0,
              bottom: roomy ? 28 : compact ? 4 : 20,
            }}
            barGap={roomy ? 10 : 4}
            barCategoryGap={roomy ? '22%' : '28%'}
          >
            <CartesianGrid vertical={false} stroke={ink.grid} strokeDasharray={roomy ? '3 6' : undefined} />
            <XAxis
              dataKey="id"
              interval={0}
              tickLine={false}
              axisLine={{ stroke: ink.grid }}
              height={roomy ? 58 : compact ? 46 : 52}
              tick={(props: XAxisTickContentProps) => <NetTick {...props} rows={rows} compact={onPaper} />}
            />
            <YAxis
              tickFormatter={(value: number) => formatMoney(value)}
              width={roomy ? 96 : 84}
              tickLine={false}
              axisLine={false}
              tick={{ fill: ink.muted, fontSize: roomy ? 13 : 12 }}
            />
            <Tooltip
              cursor={{ fill: onPaper ? 'rgba(11, 37, 69, 0.04)' : 'rgba(255,255,255,0.04)' }}
              formatter={(value) => formatMoney(typeof value === 'number' ? value : Number(value))}
              labelFormatter={(_label, payload) => {
                const row = payload?.[0]?.payload as ChartRow | undefined;
                return row?.name ?? '';
              }}
              contentStyle={{
                borderRadius: 8,
                border: `1px solid ${ink.grid}`,
                background: ink.tip,
                color: ink.label,
                boxShadow: 'none',
                fontSize: 12,
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: roomy ? 13 : 12, paddingTop: roomy ? 16 : 8, color: ink.label }}
              iconType="square"
            />
            <Bar
              dataKey="taxSaved"
              name="Tax saved"
              fill={SAVED}
              radius={[4, 4, 0, 0]}
              maxBarSize={roomy ? 64 : undefined}
              isAnimationActive={false}
            />
            <Bar
              dataKey="cashOut"
              name="Cash out"
              fill={CASH}
              stroke={CASH_STROKE}
              radius={[4, 4, 0, 0]}
              maxBarSize={roomy ? 64 : undefined}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
