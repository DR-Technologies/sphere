import { describe, expect, it } from 'vitest';
import { buildCategoricalVisualizationData } from './categoricalVisualization';

describe('buildCategoricalVisualizationData', () => {
  it('aggregates repeated categories into a single categorical datum', () => {
    const result = buildCategoricalVisualizationData([
      { Categoria: 'Soporte', Horas: 10 },
      { Categoria: 'Soporte', Horas: 15 },
      { Categoria: 'Proyectos', Horas: 30 }
    ], 'Categoria', 'Horas');

    expect(result).toEqual([
      { id: 'str:Soporte', category: 'Soporte', value: 25 },
      { id: 'str:Proyectos', category: 'Proyectos', value: 30 }
    ]);
  });

  it('normalizes surrounding whitespace without collapsing legitimate case differences', () => {
    const result = buildCategoricalVisualizationData([
      { Categoria: '  Soporte ', Horas: '10' },
      { Categoria: 'Soporte', Horas: '5' },
      { Categoria: 'SOPORTE', Horas: '8' }
    ], 'Categoria', 'Horas');

    expect(result).toEqual([
      { id: 'str:Soporte', category: 'Soporte', value: 15 },
      { id: 'str:SOPORTE', category: 'SOPORTE', value: 8 }
    ]);
  });

  it('ignores empty categories and non-numeric metric values', () => {
    const result = buildCategoricalVisualizationData([
      { Categoria: '', Horas: 10 },
      { Categoria: 'Soporte', Horas: 'abc' },
      { Categoria: 'Proyectos', Horas: 20 }
    ], 'Categoria', 'Horas');

    expect(result).toEqual([
      { id: 'str:Proyectos', category: 'Proyectos', value: 20 }
    ]);
  });
});
