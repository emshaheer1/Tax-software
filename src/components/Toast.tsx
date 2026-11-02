import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

interface ToastItem {
  id: string;
  message: string;
}

const ToastContext = createContext<(message: string) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const push = useCallback((message: string) => {
    const id = crypto.randomUUID();
    setToasts((current) => [...current, { id, message }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id));
    }, 3800);
  }, []);

  const value = useMemo(() => push, [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="no-print pointer-events-none fixed inset-x-0 bottom-4 z-40 flex flex-col items-center gap-2 px-4" aria-live="polite">
        {toasts.map((toast) => (
          <p
            key={toast.id}
            role="status"
            className="glass pointer-events-auto rounded-lg px-4 py-2 text-sm text-ink"
          >
            {toast.message}
          </p>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): (message: string) => void {
  return useContext(ToastContext);
}
