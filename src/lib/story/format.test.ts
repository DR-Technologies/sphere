import { describe, expect, it } from 'vitest';
import { compareStoryTemporalValues, formatStoryAxisLabel, parseStoryDateValue } from './format';

describe('story date formatting', () => {
  it('formats date-only values without timezone day shifts', () => {
    expect(formatStoryAxisLabel('2024-11-01', { locale: 'es', timeZone: 'America/Bogota' })).toBe('nov 2024');
    expect(formatStoryAxisLabel('2024-11-01', { locale: 'en', timeZone: 'America/Bogota' })).toBe('Nov 2024');
  });

  it('sorts ISO dates chronologically while preserving non-date labels', () => {
    const values = ['2025-01-01', '2024-11-01', '2024-12-01'];
    expect(values.sort(compareStoryTemporalValues)).toEqual(['2024-11-01', '2024-12-01', '2025-01-01']);
    expect(parseStoryDateValue('North')).toBeNull();
  });
});
