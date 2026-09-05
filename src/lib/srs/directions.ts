/**
 * The six recall directions (encoding specificity, §5).
 *
 * Order of introduction is fixed and gated: a direction unlocks only
 * after the previous one passes a stability threshold (default 7 days).
 */

export type Direction = 1 | 2 | 3 | 4 | 5 | 6;

export type DirectionSide =
  | 'kanji'
  | 'hiragana'
  | 'meaning'
  | 'romaji';

export interface DirectionDef {
  id: Direction;
  /** ordinal within the 1..6 sequence */
  seq: number;
  /** what the learner is shown (front) */
  from: DirectionSide;
  /** what the learner must produce/recognize (back) */
  to: DirectionSide;
  /** short key used for i18n lookup */
  key: string;
}

export const DIRECTIONS: readonly DirectionDef[] = [
  { id: 1, seq: 1, from: 'kanji', to: 'meaning', key: 'direction1' },
  { id: 2, seq: 2, from: 'kanji', to: 'hiragana', key: 'direction2' },
  { id: 3, seq: 3, from: 'hiragana', to: 'meaning', key: 'direction3' },
  { id: 4, seq: 4, from: 'meaning', to: 'hiragana', key: 'direction4' },
  { id: 5, seq: 5, from: 'hiragana', to: 'kanji', key: 'direction5' },
  { id: 6, seq: 6, from: 'meaning', to: 'kanji', key: 'direction6' },
];

export const DIRECTION_BY_ID: ReadonlyMap<Direction, DirectionDef> = new Map(
  DIRECTIONS.map((d) => [d.id, d]),
);

export function directionById(id: number): DirectionDef {
  const d = DIRECTION_BY_ID.get(id as Direction);
  if (!d) throw new Error(`Unknown direction: ${id}`);
  return d;
}

/**
 * Whether direction `id` is unlocked given the per-direction stability of
 * the previous directions. Direction 1 is always unlocked.
 *
 * @param stabilities per-direction stability in days (0/absent => never reviewed)
 * @param threshold   min stability required to unlock the NEXT direction
 */
export function isDirectionUnlocked(
  id: Direction,
  stabilities: Partial<Record<Direction, number>>,
  threshold: number,
): boolean {
  if (id === 1) return true;
  const prevStability = stabilities[(id - 1) as Direction] ?? 0;
  return prevStability >= threshold;
}

/**
 * The first not-yet-learned direction for a word (learn-mode candidate),
 * or `null` when all directions are already in progress.
 */
export function nextDirectionToLearn(
  have: Partial<Record<Direction, number>>,
  threshold: number,
): Direction | null {
  for (const def of DIRECTIONS) {
    const stability = have[def.id];
    if (stability !== undefined && stability > 0) continue; // already learned
    if (isDirectionUnlocked(def.id, have, threshold)) return def.id;
  }
  return null;
}