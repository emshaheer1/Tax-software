import { useEffect, useRef, useState, type FormEvent, type RefObject } from 'react';
import { Button } from '../components/Button.tsx';
import { TextField } from '../components/TextField.tsx';
import { signIn, type Session } from '../state/session.ts';

const points = [
  'Compare the current tax with up to three options.',
  'See federal tax saved, cash out, net benefit, and ROI.',
  'Print a one-page summary for the client.',
  'Plans stay on this computer.',
];

const LOADER_MS = 1800;
const WELCOME_MS = 1600;

export function SignInPage({ onSignedIn }: { onSignedIn: (session: Session) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [step, setStep] = useState<'form' | 'loading' | 'success'>('form');
  const timers = useRef<number[]>([]);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      for (const timer of timers.current) window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (step === 'success') dialogRef.current?.focus();
  }, [step]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step !== 'form') return;
    setPending(true);
    setError('');
    setStep('loading');
    const result = await signIn(email, password);
    setPending(false);
    if (!result.ok) {
      setStep('form');
      setError(result.message);
      return;
    }
    timers.current.push(
      window.setTimeout(() => setStep('success'), LOADER_MS),
      window.setTimeout(() => onSignedIn(result.session), LOADER_MS + WELCOME_MS),
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

      {step === 'loading' ? <TaxLoader /> : null}
      {step === 'success' ? <WelcomeModal dialogRef={dialogRef} /> : null}
    </div>
  );
}

function TaxLoader() {
  return (
    <div className="sign-in-stage" role="status" aria-live="polite" aria-busy="true">
      <div className="sign-mark" aria-hidden="true">
        <span className="sign-orbit" />
      </div>
      <div className="sign-in-copy">
        <p className="sign-in-caption">Preparing your planner</p>
        <p className="sign-in-caption-sub">Checking the account and lining up the return.</p>
      </div>
    </div>
  );
}

function WelcomeModal({ dialogRef }: { dialogRef: RefObject<HTMLDivElement | null> }) {
  return (
    <div className="sign-in-stage welcome-stage">
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sign-in-welcome-title"
        aria-describedby="sign-in-welcome-body"
        className="welcome-card"
      >
        <svg className="welcome-mark" viewBox="0 0 72 72" aria-hidden="true">
          <circle className="welcome-ring" cx="36" cy="36" r="28" />
          <path className="welcome-check" d="M23 37.5 32 46.5 50 26" />
        </svg>
        <p className="welcome-kicker">Premium Tax Planners</p>
        <h2 id="sign-in-welcome-title">Welcome</h2>
        <p id="sign-in-welcome-body">You are signed in. The planner is ready.</p>
      </div>
    </div>
  );
}
