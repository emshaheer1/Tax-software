import { useEffect, useState } from 'react';
import { AppHeader, type RouteId } from './components/AppHeader.tsx';
import { ToastProvider } from './components/Toast.tsx';
import { PlannerPage } from './pages/PlannerPage.tsx';
import { ReportPage } from './pages/ReportPage.tsx';
import { SavedPlansPage } from './pages/SavedPlansPage.tsx';
import { SettingsPage } from './pages/SettingsPage.tsx';
import { SignInPage } from './pages/SignInPage.tsx';
import { WorkflowPage } from './pages/WorkflowPage.tsx';
import { PlansProvider } from './state/plans-context.tsx';
import { clearSession, loadSession, type Session } from './state/session.ts';
import { SettingsProvider } from './state/settings-context.tsx';

function parseRoute(hash: string): RouteId {
  if (hash.startsWith('#/workflow')) return 'workflow';
  if (hash.startsWith('#/saved')) return 'saved';
  if (hash.startsWith('#/settings')) return 'settings';
  if (hash.startsWith('#/report')) return 'report';
  return 'planner';
}

const titles: Record<RouteId, string> = {
  planner: 'Planner · Tax Planning Calculator',
  workflow: 'Workflow · Tax Planning Calculator',
  saved: 'Saved plans · Tax Planning Calculator',
  settings: 'Settings · Tax Planning Calculator',
  report: 'Tax Planning Summary · Tax Planning Calculator',
};

function Shell() {
  const [session, setSession] = useState<Session | null>(() => loadSession());
  const [route, setRoute] = useState<RouteId>(() => parseRoute(window.location.hash));

  useEffect(() => {
    const onHash = () => setRoute(parseRoute(window.location.hash));
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    if (!session) {
      document.title = 'Sign in · Tax software';
      return;
    }
    const hash = window.location.hash;
    if (!hash || hash.startsWith('#/signin')) window.location.hash = '#/planner';
    document.title = titles[route];
  }, [session, route]);

  if (!session) {
    return (
      <div className="min-h-screen bg-black text-ink">
        <SignInPage
          onSignedIn={(next) => {
            setSession(next);
            window.location.hash = '#/planner';
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-ink">
      <div className="no-print pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-40 left-[6%] h-[34rem] w-[34rem] rounded-full bg-[#e4d2a8]/30 blur-3xl" />
        <div className="absolute top-1/4 -right-24 h-[36rem] w-[36rem] rounded-full bg-[#149a9c]/28 blur-3xl" />
        <div className="absolute -bottom-32 left-1/4 h-[28rem] w-[40rem] rounded-full bg-[#163a66]/55 blur-3xl" />
      </div>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <div className="no-print">
        <AppHeader
          route={route}
          email={session.email}
          onSignOut={() => {
            clearSession();
            setSession(null);
            window.location.hash = '#/signin';
          }}
        />
      </div>
      <main id="main">
        {route === 'planner' ? <PlannerPage /> : null}
        {route === 'workflow' ? <WorkflowPage /> : null}
        {route === 'saved' ? <SavedPlansPage /> : null}
        {route === 'settings' ? <SettingsPage /> : null}
        {route === 'report' ? <ReportPage /> : null}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <SettingsProvider>
      <PlansProvider>
        <ToastProvider>
          <Shell />
        </ToastProvider>
      </PlansProvider>
    </SettingsProvider>
  );
}
