import { describe, expect, it } from 'vitest';
import { computeOverview } from './overview';
import type { ActivityDay } from '@/lib/domain';

function day(key: string, seconds: number, reviews = 1): ActivityDay {
  return { date: key, seconds, reviews };
}

describe('computeOverview', () => {
  it('todayMinutes reflects today activity', () => {
    const activity = [day('2026-09-05', 600)];
    const now = new Date('2026-09-05T12:00:00.000Z');
    const s = computeOverview(activity, now, 30);
    expect(s.todayMinutes).toBe(10);
  });

  it('currentStreak counts back from today (or yesterday if today is empty)', () => {
    const activity = [day('2026-09-04', 300), day('2026-09-03', 200)];
    const now = new Date('2026-09-05T10:00:00.000Z');
    const s = computeOverview(activity, now, 30);
    // Today is empty → start from yesterday → streak = 2
    expect(s.currentStreak).toBe(2);
  });

  it('daysThisMonth counts only the current month with activity', () => {
    const activity = [
      day('2026-09-01', 120),
      day('2026-09-05', 60),
      day('2026-08-30', 999), // different month
    ];
    const now = new Date('2026-09-05T00:00:00.000Z');
    const s = computeOverview(activity, now, 30);
    expect(s.daysThisMonth).toBe(2);
  });

  it('monthCells starts on Monday and has no nulls on Monday-start months', () => {
    // 2026-09-01 is a Tuesday → first cell is null (Mon placeholder), then 30 days
    const now = new Date('2026-09-05T00:00:00.000Z');
    const s = computeOverview([], now, 30);
    expect(s.monthYear).toBe('2026-09');
    expect(s.monthCells.length).toBe(1 + 30); // 1 lead (Mon) + 30 days
    expect(s.monthCells[0]).toBeNull();
    expect(s.monthCells[1]!.date).toBe('2026-09-01');
    expect(s.monthCells[30]!.date).toBe('2026-09-30');
  });

  it('totalMinutes aggregates only within the window', () => {
    const activity = [day('2026-09-01', 600), day('2026-09-04', 120)];
    const now = new Date('2026-09-05T00:00:00.000Z');
    const s = computeOverview(activity, now, 30);
    expect(s.totalMinutes).toBe(12);
  });

  it('future cells are flagged', () => {
    const now = new Date('2026-09-05T00:00:00.000Z');
    const s = computeOverview([], now, 30);
    const futureCells = s.monthCells.filter((c) => c !== null && c.isFuture);
    expect(futureCells.length).toBe(25); // Sep 6-30
  });
});