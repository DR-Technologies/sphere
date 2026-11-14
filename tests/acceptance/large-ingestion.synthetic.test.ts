import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { supabaseAnalyticsProvider } from '@/lib/analytics/providers/supabaseProvider';
import { buildQuickResultRecommendation } from '@/lib/quickResult/recommendation';

const runLargeAcceptance = process.env.SPHERE_RUN_LARGE_INGESTION === '1';

function rowAt(index: number) {
  return {
    Fecha: new Date(Date.UTC(2024 + Math.floor(index / 365), index % 12, (index % 28) + 1)),
    Categoria: `Categoria ${index % 17}`,
    Region: `Region ${index % 8}`,
    Ventas: Number((index * 1.25 + 10).toFixed(2)),
    Unidades: index % 10_000,
    Activo: index % 2 === 0,
    Porcentaje: Number(((index % 100) / 100).toFixed(2)),
    Identificador: `ID-${index}`,
    TextoMixto: index % 5 === 0 ? String(index) : `valor-${index % 23}`,
    VacioParcial: index % 11 === 0 ? null : `dato-${index % 31}`,
    MetricaB: index * 2,
    MetricaC: index % 97
  };
}

function makeWorkbookFile(rowCount: number) {
  const workbook = XLSX.utils.book_new();
  const headers = Object.keys(rowAt(0));
  const worksheet = XLSX.utils.aoa_to_sheet([headers]);
  const chunkSize = 5_000;
  for (let start = 0; start < rowCount; start += chunkSize) {
    const rows = Array.from({ length: Math.min(chunkSize, rowCount - start) }, (_, offset) => rowAt(start + offset));
    XLSX.utils.sheet_add_json(worksheet, rows, { header: headers, skipHeader: true, origin: -1 });
  }
  XLSX.utils.book_append_sheet(workbook, worksheet, '_datos');
  const content = XLSX.write(workbook, { type: 'array', bookType: 'xlsx', compression: true });
  return new File([content], `synthetic-${rowCount}.xlsx`, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
}

function makeWideWorkbookFile(rowCount: number, columnCount: number) {
  const headers = Array.from({ length: columnCount }, (_, index) => `Columna_${index + 1}`);
  const worksheet = XLSX.utils.aoa_to_sheet([headers]);
  const chunkSize = 1_000;
  for (let start = 0; start < rowCount; start += chunkSize) {
    const rows = Array.from({ length: Math.min(chunkSize, rowCount - start) }, (_, offset) => {
      const rowIndex = start + offset;
      return headers.map((_, columnIndex) => {
        if (columnIndex % 4 === 0) return new Date(Date.UTC(2025, rowIndex % 12, (rowIndex % 28) + 1));
        if (columnIndex % 4 === 1) return rowIndex * (columnIndex + 1);
        if (columnIndex % 4 === 2) return `categoria-${rowIndex % 19}`;
        return rowIndex % 7 === 0 ? null : `mixto-${columnIndex}-${rowIndex}`;
      });
    });
    XLSX.utils.sheet_add_aoa(worksheet, rows, { origin: -1 });
  }
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '_datos');
  return new File([XLSX.write(workbook, { type: 'array', bookType: 'xlsx', compression: true })], 'synthetic-wide.xlsx');
}

describe.skipIf(!runLargeAcceptance)('synthetic large-file ingestion', () => {
  it.each([10_000, 100_000, 250_000])('preserves all %i XLSX rows and produces Instant Wow', async (rowCount) => {
    const beforeRss = process.memoryUsage().rss;
    const startedAt = performance.now();
    const profile = await supabaseAnalyticsProvider.profileFile(makeWorkbookFile(rowCount), { sheetName: '_datos' });
    const durationMs = performance.now() - startedAt;
    const rows = profile.artifacts?.normalizedRows || [];

    expect(rows).toHaveLength(rowCount);
    expect(profile.stats.every((stat) => stat.total === rowCount)).toBe(true);
    expect(rows[0]?.Identificador).toBe('ID-0');
    expect(rows[Math.floor(rowCount / 2)]?.Identificador).toBe(`ID-${Math.floor(rowCount / 2)}`);
    expect(rows[rowCount - 1]?.Identificador).toBe(`ID-${rowCount - 1}`);
    expect(rows[rowCount - 1]?.Ventas).toBe(rowAt(rowCount - 1).Ventas);
    expect(profile.columns.find((column) => column.name === 'Fecha')?.type).toBe('DATE');
    expect(profile.columns.find((column) => column.name === 'Ventas')?.type).toBe('DOUBLE');

    const recommendation = buildQuickResultRecommendation({
      name: `synthetic-${rowCount}.xlsx`,
      columns: profile.columns,
      stats: profile.stats
    });
    expect(recommendation.widgets.length).toBeGreaterThan(0);
    expect(recommendation.widgets.some((widget) => widget.type === 'card')).toBe(true);

    console.info(JSON.stringify({
      format: 'xlsx',
      rowCount,
      durationMs: Math.round(durationMs),
      rssDeltaBytes: process.memoryUsage().rss - beforeRss
    }));
  }, 180_000);

  it.each(['csv', 'json'] as const)('preserves mixed values from a large %s file', async (format) => {
    const rowCount = 100_000;
    const rows = Array.from({ length: rowCount }, (_, index) => rowAt(index));
    const content = format === 'csv' ? XLSX.utils.sheet_to_csv(XLSX.utils.json_to_sheet(rows)) : JSON.stringify(rows);
    const file = new File([content], `synthetic.${format}`, { type: format === 'csv' ? 'text/csv' : 'application/json' });
    const profile = await supabaseAnalyticsProvider.profileFile(file);

    expect(profile.artifacts?.normalizedRows).toHaveLength(rowCount);
    expect(profile.artifacts?.normalizedRows[rowCount - 1]?.Identificador).toBe(`ID-${rowCount - 1}`);
    expect(profile.stats.every((stat) => stat.total === rowCount)).toBe(true);
  }, 120_000);

  it('profiles a wide mixed workbook without dropping columns', async () => {
    const profile = await supabaseAnalyticsProvider.profileFile(makeWideWorkbookFile(10_000, 80), { sheetName: '_datos' });

    expect(profile.columns).toHaveLength(80);
    expect(profile.artifacts?.normalizedRows).toHaveLength(10_000);
    expect(profile.stats.every((stat) => stat.total === 10_000)).toBe(true);
    expect(profile.columns.filter((column) => column.type === 'DATE').length).toBe(20);
  }, 120_000);
});
