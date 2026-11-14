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

  it('recognizes repeated Spanish business codes as identifiers instead of measures', () => {
    const columns = annotateDatasetColumns(
      [
        { name: 'CodigoCliente', type: 'INTEGER' },
        { name: 'CodigoAsunto', type: 'INTEGER' },
        { name: 'MontoFacturadoMN', type: 'DOUBLE' }
      ],
      [
        { column: 'CodigoCliente', type: 'INTEGER', min: 1, max: 9999, total: 514_704, nulls: 0, unique: 2_465 },
        { column: 'CodigoAsunto', type: 'INTEGER', min: 1, max: 99999, total: 514_704, nulls: 0, unique: 8_183 },
        { column: 'MontoFacturadoMN', type: 'DOUBLE', min: 0, max: 1_000_000, total: 514_704, nulls: 0, unique: 264_457 }
      ]
    );

    expect(columns.find((column) => column.name === 'CodigoCliente')?.semanticRole).toBe('identifier');
    expect(columns.find((column) => column.name === 'CodigoAsunto')?.semanticRole).toBe('identifier');
    expect(columns.find((column) => column.name === 'MontoFacturadoMN')?.semanticRole).toBe('currency');
  });

  it('recognizes bilingual temporal and geographic names from profiled metadata', () => {
    const columns = annotateDatasetColumns(
      [
        { name: 'ANIO_MES', type: 'VARCHAR' },
        { name: 'Periodo', type: 'INTEGER' },
        { name: 'Departamento', type: 'VARCHAR' },
        { name: 'Ciudad', type: 'VARCHAR' },
        { name: 'Latitud', type: 'DOUBLE' },
        { name: 'Longitud', type: 'DOUBLE' }
      ],
      [
        { column: 'ANIO_MES', type: 'VARCHAR', min: '2026-01', max: '2026-12', total: 12, nulls: 0, unique: 12 },
        { column: 'Periodo', type: 'INTEGER', min: 1, max: 12, total: 12, nulls: 0, unique: 12 },
        { column: 'Departamento', type: 'VARCHAR', min: 'A', max: 'Z', total: 12, nulls: 0, unique: 4 },
        { column: 'Ciudad', type: 'VARCHAR', min: 'A', max: 'Z', total: 12, nulls: 0, unique: 8 },
        { column: 'Latitud', type: 'DOUBLE', min: -4, max: 12, total: 12, nulls: 0, unique: 12 },
        { column: 'Longitud', type: 'DOUBLE', min: -79, max: -66, total: 12, nulls: 0, unique: 12 }
      ]
    );

    expect(columns.find((column) => column.name === 'ANIO_MES')?.semanticRole).toBe('datetime');
    expect(columns.find((column) => column.name === 'Periodo')?.semanticRole).toBe('datetime');
    expect(columns.find((column) => column.name === 'Departamento')?.semanticRole).toBe('geography');
    expect(columns.find((column) => column.name === 'Ciudad')?.semanticRole).toBe('geography');
    expect(columns.find((column) => column.name === 'Latitud')?.semanticRole).toBe('geography');
    expect(columns.find((column) => column.name === 'Longitud')?.semanticRole).toBe('geography');
  });

  it('does not let geographic words override an explicit business identifier', () => {
    const [column] = annotateDatasetColumns(
      [{ name: 'CodigoCiudad', type: 'INTEGER' }],
      [{ column: 'CodigoCiudad', type: 'INTEGER', min: 1, max: 99, total: 1_000, nulls: 0, unique: 30 }]
    );

    expect(column.semanticRole).toBe('identifier');
    expect(column.semanticReason).toBe('identifier_name_pattern');
  });
});
