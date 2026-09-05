/**
 * Time-based FSRS rating (§4.4). Rating derived from correctness + response
 * time against per-direction thresholds (direction_thresholds — §9.1).
 */

import type { Rating } from '@/lib/fsrs';

export function ratingFromAnswer(
  correct: boolean,
  elapsedMs: number,
  fastThresholdMs: number,
  goodThresholdMs: number,
): Rating {
  if (!correct) return 1; // Again
  if (elapsedMs < fastThresholdMs) return 4; // Easy
  if (elapsedMs <= goodThresholdMs) return 3; // Good
  return 2; // Hard
}