export interface CategoricalVisualizationDatum {
  id: string;
  category: string | number | boolean;
  value: number;
}

function normalizeCategoryValue(value: unknown): string | number | boolean | null {
  if (value === null || value === undefined) return null;

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  const stringified = String(value).trim();
  return stringified ? stringified : null;
}

function normalizeMetricValue(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;

  if (typeof value === 'string') {
    const cleaned = value.trim().replace(/,/g, '');
    if (!cleaned) return null;
    const numeric = Number(cleaned);
    return Number.isFinite(numeric) ? numeric : null;
  }

  return null;
}

function buildCategoryIdentity(category: string | number | boolean) {
  if (typeof category === 'string') return `str:${category}`;
  if (typeof category === 'number') return `num:${category}`;
  return `bool:${category ? 'true' : 'false'}`;
}

export function buildCategoricalVisualizationData(
  rows: Record<string, unknown>[],
  categoryField: string,
  valueField: string
): CategoricalVisualizationDatum[] {
  const byCategory = new Map<string, CategoricalVisualizationDatum>();

  rows.forEach((row) => {
    const category = normalizeCategoryValue(row[categoryField]);
    const value = normalizeMetricValue(row[valueField]);

    if (category === null || value === null) return;

    const id = buildCategoryIdentity(category);
    const existing = byCategory.get(id);

    if (existing) {
      existing.value += value;
      return;
    }

    byCategory.set(id, {
      id,
      category,
      value
    });
  });

  return Array.from(byCategory.values());
}
