import { describe, expect, it } from 'vitest';
import { materializeWidgetVisualizationResult } from './widgetResult';
import type { Widget } from '@/lib/widgets/types';

describe('widget result materialization', () => {
  const columns = [
    { name: 'Fecha', type: 'DATE', semanticRole: 'datetime' },
    { name: 'Categoria', type: 'VARCHAR', semanticRole: 'dimension' },
    { name: 'Ventas', type: 'DOUBLE', semanticRole: 'currency' },
    { name: 'Latitude', type: 'DOUBLE', semanticRole: 'geography' },
    { name: 'Longitude', type: 'DOUBLE', semanticRole: 'geography' }
  ];

  it('normalizes grouped chart rows into renderable numeric values', () => {
    const widget: Widget = {
      id: 'w1',
      type: 'bar',
      title: 'Ventas por Categoria',
      xAxis: 'Categoria',
      yAxis: 'Ventas',
      aggregation: 'SUM',
      x: 0,
      y: 0,
      w: 6,
      h: 3
    };

    const result = materializeWidgetVisualizationResult(widget, [
      { Categoria: 'North', Ventas: '120.5' },
      { Categoria: 'South', Ventas: '95' }
    ], columns);

    expect(result.issue).toBeNull();
    expect(result.renderableRowCount).toBe(2);
    expect(result.rows[0].Ventas).toBe(120.5);
  });

  it('returns an explicit empty-state issue for non-renderable chart rows', () => {
    const widget: Widget = {
      id: 'w2',
      type: 'line',
      title: 'Ventas por Fecha',
      xAxis: 'Fecha',
      yAxis: 'Ventas',
      aggregation: 'SUM',
      x: 0,
      y: 0,
      w: 6,
      h: 3
    };

    const result = materializeWidgetVisualizationResult(widget, [
      { Fecha: '2026-01-01', Ventas: null }
    ], columns);

    expect(result.renderableRowCount).toBe(0);
    expect(result.issue).toBe('No hay datos válidos para renderizar esta visualización.');
  });

  it('filters out invalid map points and surfaces a friendly issue when none remain', () => {
    const widget: Widget = {
      id: 'w3',
      type: 'map',
      title: 'Ventas por ubicación',
      xAxis: 'Categoria',
      yAxis: 'Ventas',
      aggregation: 'SUM',
      latitudeField: 'Latitude',
      longitudeField: 'Longitude',
      x: 0,
      y: 0,
      w: 12,
      h: 4
    };

    const result = materializeWidgetVisualizationResult(widget, [
      { Categoria: 'Bogota', Ventas: '80', Latitude: 'abc', Longitude: -74.1 }
    ], columns);

    expect(result.rows).toEqual([]);
    expect(result.issue).toBe('No hay coordenadas válidas para mostrar este mapa.');
  });
});
