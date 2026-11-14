import { describe, expect, it } from 'vitest';
import { buildWidgetQueryModel } from '@/lib/analytics/queryModel';
import { buildWidgetSql } from '@/lib/analytics/queryService';
import type { VisualizationPlanningDataset } from './planner';
import { RuleBasedVisualizationPlanner } from './planner';

const planner = new RuleBasedVisualizationPlanner();

function stat(column: string, type: string, total: number, unique: number, nulls = 0, min: unknown = 1, max: unknown = 100) {
  return { column, type, total, unique, nulls, min, max };
}

function plan(dataset: VisualizationPlanningDataset) {
  return planner.plan(dataset);
}

describe('RuleBasedVisualizationPlanner', () => {
  it('plans sales KPIs, temporal evolution, category ranking and product composition', () => {
    const result = plan({
      name: 'ventas.csv',
      columns: [
        { name: 'Fecha', type: 'DATE' },
        { name: 'Categoria', type: 'VARCHAR' },
        { name: 'Producto', type: 'VARCHAR' },
        { name: 'MontoVenta', type: 'DOUBLE' },
        { name: 'NumeroFactura', type: 'VARCHAR' }
      ],
      stats: [
        stat('Fecha', 'DATE', 1_000, 90, 0, '2026-01-01', '2026-03-31'),
        stat('Categoria', 'VARCHAR', 1_000, 5, 0, 'A', 'E'),
        stat('Producto', 'VARCHAR', 1_000, 10, 0, 'A', 'Z'),
        stat('MontoVenta', 'DOUBLE', 1_000, 900, 0, 1, 50_000),
        stat('NumeroFactura', 'VARCHAR', 1_000, 1_000, 0, 'F-1', 'F-999')
      ]
    });

    expect(result.semantics.currencies).toContain('MontoVenta');
    expect(result.semantics.identifiers).toContain('NumeroFactura');
    expect(result.recommendations.some((item) => item.intent === 'primary-kpi' && item.binding.measure === 'MontoVenta')).toBe(true);
    expect(result.recommendations.some((item) => item.intent === 'record-count')).toBe(true);
    expect(result.recommendations.some((item) => item.intent === 'trend' && item.binding.dimension === 'Fecha')).toBe(true);
    expect(result.recommendations.some((item) => item.intent === 'ranking')).toBe(true);
    expect(result.recommendations.some((item) => item.intent === 'composition')).toBe(true);
  });

  it('plans a historical dataset without inventing a categorical analysis', () => {
    const result = plan({
      name: 'historico.csv',
      columns: [{ name: 'Fecha', type: 'DATE' }, { name: 'Valor', type: 'DOUBLE' }],
      stats: [stat('Fecha', 'DATE', 120, 120, 0, '2025-01-01', '2025-04-30'), stat('Valor', 'DOUBLE', 120, 110)]
    });

    expect(result.recommendations.some((item) => item.intent === 'trend')).toBe(true);
    expect(result.recommendations.some((item) => item.intent === 'ranking')).toBe(false);
    expect(result.recommendations.some((item) => item.intent === 'composition')).toBe(false);
  });

  it('recommends a map only for explicit valid coordinate pairs', () => {
    const valid = plan({
      name: 'geo.csv',
      columns: [
        { name: 'Ciudad', type: 'VARCHAR' },
        { name: 'Latitud', type: 'DOUBLE' },
        { name: 'Longitud', type: 'DOUBLE' },
        { name: 'Ventas', type: 'DOUBLE' }
      ],
      stats: [
        stat('Ciudad', 'VARCHAR', 50, 10, 0, 'A', 'Z'),
        stat('Latitud', 'DOUBLE', 50, 40, 0, -4.2, 12.4),
        stat('Longitud', 'DOUBLE', 50, 40, 0, -79, -66),
        stat('Ventas', 'DOUBLE', 50, 45)
      ]
    });
    const invalid = plan({
      name: 'geo-invalido.csv',
      columns: [
        { name: 'Ciudad', type: 'VARCHAR' },
        { name: 'Latitud', type: 'DOUBLE' },
        { name: 'Longitud', type: 'DOUBLE' },
        { name: 'Ventas', type: 'DOUBLE' }
      ],
      stats: [
        stat('Ciudad', 'VARCHAR', 50, 10, 0, 'A', 'Z'),
        stat('Latitud', 'DOUBLE', 50, 40, 0, -400, 120),
        stat('Longitud', 'DOUBLE', 50, 40, 0, -790, 660),
        stat('Ventas', 'DOUBLE', 50, 45)
      ]
    });

    expect(valid.recommendations.some((item) => item.visualType === 'map')).toBe(true);
    expect(invalid.recommendations.some((item) => item.visualType === 'map')).toBe(false);
  });

  it('uses identifiers for counts and never sums them', () => {
    const dataset: VisualizationPlanningDataset = {
      name: 'tickets.csv',
      columns: [
        { name: 'CodigoCliente', type: 'INTEGER' },
        { name: 'CodigoAsunto', type: 'INTEGER' },
        { name: 'Area', type: 'VARCHAR' }
      ],
      stats: [stat('CodigoCliente', 'INTEGER', 1_000, 300), stat('CodigoAsunto', 'INTEGER', 1_000, 800), stat('Area', 'VARCHAR', 1_000, 5, 0, 'A', 'Z')]
    };
    const result = plan(dataset);

    expect(result.semantics.identifiers).toEqual(expect.arrayContaining(['CodigoCliente', 'CodigoAsunto']));
    expect(result.recommendations.some((item) => item.binding.aggregation === 'SUM')).toBe(false);
    expect(result.recommendations.some((item) => ['COUNT', 'DISTINCT'].includes(item.binding.aggregation))).toBe(true);

    const generatedSql = result.recommendations.map((item) => {
      const built = buildWidgetQueryModel(item.widget, result.semanticColumns, []);
      expect(built.model).toBeTruthy();
      return buildWidgetSql(built.model!, result.semanticColumns);
    });
    expect(generatedSql.some((sql) => /SUM\("Codigo(Cliente|Asunto)"/i.test(sql))).toBe(false);
  });

  it('handles numeric data without dates without creating a trend', () => {
    const result = plan({
      name: 'inventario.csv',
      columns: [{ name: 'Categoria', type: 'VARCHAR' }, { name: 'Cantidad', type: 'INTEGER' }, { name: 'Costo', type: 'DOUBLE' }],
      stats: [stat('Categoria', 'VARCHAR', 200, 8, 0, 'A', 'H'), stat('Cantidad', 'INTEGER', 200, 20), stat('Costo', 'DOUBLE', 200, 170)]
    });

    expect(result.recommendations.some((item) => item.intent === 'primary-kpi')).toBe(true);
    expect(result.recommendations.some((item) => item.intent === 'ranking')).toBe(true);
    expect(result.recommendations.some((item) => item.intent === 'trend')).toBe(false);
  });

  it('penalizes highly incomplete fields and keeps valid alternatives', () => {
    const result = plan({
      name: 'nulos.csv',
      columns: [{ name: 'Segmento', type: 'VARCHAR' }, { name: 'Canal', type: 'VARCHAR' }, { name: 'Ingresos', type: 'DOUBLE' }],
      stats: [
        stat('Segmento', 'VARCHAR', 1_000, 4, 900, 'A', 'D'),
        stat('Canal', 'VARCHAR', 1_000, 3, 20, 'A', 'C'),
        stat('Ingresos', 'DOUBLE', 1_000, 700, 10)
      ]
    });

    expect(result.recommendations.some((item) => item.binding.dimension === 'Canal')).toBe(true);
    expect(result.recommendations.some((item) => item.binding.dimension === 'Segmento')).toBe(false);
  });

  it('avoids categorical charts for excessive cardinality', () => {
    const result = plan({
      name: 'cardinalidad.csv',
      columns: [{ name: 'Descripcion', type: 'VARCHAR' }, { name: 'Valor', type: 'DOUBLE' }],
      stats: [stat('Descripcion', 'VARCHAR', 10_000, 9_900, 0, 'A', 'Z'), stat('Valor', 'DOUBLE', 10_000, 8_000)]
    });

    expect(result.semantics.identifiers).toContain('Descripcion');
    expect(result.recommendations.some((item) => ['bar', 'pie', 'treemap'].includes(item.visualType))).toBe(false);
  });

  it('falls back to counts and a detail table for insufficient text-only data', () => {
    const result = plan({
      name: 'insuficiente.csv',
      columns: [{ name: 'Nota', type: 'VARCHAR' }],
      stats: [stat('Nota', 'VARCHAR', 20, 1, 0, 'Sin clasificar', 'Sin clasificar')]
    });

    expect(result.recommendations.some((item) => item.intent === 'record-count')).toBe(true);
    expect(result.recommendations.some((item) => item.intent === 'detail')).toBe(true);
    expect(result.recommendations.some((item) => ['trend', 'ranking', 'composition', 'geography'].includes(item.intent))).toBe(false);
  });

  it('classifies the real workbook metadata and produces bounded unique queries', () => {
    const result = plan({
      name: 'Ventas Mensual Julio 2026.xlsx',
      columns: [
        { name: 'CodigoCliente', type: 'INTEGER' },
        { name: 'Usuario', type: 'VARCHAR' },
        { name: 'NombreUsuario', type: 'VARCHAR' },
        { name: 'Moneda', type: 'VARCHAR' },
        { name: 'CodigoAsunto', type: 'INTEGER' },
        { name: 'FechaEntradaTiempo', type: 'DATE' },
        { name: 'ANIO_MES', type: 'VARCHAR' },
        { name: 'SubClase', type: 'VARCHAR' },
        { name: 'TiempoListoFacturarAPlena', type: 'DOUBLE' },
        { name: 'MontoFacturadoMN', type: 'DOUBLE' },
        { name: 'TipoLey', type: 'VARCHAR' },
        { name: 'Corte', type: 'VARCHAR' },
        { name: 'SubClaseAjustada', type: 'VARCHAR' },
        { name: 'SubClaseFinal', type: 'VARCHAR' }
      ],
      stats: [
        stat('CodigoCliente', 'INTEGER', 514_704, 2_465, 0, 1, 9_999),
        stat('Usuario', 'VARCHAR', 514_704, 300, 0, 'A', 'Z'),
        stat('NombreUsuario', 'VARCHAR', 514_704, 300, 0, 'A', 'Z'),
        stat('Moneda', 'VARCHAR', 514_704, 3, 0, 'COP', 'USD'),
        stat('CodigoAsunto', 'INTEGER', 514_704, 8_183, 0, 1, 99_999),
        stat('FechaEntradaTiempo', 'DATE', 514_704, 821, 0, '2024-01-01', '2026-07-31'),
        stat('ANIO_MES', 'VARCHAR', 514_704, 31, 0, '2024-01', '2026-07'),
        stat('SubClase', 'VARCHAR', 514_704, 8, 0, 'A', 'Z'),
        stat('TiempoListoFacturarAPlena', 'DOUBLE', 514_704, 10_000, 5_000),
        stat('MontoFacturadoMN', 'DOUBLE', 514_704, 264_457, 0, 0, 1_000_000),
        stat('TipoLey', 'VARCHAR', 514_704, 5, 0, 'A', 'Z'),
        stat('Corte', 'VARCHAR', 514_704, 31, 0, 'A', 'Z'),
        stat('SubClaseAjustada', 'VARCHAR', 514_704, 10, 0, 'A', 'Z'),
        stat('SubClaseFinal', 'VARCHAR', 514_704, 10, 0, 'A', 'Z')
      ]
    });

    expect(result.semantics.identifiers).toEqual(expect.arrayContaining(['CodigoCliente', 'CodigoAsunto']));
    expect(result.semantics.currencies).toContain('MontoFacturadoMN');
    expect(result.semantics.datetimes).toEqual(expect.arrayContaining(['FechaEntradaTiempo', 'ANIO_MES']));
    expect(result.recommendations.find((item) => item.intent === 'primary-kpi')?.binding.measure).toBe('MontoFacturadoMN');
    expect(result.recommendations.some((item) => item.binding.aggregation === 'SUM' && ['CodigoCliente', 'CodigoAsunto'].includes(item.binding.measure))).toBe(false);
    expect(result.recommendations.length).toBeLessThanOrEqual(9);

    const queries = result.recommendations.map((item) => {
      const built = buildWidgetQueryModel(item.widget, result.semanticColumns, []);
      expect(built.model).toBeTruthy();
      return buildWidgetSql(built.model!, result.semanticColumns).replace(/\s+/g, ' ').trim();
    });
    expect(new Set(queries).size).toBe(queries.length);
  });
});
