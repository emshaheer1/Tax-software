import { CircleUser } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { Button } from './Button.tsx';
import { cn } from './cn.ts';

export type RouteId = 'planner' | 'workflow' | 'saved' | 'settings' | 'report';

const tabs: Array<{ id: RouteId; href: string; label: string }> = [
  { id: 'planner', href: '#/planner', label: 'Planner' },
  { id: 'workflow', href: '#/workflow', label: 'Workflow' },
  { id: 'saved', href: '#/saved', label: 'Saved plans' },
  { id: 'settings', href: '#/settings', label: 'Settings' },
];

export function AppHeader({
  route,
  email,
  onSignOut,
}: {
  route: RouteId;
  email: string;
  onSignOut: () => void;
}) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    const onPointer = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onPointer);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onPointer);
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-30 border-b border-white/12 bg-black/80 text-ink backdrop-blur-xl">
      <div className="flex h-14 items-center justify-between gap-3 px-4 sm:px-5">
        <a href="#/planner" className="flex min-w-0 items-center gap-2.5">
          <img src="/pta-logo.png" alt="" className="h-8 w-auto shrink-0" />
          <span className="min-w-0">
            <span className="block truncate text-[13px] leading-tight font-semibold">
              Premium Tax Planners Inc.
            </span>
            <span className="block text-[11px] font-medium text-white/55">Tax software</span>
          </span>
        </a>
        <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
          {tabs.map((tab) => {
            const current = route === tab.id;
            return (
              <a
                key={tab.id}
                href={tab.href}
                aria-current={current ? 'page' : undefined}
                className={cn(
                  'rounded-lg px-3 py-2 text-sm font-medium text-white/75 transition-colors duration-150 hover:bg-white/10 hover:text-white',
                  current && 'bg-white/10 text-white',
                )}
              >
                {tab.label}
              </a>
            );
          })}
        </nav>
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-white/5 text-ink hover:bg-white/10"
            aria-label="Account"
            aria-haspopup="dialog"
            aria-expanded={open}
            onClick={() => setOpen((current) => !current)}
          >
            <CircleUser size={16} aria-hidden="true" />
          </button>
          {open ? (
            <div
              role="dialog"
              aria-labelledby={titleId}
              className="absolute top-10 right-0 z-50 w-56 rounded-xl border border-white/25 bg-[#222831] p-3.5 text-ink shadow-[0_18px_48px_rgba(0,0,0,0.72)]"
            >
              <p id={titleId} className="text-sm font-semibold text-ink">
                Usama
              </p>
              <p className="mt-1 truncate text-xs text-ink-muted" title={email}>
                {email}
              </p>
              <Button className="mt-3 w-full" onClick={onSignOut}>
                Sign out
              </Button>
            </div>
          ) : null}
        </div>
      </div>
      <nav aria-label="Sections" className="flex gap-1 overflow-x-auto border-t border-white/10 px-3 py-2 md:hidden">
        {tabs.map((tab) => {
          const current = route === tab.id;
          return (
            <a
              key={tab.id}
              href={tab.href}
              aria-current={current ? 'page' : undefined}
              className={cn(
                'shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium text-white/75',
                current && 'bg-white/10 text-white',
              )}
            >
              {tab.label}
            </a>
          );
        })}
      </nav>
    </header>
  );
}
