import { describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import { supabaseAnalyticsProvider } from '@/lib/analytics/providers/supabaseProvider';
import { uploadPartitionedNormalizedArtifact } from '@/lib/datasetArtifacts';
import { buildQuickResultRecommendation } from '@/lib/quickResult/recommendation';
import { buildWidgetQueryModel } from '@/lib/analytics/queryModel';
import { buildWidgetSql } from '@/lib/analytics/queryService';

const fixturePath = process.env.SPHERE_LARGE_XLSX_FIXTURE;

describe.skipIf(!fixturePath)('external large XLSX ingestion', () => {
  it('profiles the selected sheet without losing rows', async () => {
    const startedAt = performance.now();
    const content = await fs.readFile(path.resolve(fixturePath!));
    const file = new File([content], path.basename(fixturePath!), {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const stages: string[] = [];
    const profile = await supabaseAnalyticsProvider.profileFile(file, { sheetName: '_datos' }, {
      onProgress: ({ stage }) => stages.push(stage)
    });

    expect(profile.stats[0]?.total).toBe(514_704);
    expect(profile.stats.every((stat) => stat.total === 514_704)).toBe(true);
    expect(profile.columns).toHaveLength(14);
    expect(profile.preview).toHaveLength(100);
    expect(profile.artifacts?.normalizedRows).toHaveLength(514_704);
    expect(profile.artifacts?.normalizedCsv).toBeInstanceOf(Blob);
    expect(profile.columns.find((column) => column.name === 'CodigoCliente')?.semanticRole).toBe('identifier');
    expect(profile.columns.find((column) => column.name === 'CodigoAsunto')?.semanticRole).toBe('identifier');
    expect(profile.columns.find((column) => column.name === 'MontoFacturadoMN')?.semanticRole).toBe('currency');
    expect(profile.columns.find((column) => column.name === 'FechaEntradaTiempo')?.semanticRole).toBe('datetime');
    const recommendation = buildQuickResultRecommendation({ name: file.name, columns: profile.columns, stats: profile.stats });
    const generatedSql = recommendation.widgets.map((widget) => {
      const built = buildWidgetQueryModel(widget, profile.columns, []);
      expect(built.model).toBeTruthy();
      return buildWidgetSql(built.model!, profile.columns);
    });
    expect(generatedSql.some((sql) => /SUM\("CodigoCliente"/i.test(sql))).toBe(false);
    expect(generatedSql.some((sql) => /SUM\("CodigoAsunto"/i.test(sql))).toBe(false);
    expect(recommendation.recommendations.find((item) => item.intent === 'primary-kpi')?.binding.measure).toBe('MontoFacturadoMN');
    expect(recommendation.recommendations.find((item) => item.intent === 'trend')?.binding.dimension).toBe('FechaEntradaTiempo');
    expect(new Set(generatedSql.map((sql) => sql.replace(/\s+/g, ' ').trim())).size).toBe(generatedSql.length);
    const normalizedCsv = profile.artifacts?.normalizedCsv as Blob;
    expect(normalizedCsv.size).toBeGreaterThan(0);
    const uploadedParts: Array<{ path: string; bytes: number; contentType: string }> = [];
    const artifact = await uploadPartitionedNormalizedArtifact({
      blob: normalizedCsv,
      basePath: 'qa/normalized',
      rowCount: profile.artifacts!.normalizedRows.length,
      columnCount: profile.columns.length,
      upload: async (partPath, body, contentType) => {
        uploadedParts.push({ path: partPath, bytes: body.size, contentType });
      }
    });
    expect(artifact.rowCount).toBe(514_704);
    expect(artifact.columnCount).toBe(14);
    expect(artifact.sourceBytes).toBe(normalizedCsv.size);
    expect(artifact.parts).toHaveLength(Math.ceil(normalizedCsv.size / artifact.partSize));
    expect(artifact.parts.every((part) => part.sourceSha256.length === 64 && part.storedSha256.length === 64)).toBe(true);
    expect(uploadedParts.every((part) => part.bytes < 50 * 1024 * 1024)).toBe(true);
    expect(new Set(stages)).toEqual(new Set(['reading', 'profiling', 'normalizing']));
    const durationMs = performance.now() - startedAt;
    expect(durationMs).toBeGreaterThan(0);
    console.info(JSON.stringify({
      sourceBytes: file.size,
      normalizedCsvBytes: normalizedCsv.size,
      normalizedPartCount: artifact.parts.length,
      normalizedStoredBytes: uploadedParts.reduce((total, part) => total + part.bytes, 0),
      largestStoredPartBytes: Math.max(...uploadedParts.map((part) => part.bytes)),
      rowCount: profile.artifacts?.normalizedRows.length,
      columnCount: profile.columns.length,
      durationMs: Math.round(durationMs)
    }));
  }, 180_000);
});
