import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = fs.readFileSync(path.resolve('supabase/migrations/20261110_account_self_service.sql'), 'utf8');

describe('account self-service migration', () => {
  it('derives DROP targets from the dataset id and validates all metadata first', () => {
    expect(migration).toContain('assert_account_dataset_tables');
    expect(migration).toContain('public.normalized_dataset_table_name(dataset_record.id)');
    expect(migration).toContain('dataset_record.normalized_table_name <> expected_table_name');
    expect(migration).toContain('DATASET_TABLE_METADATA_MISSING');
    expect(migration).toContain('DATASET_TABLE_REFERENCE_CONFLICT');
    expect(migration).toContain('perform public.assert_account_dataset_tables(p_user_id)');
    expect(migration).not.toContain("dataset_record.normalized_table_name ~ '^dataset_[0-9a-f_]+$'");
    expect(migration).not.toContain("format('drop table if exists public.%I', dataset_record.normalized_table_name)");
  });

  it('uses recoverable fenced webhook leases and rejects event identity changes', () => {
    expect(migration).toContain('lease_expires_at');
    expect(migration).toContain('claim_token uuid');
    expect(migration).toContain("'stale_recovery'");
    expect(migration).toContain('STRIPE_EVENT_IDENTITY_MISMATCH');
    expect(migration).toContain('event_record.lease_expires_at > now_at');
  });

  it('applies subscription and invoice state in event order transactionally', () => {
    expect(migration).toContain('apply_stripe_subscription_state');
    expect(migration).toContain('p_event_created_at < existing_record.stripe_event_created_at');
    expect(migration).toContain('STRIPE_CUSTOMER_OWNERSHIP_MISMATCH');
    expect(migration).toContain('latest_invoice_event_created_at');
  });

  it('keeps audit actors required and does not override recorded Stripe subscriptions', () => {
    expect(migration).not.toContain('alter column actor_user_id drop not null');
    expect(migration).toContain('billing.stripe_subscription_id is not null');
    expect(migration).toContain('and not exists');
  });

  it('keeps every privileged helper service-role only', () => {
    expect(migration).toContain("auth.role() <> 'service_role'");
    expect(migration).toContain('revoke all on function public.assert_account_dataset_tables');
    expect(migration).toContain('revoke all on function public.apply_stripe_subscription_state');
    expect(migration).toContain('revoke all on function public.delete_account_product_data');
  });
});
