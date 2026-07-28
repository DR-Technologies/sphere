import { describe, expect, it } from 'vitest';
import { annotateDatasetColumns, summarizeSemantics } from './semantics';

describe('dataset semantics', () => {
  it('classifies datetime, measure and geography columns deterministically', () => {
    const columns = annotateDatasetColumns(
      [
        { name: 'Fecha', type: 'DATE' },
        { name: 'Revenue', type: 'DOUBLE' },
        { name: 'City', type: 'VARCHAR' }
      ],
      [
        { column: 'Fecha', type: 'DATE', min: null, max: null, total: 10, nulls: 0, unique: 10 },
        { column: 'Revenue', type: 'DOUBLE', min: 1, max: 100, total: 10, nulls: 0, unique: 10 },
        { column: 'City', type: 'VARCHAR', min: 'A', max: 'Z', total: 10, nulls: 0, unique: 4 }
      ]
    );

    const summary = summarizeSemantics(columns);

    expect(columns.find((column) => column.name === 'Fecha')?.semanticRole).toBe('datetime');
    expect(columns.find((column) => column.name === 'Revenue')?.semanticRole).toBe('currency');
    expect(columns.find((column) => column.name === 'City')?.semanticRole).toBe('geography');
    expect(summary.datetimes).toContain('Fecha');
    expect(summary.currencies).toContain('Revenue');
    expect(summary.geographies).toContain('City');
  });
});
