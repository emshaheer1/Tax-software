import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn, fieldClass } from './cn.ts';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'] as const;

function parseIso(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return new Date();
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function toIso(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function monthDays(view: Date): Date[] {
  const first = new Date(view.getFullYear(), view.getMonth(), 1);
  const start = new Date(first);
  start.setDate(1 - first.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
}

export function DateField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const selected = useMemo(() => parseIso(value), [value]);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => new Date(selected.getFullYear(), selected.getMonth(), 1));
  const [box, setBox] = useState<{ top: number; left: number; width: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const today = new Date();

  useEffect(() => {
    if (!open) return;
    function place() {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      setBox({ top: rect.bottom + 4, left: rect.left, width: Math.min(rect.width, 292) });
    }
    function onPointer(event: MouseEvent) {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || popRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    place();
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open]);

  const days = monthDays(view);
  const shown = selected.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const monthLabel = view.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  function pick(day: Date) {
    onChange(toIso(day));
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative">
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-ink-muted">
        {label}
      </label>
      <button
        id={id}
        ref={buttonRef}
        type="button"
        className={cn(fieldClass, 'date-field relative pr-8 text-left')}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          setView(new Date(selected.getFullYear(), selected.getMonth(), 1));
          setOpen((next) => !next);
        }}
      >
        {shown}
        <Calendar
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-2.5 h-3.5 w-3.5 -translate-y-1/2 text-[#7dcea8]"
        />
      </button>
      {open && box
        ? createPortal(
        <div
          ref={popRef}
          role="dialog"
          aria-label={monthLabel}
          className="date-pop rounded-md border border-white/12 bg-[#0c1012] p-2.5"
          style={{ position: 'fixed', top: box.top, left: box.left, width: box.width, zIndex: 80 }}
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <button
              type="button"
              aria-label="Previous month"
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-ink-muted hover:bg-[#1c3d3e] hover:text-ink"
              onClick={() => setView((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
            >
              <ChevronLeft size={16} aria-hidden="true" />
            </button>
            <p className="text-sm font-semibold text-ink">{monthLabel}</p>
            <button
              type="button"
              aria-label="Next month"
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-ink-muted hover:bg-[#1c3d3e] hover:text-ink"
              onClick={() => setView((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
            >
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          </div>
          <div className="grid grid-cols-7 text-center">
            {WEEKDAYS.map((day) => (
              <div key={day} className="py-1 text-[10px] font-medium tracking-[0.08em] text-ink-muted uppercase">
                {day}
              </div>
            ))}
            {days.map((day) => {
              const inMonth = day.getMonth() === view.getMonth();
              const isSelected = sameDay(day, selected);
              const isToday = sameDay(day, today);
              return (
                <button
                  key={toIso(day)}
                  type="button"
                  aria-pressed={isSelected}
                  className={cn(
                    'mx-auto my-0.5 flex h-8 w-8 items-center justify-center rounded-md border text-[13px]',
                    isSelected
                      ? 'border-[#3d8a86] bg-[#1c3d3e] font-semibold text-ink'
                      : inMonth
                        ? 'border-transparent text-ink hover:border-[#3d8a86] hover:bg-[#1c3d3e]'
                        : 'border-transparent text-[#c5ced8]/45 hover:border-[#3d8a86]/70 hover:bg-[#1c3d3e]',
                    isToday && !isSelected && 'border-[#1c3d3e]',
                  )}
                  onClick={() => pick(day)}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>
          <div className="mt-1.5 flex justify-end border-t border-white/10 pt-1.5">
            <button
              type="button"
              className="rounded-md px-2 py-1 text-xs font-medium text-[#7dcea8] hover:bg-[#1c3d3e] hover:text-ink"
              onClick={() => pick(today)}
            >
              Today
            </button>
          </div>
        </div>,
          document.body,
        )
        : null}
    </div>
  );
}
