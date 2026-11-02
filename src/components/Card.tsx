import type { ReactNode } from 'react';
import { cn } from './cn.ts';

export function Card({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('glass rounded-xl p-3.5 sm:p-4', className)}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
