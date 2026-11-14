import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = fs.readFileSync(
  path.resolve(process.cwd(), 'supabase/migrations/20261109_superadmin_administration.sql'),
  'utf8'
);

describe('superadmin administration migration', () => {
  it('separates role, subscription plan and account status without changing product limits', () => {
    expect(migration).toContain("subscription_plan text not null default 'free'");
    expect(migration).toContain("status text not null default 'active'");
    expect(migration).toContain("p_role not in ('standard', 'superadmin')");
    expect(migration).toContain("case when v_user_role = 'superadmin' then null else 3 end");
    expect(migration).toContain("'max_widgets_per_report', 9");
  });

  it('protects the last active superadmin and self access changes transactionally', () => {
    expect(migration).toContain('protect_last_active_superadmin');
    expect(migration).toContain("pg_advisory_xact_lock(hashtextextended('sphere:last-active-superadmin'");
    expect(migration).toContain('LAST_SUPERADMIN_REQUIRED');
    expect(migration).toContain('ADMIN_SELF_ACCESS_CHANGE_FORBIDDEN');
  });

  it('keeps admin reads and mutations restricted to service_role', () => {
    expect(migration).toContain('revoke all on function public.admin_get_user_usage() from public, anon, authenticated');
    expect(migration).toContain('grant execute on function public.admin_get_user_usage() to service_role');
    expect(migration).toMatch(/revoke all on function public\.admin_set_user_access[\s\S]+from public, anon, authenticated/);
    expect(migration).toMatch(/grant execute on function public\.admin_set_user_access[\s\S]+to service_role/);
    expect(migration).toContain("if auth.role() <> 'service_role'");
  });

  it('blocks suspended accounts even when an old authenticated JWT remains open', () => {
    expect(migration).toContain('enforce_active_account_request');
    expect(migration).toContain("alter role authenticator set pgrst.db_pre_request = 'public.enforce_active_account_request'");
    expect(migration).toContain('ACCOUNT_SUSPENDED');
    expect(migration).toContain('create policy sphere_active_account_storage_guard');
    expect(migration).toContain('as restrictive');
    expect(migration).toContain('using (public.is_current_account_active())');
  });

  it('records administrative actions without granting direct authenticated access', () => {
    expect(migration).toContain('create table if not exists public.admin_audit_log');
    expect(migration).toContain('alter table public.admin_audit_log enable row level security');
    expect(migration).toContain('revoke all on table public.admin_audit_log from public, anon, authenticated');
  });
});
