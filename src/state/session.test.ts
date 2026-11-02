import { beforeEach, describe, expect, it } from 'vitest';
import { SESSION_KEY, loadSession, signIn } from './session.ts';

beforeEach(() => {
  localStorage.clear();
});

describe('signIn', () => {
  it('accepts the admin account and rejects anything else', async () => {
    const wrong = await signIn('usama@admin.com', 'not-the-password');
    expect(wrong).toEqual({ ok: false, message: 'Email or password does not match.' });
    expect(loadSession()).toBeNull();

    const created = await signIn('Usama@Admin.com', 'usamaptp1122@');
    expect(created).toEqual({ ok: true, session: { email: 'usama@admin.com' } });
    expect(loadSession()?.email).toBe('usama@admin.com');
    expect(localStorage.getItem(SESSION_KEY)).not.toContain('usamaptp1122@');

    const other = await signIn('someone@admin.com', 'usamaptp1122@');
    expect(other.ok).toBe(false);
  });
});
