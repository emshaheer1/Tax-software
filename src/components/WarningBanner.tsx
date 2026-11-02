import { AlertTriangle } from 'lucide-react';

export function WarningBanner({ messages }: { messages: string[] }) {
  if (messages.length === 0) return null;
  return (
    <div className="rounded-[10px] border border-warning/20 bg-warning-bg px-4 py-3 text-sm text-warning" role="status">
      <div className="flex gap-2">
        <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
        <ul className="space-y-1">
          {messages.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
