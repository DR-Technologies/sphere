import type { DatasetColumnMeta } from '@/lib/widgets/types';
import type { StoryValueFormat } from './types';

const NUMERIC_COLUMN_TYPES = new Set(['INTEGER', 'BIGINT', 'DOUBLE', 'DECIMAL', 'NUMERIC', 'REAL', 'SMALLINT']);

export function inferStoryValueFormat(columnsMeta: DatasetColumnMeta[], columnName?: string): StoryValueFormat {
  const column = columnsMeta.find((item) => item.name === columnName);
  const role = column?.semanticRole;
  const type = column?.type?.toUpperCase() || '';
  const isNumeric = NUMERIC_COLUMN_TYPES.has(type);

  if (role === 'currency') {
    return {
      kind: 'currency',
      maximumFractionDigits: type === 'INTEGER' || type === 'BIGINT' ? 0 : 2,
      prefix: '$'
    };
  }

  if (role === 'percentage') {
    return {
      kind: 'percentage',
      maximumFractionDigits: 1,
      suffix: '%'
    };
  }

  return {
    kind: 'number',
    maximumFractionDigits: isNumeric && (type === 'INTEGER' || type === 'BIGINT' || type === 'SMALLINT') ? 0 : 2
  };
}

export function formatStoryValue(value: number, format?: StoryValueFormat) {
  const resolved = format || { kind: 'number', maximumFractionDigits: 0 };
  const suffix = resolved.kind === 'percentage'
    ? (resolved.suffix || '%')
    : (resolved.suffix || '');
  const prefix = resolved.kind === 'currency'
    ? (resolved.prefix || '$')
    : (resolved.prefix || '');

  const formatter = new Intl.NumberFormat('es-CO', {
    notation: resolved.compact ? 'compact' : 'standard',
    maximumFractionDigits: resolved.maximumFractionDigits ?? (resolved.kind === 'number' ? 0 : 2),
    minimumFractionDigits: resolved.kind === 'currency' ? 0 : 0
  });

  return `${prefix}${formatter.format(value)}${suffix}`;
}

export function formatStoryAxisLabel(value: string) {
  const date = new Date(value);
  if (!Number.isNaN(date.getTime()) && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return new Intl.DateTimeFormat('es-CO', { month: 'short', year: '2-digit' }).format(date);
  }

  return value;
}
