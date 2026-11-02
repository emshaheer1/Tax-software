import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react';
import { cn } from './cn.ts';

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive';

const variants: Record<Variant, string> = {
  primary:
    'border border-[#f7f1e4] bg-[#efe6d4] text-[#16130e] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] hover:bg-white',
  secondary:
    'border border-[#d9c7a3]/45 bg-black/30 text-[#f6f1e6] hover:border-[#efe6d4] hover:bg-white/8',
  ghost: 'border border-transparent text-ink-muted hover:border-white/15 hover:bg-white/6 hover:text-ink',
  destructive: 'border border-transparent text-negative hover:border-negative/30 hover:bg-negative-bg',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: 'md' | 'sm';
  children: ReactNode;
  ref?: Ref<HTMLButtonElement>;
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  type = 'button',
  children,
  ref,
  ...props
}: ButtonProps) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md font-medium tracking-tight whitespace-nowrap transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50',
        size === 'md' ? 'h-8 px-3 text-[13px]' : 'h-7 px-2.5 text-xs',
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
