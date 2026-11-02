import { useEffect, useRef, useState } from 'react';
import { cn, selectClass } from './cn.ts';

export function SelectMenu<T extends string>({
  id,
  value,
  options,
  onChange,
}: {
  id: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const current = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="select-menu relative">
      <button
        id={id}
        type="button"
        className={cn(selectClass, 'text-left', open && 'rounded-b-none')}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((next) => !next)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        {current?.label}
      </button>
      {open ? (
        <ul
          role="listbox"
          aria-labelledby={id}
          className="absolute top-full right-0 left-0 z-50 overflow-hidden rounded-b-md border border-t-0 border-white/12 bg-[#0c1012]"
        >
          {options.map((option) => {
            const selected = option.value === value;
            return (
              <li key={option.value} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className="block w-full bg-transparent px-2.5 py-1.5 text-left text-[13px] text-ink hover:bg-[#1c3d3e] focus:bg-[#1c3d3e] aria-selected:bg-[#1c3d3e]"
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  onKeyDown={(event) => {
                    const items = [...(rootRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]') ?? [])];
                    const index = items.indexOf(event.currentTarget);
                    if (event.key === 'ArrowDown') {
                      event.preventDefault();
                      items[Math.min(index + 1, items.length - 1)]?.focus();
                    }
                    if (event.key === 'ArrowUp') {
                      event.preventDefault();
                      items[Math.max(index - 1, 0)]?.focus();
                    }
                  }}
                >
                  {option.label}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
