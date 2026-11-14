import { describe, expect, it } from 'vitest';
import { isMissingPostgrestFunction } from './supabaseCompatibility';

describe('Supabase compatibility', () => {
  it('allows a pre-migration fallback only when the public RPC is unavailable', () => {
    expect(isMissingPostgrestFunction({
      code: 'PGRST202',
      message: 'Could not find the function public.get_public_report_snapshot'
    }, 'get_public_report_snapshot')).toBe(true);
    expect(isMissingPostgrestFunction({
      code: '42883',
      message: 'function public.get_public_story_snapshot(text) does not exist'
    }, 'get_public_story_snapshot')).toBe(true);
  });

  it('does not fall back after permission or runtime failures', () => {
    expect(isMissingPostgrestFunction({
      code: '42501',
      message: 'permission denied for table public_report_snapshots'
    }, 'get_public_report_snapshot')).toBe(false);
    expect(isMissingPostgrestFunction({
      code: 'PGRST301',
      message: 'JWT expired'
    }, 'get_public_report_snapshot')).toBe(false);
  });
});
