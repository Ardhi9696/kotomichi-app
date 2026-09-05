import { describe, expect, it } from 'vitest';
import { formatLastActive } from './activity';

describe('formatLastActive', () => {
  it('returns null for empty/null input', () => {
    expect(formatLastActive(null)).toBeNull();
    expect(formatLastActive(undefined)).toBeNull();
    expect(formatLastActive('')).toBeNull();
  });

  it('returns online when activity is under 2 minutes ago', () => {
    const now = Date.now();
    const iso = new Date(now - 30_000).toISOString();
    expect(formatLastActive(iso, now)).toEqual({ kind: 'online' });
  });

  it('returns minutesAgo when activity is between 2 and 60 minutes ago', () => {
    const now = Date.now();
    const iso = new Date(now - 15 * 60_000).toISOString();
    expect(formatLastActive(iso, now)).toEqual({ kind: 'minutesAgo', count: 15 });
  });

  it('returns date when activity is over 60 minutes ago', () => {
    const now = new Date('2026-09-05T12:00:00.000Z').getTime();
    const iso = '2026-09-05T08:30:00.000Z';
    expect(formatLastActive(iso, now)).toEqual({ kind: 'date', date: '2026-09-05 08:30' });
  });

  it('handles invalid date strings gracefully', () => {
    expect(formatLastActive('invalid-date')).toEqual({ kind: 'date', date: 'invalid-date' });
  });

  it('handles Date object input without throwing', () => {
    const date = new Date('2026-09-05T08:30:00.000Z');
    const now = new Date('2026-09-05T12:00:00.000Z').getTime();
    expect(formatLastActive(date as unknown as string, now)).toEqual({ kind: 'date', date: '2026-09-05 08:30' });
  });
});
