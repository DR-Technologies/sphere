import { describe, expect, it } from 'vitest';
import { sanitizeWidgetForType } from './config';
import type { Widget } from './types';

describe('widget config sanitization', () => {
  const dataset = {
    columns: [
      { name: 'Categoria', type: 'VARCHAR', semanticRole: 'dimension' },
      { name: 'Horas', type: 'DOUBLE', semanticRole: 'measure' }
    ],
    stats: [
      { column: 'Categoria', type: 'VARCHAR' },
      { column: 'Horas', type: 'DOUBLE' }
    ]
  };

  it('coerces legacy treemap widgets with numeric measures to grouped SUM semantics', () => {
    const legacyTreemap: Widget = {
      id: 'treemap-legacy',
      type: 'treemap',
      title: 'Categoria por Horas',
      xAxis: 'Categoria',
      yAxis: 'Horas',
      aggregation: 'NONE',
      x: 0,
      y: 0,
      w: 6,
      h: 3
    };

    const sanitized = sanitizeWidgetForType(legacyTreemap, 'treemap', dataset);

    expect(sanitized.aggregation).toBe('SUM');
  });

  it('preserves an existing COUNT aggregation when normalizing a card widget', () => {
    const countCard: Widget = {
      id: 'count-card',
      type: 'card',
      title: 'Numero de registros',
      xAxis: 'Categoria',
      yAxis: 'Categoria',
      aggregation: 'COUNT',
      x: 0,
      y: 0,
      w: 3,
      h: 2
    };

    const sanitized = sanitizeWidgetForType(countCard, 'card', dataset);

    expect(sanitized.aggregation).toBe('COUNT');
  });
});
