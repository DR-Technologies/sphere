import { describe, expect, it } from 'vitest';
import { buildQuickResultRecommendation } from './recommendation';

describe('quick result recommendation', () => {
  it('generates a compact dashboard with title and at least four widgets', () => {
    const recommendation = buildQuickResultRecommendation({
      name: 'ventas.csv',
      columns: [
        { name: 'Fecha', type: 'DATE', semanticRole: 'datetime' },
        { name: 'Canal', type: 'VARCHAR', semanticRole: 'dimension' },
        { name: 'Revenue', type: 'DOUBLE', semanticRole: 'currency' }
      ],
      stats: [
        { column: 'Fecha', type: 'DATE', min: null, max: null, total: 12, nulls: 0, unique: 12 },
        { column: 'Canal', type: 'VARCHAR', min: 'A', max: 'Z', total: 12, nulls: 0, unique: 3 },
        { column: 'Revenue', type: 'DOUBLE', min: 10, max: 99, total: 12, nulls: 0, unique: 12 }
      ]
    });

    expect(recommendation.presentation.title).toBe('ventas');
    expect(recommendation.widgets.length).toBeGreaterThanOrEqual(4);
    expect(recommendation.widgets.some((widget) => widget.type === 'card')).toBe(true);
    expect(recommendation.widgets.some((widget) => widget.type === 'line')).toBe(true);
  });

  it('uses a distinct categorical dimension for composition and never falls back to datetime', () => {
    const recommendation = buildQuickResultRecommendation({
      name: 'ventas.csv',
      columns: [
        { name: 'Mes', type: 'DATE', semanticRole: 'datetime' },
        { name: 'Categoria', type: 'VARCHAR', semanticRole: 'dimension' },
        { name: 'Producto', type: 'VARCHAR', semanticRole: 'dimension' },
        { name: 'Ventas', type: 'DOUBLE', semanticRole: 'currency' }
      ],
      stats: [
        { column: 'Mes', type: 'DATE', min: null, max: null, total: 12, nulls: 0, unique: 12 },
        { column: 'Categoria', type: 'VARCHAR', min: 'A', max: 'Z', total: 12, nulls: 0, unique: 4 },
        { column: 'Producto', type: 'VARCHAR', min: 'A', max: 'Z', total: 12, nulls: 0, unique: 8 },
        { column: 'Ventas', type: 'DOUBLE', min: 10, max: 99, total: 12, nulls: 0, unique: 12 }
      ]
    });

    const compositionWidgets = recommendation.widgets.filter((widget) => widget.type === 'pie' || widget.type === 'treemap');
    expect(compositionWidgets.length).toBeGreaterThan(0);
    compositionWidgets.forEach((widget) => {
      expect(widget.xAxis).not.toBe('Mes');
      expect(widget.aggregation).toBe('SUM');
    });
    expect(compositionWidgets[0].xAxis).not.toBe(recommendation.widgets.find((widget) => widget.type === 'bar')?.xAxis);
  });

  it('never promotes repeated business identifiers ahead of the real monetary measure', () => {
    const recommendation = buildQuickResultRecommendation({
      name: 'Ventas Mensual Julio 2026.xlsx (_datos)',
      columns: [
        { name: 'CodigoCliente', type: 'INTEGER', semanticRole: 'measure' },
        { name: 'Usuario', type: 'VARCHAR', semanticRole: 'dimension' },
        { name: 'CodigoAsunto', type: 'INTEGER', semanticRole: 'measure' },
        { name: 'FechaEntradaTiempo', type: 'DATE', semanticRole: 'datetime' },
        { name: 'MontoFacturadoMN', type: 'DOUBLE', semanticRole: 'measure' }
      ],
      stats: [
        { column: 'CodigoCliente', type: 'INTEGER', min: 1, max: 9_999, total: 514_704, nulls: 0, unique: 2_465 },
        { column: 'Usuario', type: 'VARCHAR', min: 'A', max: 'Z', total: 514_704, nulls: 0, unique: 300 },
        { column: 'CodigoAsunto', type: 'INTEGER', min: 1, max: 99_999, total: 514_704, nulls: 0, unique: 8_183 },
        { column: 'FechaEntradaTiempo', type: 'DATE', min: '2024-01-01', max: '2026-07-31', total: 514_704, nulls: 0, unique: 821 },
        { column: 'MontoFacturadoMN', type: 'DOUBLE', min: 0, max: 1_000_000, total: 514_704, nulls: 0, unique: 264_457 }
      ]
    });

    expect(recommendation.recommendations.find((item) => item.intent === 'primary-kpi')?.binding.measure).toBe('MontoFacturadoMN');
    expect(recommendation.widgets.some((widget) => widget.yAxis === 'CodigoCliente' && widget.aggregation === 'SUM')).toBe(false);
  });

  it('returns deterministic scores and reasons for every selected visualization', () => {
    const dataset = {
      name: 'ventas.csv',
      columns: [
        { name: 'Fecha', type: 'DATE' },
        { name: 'Categoria', type: 'VARCHAR' },
        { name: 'Ventas', type: 'DOUBLE' }
      ],
      stats: [
        { column: 'Fecha', type: 'DATE', min: '2026-01-01', max: '2026-03-01', total: 30, nulls: 0, unique: 3 },
        { column: 'Categoria', type: 'VARCHAR', min: 'A', max: 'C', total: 30, nulls: 0, unique: 3 },
        { column: 'Ventas', type: 'DOUBLE', min: 1, max: 100, total: 30, nulls: 0, unique: 24 }
      ]
    };

    const first = buildQuickResultRecommendation(dataset);
    const second = buildQuickResultRecommendation(dataset);

    expect(first.recommendations).toEqual(second.recommendations);
    expect(first.recommendations.length).toBeLessThanOrEqual(9);
    expect(first.recommendations.every((item) => item.score >= 0 && item.score <= 100)).toBe(true);
    expect(first.recommendations.every((item) => item.reason.length > 20)).toBe(true);
  });
});
