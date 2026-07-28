import { describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import { supabaseAnalyticsProvider } from '@/lib/analytics/providers/supabaseProvider';
import { buildQuickResultRecommendation } from '@/lib/quickResult/recommendation';

const fixturesDir = path.resolve(process.cwd(), 'tests/fixtures');

async function loadFixture(name: string) {
  const content = await fs.readFile(path.join(fixturesDir, name));
  return new File([content], name, { type: 'text/csv' });
}

describe('acceptance datasets', () => {
  it('Dataset A detects datetime, dimension and measure roles', async () => {
    const file = await loadFixture('dataset-a-simple.csv');
    const profile = await supabaseAnalyticsProvider.profileFile(file, { dateFormat: 'DD/MM/YYYY' });
    const recommendation = buildQuickResultRecommendation({ name: file.name, columns: profile.columns, stats: profile.stats });

    expect(profile.columns.find((column) => column.name === 'Fecha')?.semanticRole).toBe('datetime');
    expect(profile.columns.find((column) => column.name === 'Categoria')?.semanticRole).toBe('dimension');
    expect(['measure', 'currency']).toContain(profile.columns.find((column) => column.name === 'Metrica')?.semanticRole);
    expect(recommendation.widgets.some((widget) => widget.type === 'line')).toBe(true);
    expect(recommendation.widgets.some((widget) => widget.type === 'bar')).toBe(true);
  });

  it('Dataset B detects identifiers, percentages and currencies', async () => {
    const file = await loadFixture('dataset-b-empresarial.csv');
    const profile = await supabaseAnalyticsProvider.profileFile(file, { dateFormat: 'DD/MM/YYYY' });
    const recommendation = buildQuickResultRecommendation({ name: file.name, columns: profile.columns, stats: profile.stats });

    expect(profile.columns.find((column) => column.name === 'Order ID')?.semanticRole).toBe('identifier');
    expect(profile.columns.find((column) => column.name === 'Booking Date')?.semanticRole).toBe('datetime');
    expect(profile.columns.find((column) => column.name === 'Revenue %')?.semanticRole).toBe('percentage');
    expect(profile.columns.find((column) => column.name === 'Revenue Amount')?.semanticRole).toBe('currency');
    expect(recommendation.widgets.length).toBeGreaterThanOrEqual(4);
  });

  it('Dataset C yields multiple chart-friendly recommendations', async () => {
    const file = await loadFixture('dataset-c-visual.csv');
    const profile = await supabaseAnalyticsProvider.profileFile(file);
    const recommendation = buildQuickResultRecommendation({ name: file.name, columns: profile.columns, stats: profile.stats });

    expect(profile.columns.find((column) => column.name === 'Month')?.semanticRole).toBe('datetime');
    expect(profile.columns.find((column) => column.name === 'Channel')?.semanticRole).toBe('dimension');
    expect(recommendation.widgets.some((widget) => widget.type === 'card')).toBe(true);
    expect(recommendation.widgets.some((widget) => widget.type === 'line')).toBe(true);
    expect(recommendation.widgets.some((widget) => widget.type === 'treemap' || widget.type === 'pie')).toBe(true);
  });
});
