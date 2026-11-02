import { useState } from 'react';
import { formatMoneyTyping, parseMoney } from '../engine/format.ts';
import { fieldClass } from './cn.ts';

interface MoneyInputProps {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  hint?: string;
}

export function MoneyInput({ id, label, value, onChange, hint }: MoneyInputProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const hintId = hint ? `${id}-hint` : undefined;
  const shown = draft ?? (value === 0 ? '' : formatMoneyTyping(String(value)));

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
        <input
          id={id}
          className={`${fieldClass} pr-3 pl-7 tabular-nums`}
          inputMode="decimal"
          autoComplete="off"
          placeholder="0"
          value={shown}
          aria-describedby={hintId}
          onFocus={() => setDraft(value === 0 ? '' : formatMoneyTyping(String(value)))}
          onChange={(event) => {
            const next = formatMoneyTyping(event.target.value);
            setDraft(next);
            onChange(parseMoney(next));
          }}
          onBlur={() => setDraft(null)}
        />
      </div>
      {hint ? (
        <p id={hintId} className="mt-1.5 text-xs leading-relaxed text-ink-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
