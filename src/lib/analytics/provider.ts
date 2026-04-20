import type { AnalyticsProvider } from './types';
import { supabaseAnalyticsProvider } from './providers/supabaseProvider';

let analyticsProvider: AnalyticsProvider = supabaseAnalyticsProvider;

export function getAnalyticsProvider() {
  return analyticsProvider;
}

export function setAnalyticsProvider(provider: AnalyticsProvider) {
  analyticsProvider = provider;
}

