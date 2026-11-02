import type { InputHTMLAttributes } from 'react';
import { cn, fieldClass } from './cn.ts';

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label: string;
  onChange: (value: string) => void;
  hint?: string;
}

export function TextField({ id, label, value, onChange, hint, className, ...props }: TextFieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-ink-muted">
        {label}
      </label>
      <input
        id={id}
        className={cn(fieldClass, className)}
        value={value}
        aria-describedby={hintId}
        onChange={(event) => onChange(event.target.value)}
        {...props}
      />
      {hint ? (
        <p id={hintId} className="mt-1.5 text-xs text-ink-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
