/**
 * Gamification: EXP curve + streak handling (§4.5, §9.3, §9.5).
 * Pure functions — no I/O.
 */

export interface ExpConfig {
  /** EXP needed to advance from `level` to `level+1` = base · level^1.5 */
  base: number;
  /** EXP rewarded per new-direction card completed */
  newCard: number;
  /** EXP rewarded per correct review */
  reviewSuccess: number;
  /** Streak milestone: award bonus every N consecutive days */
  streakBonusEvery: number;
  /** bonus EXP at each streak milestone */
  streakBonusAmount: number;
}

export const DEFAULT_EXP_CONFIG: ExpConfig = {
  base: 100,
  newCard: 10,
  reviewSuccess: 3,
  streakBonusEvery: 7,
  streakBonusAmount: 25,
};

/** EXP needed to go from `level` to `level+1`. */
export function expRequiredForLevel(level: number, base: number): number {
  return Math.round(base * Math.pow(Math.max(1, level), 1.5));
}

/** Total EXP required to reach a given `targetLevel` (starting at level 1). */
export function cumulativeExp(targetLevel: number, base: number): number {
  let total = 0;
  for (let lvl = 1; lvl < targetLevel; lvl += 1) {
    total += expRequiredForLevel(lvl, base);
  }
  return total;
}

export interface LevelInfo {
  level: number;
  expIntoLevel: number;
  expForNext: number;
  /** 0..1 progress towards next level */
  progress: number;
}

/** Derive level from total EXP. */
export function levelFromExp(totalExp: number, base: number): LevelInfo {
  let level = 1;
  let acc = 0;
  while (true) {
    const need = expRequiredForLevel(level, base);
    if (acc + need > totalExp) break;
    acc += need;
    level += 1;
  }
  const expForNext = expRequiredForLevel(level, base);
  const expIntoLevel = Math.max(0, totalExp - acc);
  return {
    level,
    expIntoLevel,
    expForNext,
    progress: Math.min(1, expIntoLevel / expForNext),
  };
}

/**
 * Streak bookkeeping based on the last review date (which is a calendar
 * date string `YYYY-MM-DD` in UTC).
 *
 * Rules (§9.5 — streak counts only *reviews*, resets if a full day passes
 * with no review):
 *  - no previous review date      -> streak = 1
 *  - last date is today           -> streak unchanged
 *  - last date is yesterday       -> streak + 1
 *  - last date is older           -> streak = 1 (broken, restart)
 */
export function nextStreak(
  currentStreak: number,
  lastReviewDate: string | null,
  today: string,
  yesterday: string,
): { streak: number; hitMilestone: boolean } {
  let streak: number;
  if (lastReviewDate === null) {
    streak = Math.max(1, currentStreak);
  } else if (lastReviewDate === today) {
    streak = currentStreak;
  } else if (lastReviewDate === yesterday) {
    streak = currentStreak + 1;
  } else {
    streak = 1;
  }
  const hitMilestone =
    streak > 1 && streak % DEFAULT_EXP_CONFIG.streakBonusEvery === 0;
  return { streak, hitMilestone };
}

/** `YYYY-MM-DD` (UTC) for a Date or date string. */
export function dateKey(d: Date | string): string {
  if (typeof d === 'string') return d.slice(0, 10);
  return d.toISOString().slice(0, 10);
}

export function daysAgoKey(days: number, from: Date = new Date()): string {
  const d = new Date(from);
  d.setUTCDate(d.getUTCDate() - days);
  return dateKey(d);
}

/** EXP delta for a single review plus optional streak milestone. */
export function expForReview(opts: {
  isNew: boolean;
  correct: boolean;
  config: ExpConfig;
  streakMilestone: boolean;
}): number {
  const { isNew, correct, config, streakMilestone } = opts;
  let exp = 0;
  if (isNew) exp += config.newCard;
  if (correct) exp += config.reviewSuccess;
  if (streakMilestone) exp += config.streakBonusAmount;
  return exp;
}