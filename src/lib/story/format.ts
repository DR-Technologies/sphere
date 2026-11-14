import type { DatasetColumnMeta } from '@/lib/widgets/types';
import type { StoryLocale, StoryValueFormat } from './types';

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

function resolveLocale(locale?: StoryLocale) {
  return locale === 'en' ? 'en-US' : 'es-CO';
}

export function formatStoryValue(value: number, format?: StoryValueFormat, locale?: StoryLocale) {
  const resolved = format || { kind: 'number', maximumFractionDigits: 0 };
  const suffix = resolved.kind === 'percentage'
    ? (resolved.suffix || '%')
    : (resolved.suffix || '');
  const prefix = resolved.kind === 'currency'
    ? (resolved.prefix || '$')
    : (resolved.prefix || '');

  const formatter = new Intl.NumberFormat(resolveLocale(locale), {
    notation: resolved.compact ? 'compact' : 'standard',
    maximumFractionDigits: resolved.maximumFractionDigits ?? (resolved.kind === 'number' ? 0 : 2),
    minimumFractionDigits: resolved.kind === 'currency' ? 0 : 0
  });

  return `${prefix}${formatter.format(value)}${suffix}`;
}

export function parseStoryDateValue(value: string) {
  const normalized = value.trim();
  const dateOnlyMatch = normalized.match(/^(\d{4})-(\d{2})(?:-(\d{2}))?$/);
  if (dateOnlyMatch) {
    const [, year, month, day = '01'] = dateOnlyMatch;
    return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 12));
  }

  if (!/^\d{4}-\d{2}-\d{2}[T\s]/.test(normalized)) return null;
  const timestamp = new Date(normalized);
  return Number.isNaN(timestamp.getTime()) ? null : timestamp;
}

export function compareStoryTemporalValues(left: string, right: string) {
  const leftDate = parseStoryDateValue(left);
  const rightDate = parseStoryDateValue(right);
  if (leftDate && rightDate) return leftDate.getTime() - rightDate.getTime();
  if (leftDate) return -1;
  if (rightDate) return 1;
  return left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' });
}

export function formatStoryAxisLabel(value: string, options?: { locale?: StoryLocale; timeZone?: string }) {
  const date = parseStoryDateValue(value);
  if (date) {
    return new Intl.DateTimeFormat(resolveLocale(options?.locale), {
      month: 'short',
      year: 'numeric',
      timeZone: options?.timeZone || 'UTC'
    }).format(date).replace('.', '').replace(/\s+de\s+/g, ' ');
  }

  return value;
}
