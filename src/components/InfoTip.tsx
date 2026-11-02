import { Info } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';

const TIP_WIDTH = 240;

export function InfoTip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const tooltipId = useId();

  function place(target: HTMLButtonElement) {
    const rect = target.getBoundingClientRect();
    const left = Math.min(Math.max(8, rect.left), window.innerWidth - TIP_WIDTH - 8);
    const below = rect.bottom + 8;
    const estimatedHeight = 120;
    const top =
      below + estimatedHeight > window.innerHeight - 8
        ? Math.max(8, rect.top - estimatedHeight - 8)
        : below;
    setPosition({ top, left });
  }

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="inline-flex h-5 w-5 items-center justify-center rounded-full text-teal-600"
        aria-label={text}
        onMouseEnter={(event) => {
          place(event.currentTarget);
          setOpen(true);
        }}
        onMouseLeave={() => setOpen(false)}
        onFocus={(event) => {
          place(event.currentTarget);
          setOpen(true);
        }}
        onBlur={() => setOpen(false)}
      >
        <Info size={14} strokeWidth={2} aria-hidden="true" />
      </button>
      {open
        ? createPortal(
            <span
              id={tooltipId}
              role="tooltip"
              aria-hidden="true"
              style={{ top: position.top, left: position.left, width: TIP_WIDTH }}
              className="pointer-events-none fixed z-[80] rounded-lg bg-navy-900 px-3 py-2 text-left text-xs leading-relaxed font-normal text-white"
            >
              {text}
            </span>,
            document.body,
          )
        : null}
    </>
  );
}
