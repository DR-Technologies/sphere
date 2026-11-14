import { beforeEach, describe, expect, it, vi } from 'vitest';

const auth = vi.hoisted(() => ({
  signInWithOtp: vi.fn(),
  verifyOtp: vi.fn(),
  signOut: vi.fn()
}));

vi.mock('server-only', () => ({}));
vi.mock('@supabase/supabase-js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@supabase/supabase-js')>();
  return {
    ...actual,
    createClient: vi.fn(() => ({ auth }))
  };
});
vi.mock('@/lib/story/exportStore', () => ({ deleteExportJobFiles: vi.fn() }));
vi.mock('@/lib/billing/stripeServer', () => ({
  getStripeClient: vi.fn(() => ({ subscriptions: { retrieve: vi.fn(), cancel: vi.fn() } }))
}));

import {
  accountDeletionResumePlan,
  needsStorageInventory,
  requestAccountDeletionVerification,
  verifyRecentAuthentication
} from './deletionServer';

const user = {
  id: 'owner-id',
  email: 'owner@example.test'
} as Parameters<typeof verifyRecentAuthentication>[0];

describe('account deletion reauthentication', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
    auth.signInWithOtp.mockResolvedValue({ error: null });
    auth.signOut.mockResolvedValue({ error: null });
  });

  it('requests a non-signup OTP for the authenticated email', async () => {
    await requestAccountDeletionVerification(user);
    expect(auth.signInWithOtp).toHaveBeenCalledWith({
      email: user.email,
      options: { shouldCreateUser: false }
    });
  });

  it('rejects an arbitrary or incorrect code', async () => {
    auth.verifyOtp.mockResolvedValue({ data: { user: null, session: null }, error: new Error('invalid token') });
    await expect(verifyRecentAuthentication(user, '123456'))
      .rejects.toMatchObject({ code: 'RECENT_AUTHENTICATION_REQUIRED', status: 401 });
  });

  it('rejects a valid OTP belonging to a different account and revokes its temporary session', async () => {
    auth.verifyOtp.mockResolvedValue({
      data: { user: { id: 'other-user' }, session: { user: { id: 'other-user' } } },
      error: null
    });
    await expect(verifyRecentAuthentication(user, '123456'))
      .rejects.toMatchObject({ code: 'RECENT_AUTHENTICATION_REQUIRED' });
    expect(auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
  });

  it('accepts only an OTP for the same account and revokes the temporary session', async () => {
    auth.verifyOtp.mockResolvedValue({
      data: { user: { id: user.id }, session: { user: { id: user.id } } },
      error: null
    });
    await expect(verifyRecentAuthentication(user, '123456')).resolves.toBeUndefined();
    expect(auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
  });
});

describe('account deletion stage recovery', () => {
  it('builds inventory once, then reuses it after database or Storage progress', () => {
    expect(needsStorageInventory({ resources: {} })).toBe(true);
    expect(needsStorageInventory({ resources: { storage_paths: [] } })).toBe(false);
    expect(needsStorageInventory({ storage_cleaned_at: new Date().toISOString(), resources: {} })).toBe(false);
  });

  it('resumes from each persisted checkpoint without repeating completed destructive stages', () => {
    const timestamp = '2026-11-11T12:00:00.000Z';
    expect(accountDeletionResumePlan({ resources: {} })).toEqual({
      inventory: true, database: true, storage: true, auth: true
    });
    expect(accountDeletionResumePlan({ resources: { storage_paths: ['owner/file'] } })).toEqual({
      inventory: false, database: true, storage: true, auth: true
    });
    expect(accountDeletionResumePlan({
      resources: { storage_paths: ['owner/file'] }, database_cleaned_at: timestamp
    })).toEqual({ inventory: false, database: false, storage: true, auth: true });
    expect(accountDeletionResumePlan({
      resources: { storage_paths: ['owner/file'] }, database_cleaned_at: timestamp, storage_cleaned_at: timestamp
    })).toEqual({ inventory: false, database: false, storage: false, auth: true });
    expect(accountDeletionResumePlan({
      resources: { storage_paths: ['owner/file'] }, database_cleaned_at: timestamp,
      storage_cleaned_at: timestamp, auth_deleted_at: timestamp
    })).toEqual({ inventory: false, database: false, storage: false, auth: false });
  });
});
