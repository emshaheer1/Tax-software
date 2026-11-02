import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Button } from '../components/Button.tsx';
import { TextField } from '../components/TextField.tsx';
import { signIn, type Session } from '../state/session.ts';

const points = [
  'Compare the current tax with up to three options.',
  'See federal tax saved, cash out, net benefit, and ROI.',
  'Print a one-page summary for the client.',
  'Plans stay on this computer.',
];

export function SignInPage({ onSignedIn }: { onSignedIn: (session: Session) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [step, setStep] = useState<'form' | 'loading' | 'success'>('form');
  const timers = useRef<number[]>([]);

  useEffect(() => {
    return () => {
      for (const timer of timers.current) window.clearTimeout(timer);
    };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step !== 'form') return;
    setPending(true);
    setError('');
    const result = await signIn(email, password);
    setPending(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setStep('loading');
    timers.current.push(
      window.setTimeout(() => setStep('success'), 900),
      window.setTimeout(() => onSignedIn(result.session), 2400),
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-10">
      <div className="no-print pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-24 left-[8%] h-72 w-72 rounded-full bg-[#d9c7a3]/16 blur-3xl" />
        <div className="absolute right-[6%] bottom-0 h-80 w-80 rounded-full bg-[#0f8b8d]/18 blur-3xl" />
        <div className="absolute top-1/3 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-[#13315c]/40 blur-3xl" />
      </div>

      <div className="glass relative grid w-full max-w-5xl overflow-hidden rounded-2xl lg:min-h-[580px] lg:grid-cols-2">
        <section className="relative flex flex-col justify-between gap-10 border-b border-white/10 p-8 sm:p-10 lg:border-r lg:border-b-0">
          <div>
            <img src="/pta-logo.png" alt="" className="h-14 w-auto" />
            <p className="mt-8 text-sm text-ink-muted">Premium Tax Planners Inc.</p>
            <h1 className="mt-2 text-4xl">Tax software</h1>
            <ul className="mt-8 space-y-3">
              {points.map((point) => (
                <li key={point} className="flex gap-3 text-sm leading-relaxed text-ink-muted">
                  <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#d9c7a3]" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
          <p className="text-[11px] leading-relaxed text-white/45">
            © {new Date().getFullYear()} Premium Tax Planners Inc. All rights reserved.
          </p>
        </section>

        <section className="flex flex-col justify-center p-8 sm:p-10">
          <h2 className="text-2xl">Sign in</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">
            Use your email and password to open the planner.
          </p>
          <form className="mt-8 space-y-4" onSubmit={(event) => void submit(event)}>
            <TextField
              id="sign-in-email"
              label="Email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={setEmail}
            />
            <TextField
              id="sign-in-password"
              label="Password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={setPassword}
            />
            {error ? (
              <p role="alert" className="text-sm text-negative">
                {error}
              </p>
            ) : null}
            <Button type="submit" className="w-full" disabled={pending || step !== 'form'}>
              {pending ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
          <p className="mt-4 text-xs leading-relaxed text-ink-muted">
            Sign in with the account for this software. The session stays in this browser.
          </p>
        </section>
      </div>

      {step === 'loading' ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black" role="status" aria-live="polite">
          <div className="sign-in-spin" />
          <span className="sr-only">Signing in</span>
        </div>
      ) : null}

      {step === 'success' ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black px-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="sign-in-success-title"
            className="w-full max-w-xs rounded-xl border border-white/12 bg-[#0c1012] px-6 py-8 text-center"
          >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[#3d8a86] bg-[#1c3d3e]">
              <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" aria-hidden="true">
                <path
                  d="M5 12.5 9.2 17 19 7"
                  stroke="#7dcea8"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h2 id="sign-in-success-title" className="mt-4 text-lg">
              Signed in
            </h2>
            <p className="mt-1 text-sm text-ink-muted">Opening the planner.</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
