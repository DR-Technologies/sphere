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

  it('uses a categorical dimension for composition before falling back to datetime', () => {
    const recommendation = buildQuickResultRecommendation({
      name: 'ventas.csv',
      columns: [
        { name: 'Mes', type: 'DATE', semanticRole: 'datetime' },
        { name: 'Categoria', type: 'VARCHAR', semanticRole: 'dimension' },
        { name: 'Ventas', type: 'DOUBLE', semanticRole: 'currency' }
      ],
      stats: [
        { column: 'Mes', type: 'DATE', min: null, max: null, total: 12, nulls: 0, unique: 12 },
        { column: 'Categoria', type: 'VARCHAR', min: 'A', max: 'Z', total: 12, nulls: 0, unique: 4 },
        { column: 'Ventas', type: 'DOUBLE', min: 10, max: 99, total: 12, nulls: 0, unique: 12 }
      ]
    });

    const compositionWidgets = recommendation.widgets.filter((widget) => widget.type === 'pie' || widget.type === 'treemap');
    expect(compositionWidgets.length).toBeGreaterThan(0);
    compositionWidgets.forEach((widget) => {
      expect(widget.xAxis).toBe('Categoria');
      expect(widget.aggregation).toBe('SUM');
    });
  });
});
