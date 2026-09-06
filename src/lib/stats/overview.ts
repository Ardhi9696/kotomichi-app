import type { ActivityDay, DayDetail } from '@/lib/domain';
import type { ExpConfig } from '@/lib/game/gamification';

export interface DayStat {
  /** YYYY-MM-DD */
  date: string;
  minutes: number;
  isToday: boolean;
  isFuture: boolean;
}

export interface OverviewStats {
  todayMinutes: number;
  /** total minutes studied in the look-back window */
  totalMinutes: number;
  /** distinct days with study activity in the window */
  daysStudied: number;
  /** distinct study days in the current calendar month */
  daysThisMonth: number;
  /** consecutive study days ending today (or yesterday if today is empty) */
  currentStreak: number;
  /** calendar grid for the current month, padded with nulls to start on Monday */
  monthCells: (DayStat | null)[];
  monthYear: string;
  windowDays: number;
}

const WEEK_START_MONDAY_OFFSET = (utcDay: number) => (utcDay + 6) % 7;

function utcDayKey(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(d: Date, delta: number): Date {
  const n = new Date(d);
  n.setUTCHours(0, 0, 0, 0);
  n.setUTCDate(n.getUTCDate() + delta);
  return n;
}

function minutesOf(byDate: Map<string, number>, key: string): number {
  return byDate.get(key) ?? 0;
}

/**
 * Derive calendar + consistency metrics from raw daily activity. Pure and
 * timezone-stable: all date math happens in UTC, matching the repo's
 * `YYYY-MM-DD` activity keys.
 */
export function computeOverview(activity: ActivityDay[], now: Date = new Date(), windowDays = 30): OverviewStats {
  const byDate = new Map<string, number>();
  for (const a of activity) byDate.set(a.date, Math.round(a.seconds / 60));

  const today = addDays(now, 0);
  const todayKey = utcDayKey(today);
  const since = addDays(now, -(windowDays - 1));

  let totalMinutes = 0;
  let daysStudied = 0;
  for (const [key, mins] of byDate) {
    if (key < utcDayKey(since) || key > todayKey) continue;
    totalMinutes += mins;
    if (mins > 0) daysStudied += 1;
  }

  // Consecutive active days: count back from today; if today is still quiet,
  // tolerate a zero-today and start the run from yesterday.
  let cursor = addDays(now, 0);
  if (!(minutesOf(byDate, utcDayKey(cursor)) > 0)) cursor = addDays(cursor, -1);
  let currentStreak = 0;
  while (minutesOf(byDate, utcDayKey(cursor)) > 0) {
    currentStreak += 1;
    cursor = addDays(cursor, -1);
  }

  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const first = new Date(Date.UTC(y, m, 1));
  const daysInMonth = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const lead = WEEK_START_MONDAY_OFFSET(first.getUTCDay());

  const monthCells: (DayStat | null)[] = [];
  for (let i = 0; i < lead; i += 1) monthCells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) {
    const key = utcDayKey(new Date(Date.UTC(y, m, d)));
    const mins = minutesOf(byDate, key);
    monthCells.push({
      date: key,
      minutes: mins,
      isToday: key === todayKey,
      isFuture: key > todayKey,
    });
  }

  const daysThisMonth = monthCells.reduce((sum, c) => (c && !c.isFuture && c.minutes > 0 ? sum + 1 : sum), 0);

  return {
    todayMinutes: minutesOf(byDate, todayKey),
    totalMinutes,
    daysStudied,
    daysThisMonth,
    currentStreak,
    monthCells,
    monthYear: `${utcDayKey(first).slice(0, 7)}`,
    windowDays,
  };
}

/** Heat intensity labels for calendar cells, keyed by minutes. */
export function heatLevel(minutes: number): 0 | 1 | 2 | 3 {
  if (minutes >= 30) return 3;
  if (minutes >= 15) return 2;
  if (minutes >= 5) return 1;
  return 0;
}

/** Raw per-day aggregate as produced by the data adapters (DB-aware). */
export interface DayStatsRow {
  /** YYYY-MM-DD */
  date: string;
  /** total review seconds on that day (elapsed clamped to 30s per review) */
  seconds: number;
  reviews: number;
  isNewCount: number;
  correctCount: number;
  /** EXP earned from quiz answers that day */
  quizExp: number;
}

/**
 * Turn a raw daily aggregate into the EXP breakdown shown in the calendar
 * detail panel. Review EXP follows the same rules as live submissions:
 * `newCard` per new-direction card + `reviewSuccess` per correct review,
 * plus any EXP banked from quiz answers. Pure — no I/O.
 */
export function computeDayDetail(row: DayStatsRow, exp: ExpConfig): DayDetail {
  const reviewExp = row.isNewCount * exp.newCard + row.correctCount * exp.reviewSuccess;
  return {
    date: row.date,
    minutes: Math.max(0, Math.round(row.seconds / 60)),
    reviews: row.reviews,
    exp: reviewExp + row.quizExp,
  };
}