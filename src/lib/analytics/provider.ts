import type { AnalyticsProvider } from './types';
import { duckDbAnalyticsProvider } from './providers/duckdbProvider';
import { supabaseAnalyticsProvider } from './providers/supabaseProvider';

const providerName = process.env.NEXT_PUBLIC_ANALYTICS_PROVIDER || 'supabase';

let analyticsProvider: AnalyticsProvider =
  providerName === 'duckdb' ? duckDbAnalyticsProvider : supabaseAnalyticsProvider;

export function getAnalyticsProvider() {
  return analyticsProvider;
}

export function setAnalyticsProvider(provider: AnalyticsProvider) {
  analyticsProvider = provider;
}
