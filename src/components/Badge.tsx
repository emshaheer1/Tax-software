import type { ReactNode } from 'react';

/** Navy text on the teal wash. The teal token alone is short of AA for 12px type. */
export function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex shrink-0 items-center rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold tracking-tight whitespace-nowrap text-navy-900">
      {children}
    </span>
  );
}
