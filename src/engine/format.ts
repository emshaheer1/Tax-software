/** Half away from zero, so -1.5 displays as -2 rather than the JS Math.round tie. */
export function roundHalfAwayFromZero(value: number): number {
  return Math.sign(value) * Math.round(Math.abs(value));
}

/** Whole dollars for display. Null and non-finite values are "n/a". */
export function formatMoney(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return 'n/a';
  const rounded = roundHalfAwayFromZero(value);
  const body = Math.abs(rounded).toLocaleString('en-US');
  return rounded < 0 ? `-$${body}` : `$${body}`;
}

/** Two decimal places. `value` is a ratio (0.4253 → "42.53%"). */
export function formatPercent(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return 'n/a';
  const pct = roundHalfAwayFromZero(value * 10_000) / 100;
  const body = Math.abs(pct).toFixed(2);
  return pct < 0 ? `-${body}%` : `${body}%`;
}

/** Percent label such as the charity cap ("30" or "30.5"). `ratio` is 0.30 for 30%. */
export function formatPlainPercent(ratio: number): string {
  const pct = roundHalfAwayFromZero(ratio * 10_000) / 100;
  if (Number.isInteger(pct)) return String(pct);
  return pct.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}

export function todayISO(now = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

export function formatDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return iso;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return iso;
  }
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

/** Digits and at most one decimal point, for money fields. Empty string → 0. */
export function parseMoney(raw: string): number {
  const cleaned = raw.replace(/[^\d.]/g, '');
  if (cleaned === '' || cleaned === '.') return 0;
  const [whole, fraction = ''] = cleaned.split('.');
  const normalized = fraction.length > 0 ? `${whole || '0'}.${fraction.slice(0, 2)}` : whole;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : 0;
}

/** Thousands separators while typing. Keeps a trailing decimal the user just typed. */
export function formatMoneyTyping(raw: string): string {
  const cleaned = raw.replace(/[^\d.]/g, '');
  if (cleaned === '') return '';
  const dot = cleaned.indexOf('.');
  const wholeRaw = dot === -1 ? cleaned : cleaned.slice(0, dot);
  const fraction = dot === -1 ? null : cleaned.slice(dot + 1).replace(/\./g, '').slice(0, 2);
  const whole = wholeRaw.replace(/^0+(?=\d)/, '');
  const grouped = (whole === '' ? '0' : whole).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return fraction === null ? grouped : `${grouped}.${fraction}`;
}
