export const SESSION_KEY = 'ptc.session.v1';

const ADMIN_EMAIL = 'usama@admin.com';
const ADMIN_PASSWORD_HASH = 'c48a49b5c3233467a99894c1e8b03e0514716553d8004c5af0e7042c882f78f2';

export interface Session {
  email: string;
}

function memory(): Storage | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage;
  } catch {
    return null;
  }
}

function readJson(key: string): unknown {
  try {
    const raw = memory()?.getItem(key);
    if (raw == null || raw === '') return undefined;
    return JSON.parse(raw) as unknown;
  } catch {
    return undefined;
  }
}

function isSession(value: unknown): value is Session {
  if (!value || typeof value !== 'object') return false;
  return (value as Record<string, unknown>).email === ADMIN_EMAIL;
}

export function loadSession(): Session | null {
  const value = readJson(SESSION_KEY);
  return isSession(value) ? { email: ADMIN_EMAIL } : null;
}

export function clearSession(): void {
  memory()?.removeItem(SESSION_KEY);
}

export async function passwordHash(email: string, password: string): Promise<string> {
  const bytes = new TextEncoder().encode(`${email.trim().toLowerCase()}::${password}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function signIn(
  email: string,
  password: string,
): Promise<{ ok: true; session: Session } | { ok: false; message: string }> {
  const normalized = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return { ok: false, message: 'Enter a valid email address.' };
  }
  if (password.length < 6) {
    return { ok: false, message: 'Password must be at least 6 characters.' };
  }

  const hash = await passwordHash(normalized, password);
  const store = memory();
  if (!store) return { ok: false, message: 'This browser cannot store a sign-in.' };
  if (normalized !== ADMIN_EMAIL || hash !== ADMIN_PASSWORD_HASH) {
    return { ok: false, message: 'Email or password does not match.' };
  }

  const session: Session = { email: ADMIN_EMAIL };
  store.setItem(SESSION_KEY, JSON.stringify(session));
  return { ok: true, session };
}
