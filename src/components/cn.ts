export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

export const fieldClass =
  'h-8 w-full rounded-md border border-white/12 bg-field px-2.5 text-[13px] text-ink shadow-[inset_0_1px_2px_rgba(0,0,0,0.45)]';

export const selectClass = cn(fieldClass, 'select-field');
