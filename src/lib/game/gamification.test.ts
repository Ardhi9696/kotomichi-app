import { describe, expect, it } from 'vitest';
import {
  cumulativeExp,
  dateKey,
  daysAgoKey,
  expForReview,
  expRequiredForLevel,
  levelFromExp,
  nextStreak,
} from './gamification';

const cfg = {
  base: 100,
  newCard: 10,
  reviewSuccess: 3,
  streakBonusEvery: 7,
  streakBonusAmount: 25,
};

describe('EXP curve', () => {
  it('level 1 -> 2 needs base EXP', () => {
    expect(expRequiredForLevel(1, 100)).toBe(100);
  });
  it('level 2 -> 3 needs base * 2^1.5', () => {
    expect(expRequiredForLevel(2, 100)).toBe(Math.round(100 * 2 ** 1.5));
  });
  it('cumulative to level 3 = exp(1) + exp(2)', () => {
    expect(cumulativeExp(3, 100)).toBe(
      expRequiredForLevel(1, 100) + expRequiredForLevel(2, 100),
    );
  });
  it('levelFromExp boundaries', () => {
    expect(levelFromExp(0, 100).level).toBe(1);
    expect(levelFromExp(99, 100).level).toBe(1);
    expect(levelFromExp(100, 100).level).toBe(2);
    const l2 = levelFromExp(150, 100);
    expect(l2.level).toBe(2);
    expect(l2.expIntoLevel).toBe(50);
    expect(l2.expForNext).toBe(Math.round(100 * 2 ** 1.5));
  });
});

describe('streak', () => {
  const today = '2026-09-05';
  const yesterday = '2026-09-04';
  it('first ever review => 1', () => {
    expect(nextStreak(0, null, today, yesterday).streak).toBe(1);
  });
  it('repeat today keeps streak', () => {
    expect(nextStreak(5, today, today, yesterday).streak).toBe(5);
  });
  it('review yesterday increments', () => {
    expect(nextStreak(5, yesterday, today, yesterday).streak).toBe(6);
  });
  it('gap resets to 1', () => {
    expect(nextStreak(12, '2026-09-02', today, yesterday).streak).toBe(1);
  });
  it('milestone on multiples of 7', () => {
    const m7 = nextStreak(6, yesterday, today, yesterday);
    expect(m7.streak).toBe(7);
    expect(m7.hitMilestone).toBe(true);
    const m6 = nextStreak(5, yesterday, today, yesterday);
    expect(m6.hitMilestone).toBe(false);
  });
});

describe('expForReview', () => {
  it('new card correct + milestone adds all three rewards', () => {
    expect(expForReview({
      isNew: true, correct: true, config: cfg, streakMilestone: true,
    })).toBe(10 + 3 + 25);
  });
  it('incorrect review gives nothing', () => {
    expect(expForReview({
      isNew: false, correct: false, config: cfg, streakMilestone: false,
    })).toBe(0);
  });
});

describe('date helpers', () => {
  it('dateKey is UTC YYYY-MM-DD', () => {
    expect(dateKey(new Date('2026-09-05T12:00:00Z'))).toBe('2026-09-05');
    expect(dateKey('2026-09-05T12:00:00Z')).toBe('2026-09-05');
  });
  it('daysAgoKey subtracts days', () => {
    expect(daysAgoKey(1, new Date('2026-09-05T00:00:00Z'))).toBe('2026-09-04');
  });
});