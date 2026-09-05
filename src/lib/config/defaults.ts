/**
 * App configuration resolution (§9.1, §9.3). Everything tunable lives in
 * storage (`app_config` / `direction_thresholds`), never in component code.
 */

import type { AppConfig } from '@/lib/domain';
import type { Direction } from '@/lib/srs/directions';
import { DEFAULT_EXP_CONFIG } from '@/lib/game/gamification';
import { DEFAULT_W } from '@/lib/fsrs';

export const DEFAULTS: AppConfig = {
  exp: { ...DEFAULT_EXP_CONFIG },
  srs: {
    desiredRetention: 0.9,
    directionStabilityThreshold: 7,
    dailyNewCap: 20,
    maxIntervalDays: 365,
  },
  deck: { masteryThreshold: 0.9 },
  fsrs: { weights: [...DEFAULT_W] },
};

export const DEFAULT_THRESHOLDS: Record<Direction, { fastThresholdMs: number; goodThresholdMs: number }> = {
  1: { fastThresholdMs: 8000, goodThresholdMs: 15000 },
  2: { fastThresholdMs: 8000, goodThresholdMs: 15000 },
  3: { fastThresholdMs: 8000, goodThresholdMs: 15000 },
  4: { fastThresholdMs: 8000, goodThresholdMs: 15000 },
  5: { fastThresholdMs: 8000, goodThresholdMs: 15000 },
  6: { fastThresholdMs: 8000, goodThresholdMs: 15000 },
};

/** `key -> {value}` rows from `app_config` assembled into a typed AppConfig. */
export function assembleAppConfig(
  rows: Array<{ key: string; valueJson: unknown }>,
): AppConfig {
  const map = new Map(rows.map((r) => [r.key, r.valueJson]));
  const num = (k: string, fallback: number): number => {
    const v = map.get(k);
    return v && typeof v === 'object' && 'value' in (v as object)
      ? Number((v as { value: unknown }).value)
      : typeof v === 'number'
        ? v
        : fallback;
  };
  const weights = (k: string): number[] => {
    const v = map.get(k);
    if (v && typeof v === 'object' && 'value' in (v as object)) {
      const val = (v as { value: unknown }).value;
      if (Array.isArray(val)) return val.map(Number);
    }
    if (Array.isArray(v)) return v.map(Number);
    return [...DEFAULTS.fsrs.weights];
  };

  return {
    exp: {
      base: num('exp.base', DEFAULTS.exp.base),
      newCard: num('exp.new_card', DEFAULTS.exp.newCard),
      reviewSuccess: num('exp.review_success', DEFAULTS.exp.reviewSuccess),
      streakBonusEvery: num('exp.streak_bonus_every', DEFAULTS.exp.streakBonusEvery),
      streakBonusAmount: num('exp.streak_bonus_amount', DEFAULTS.exp.streakBonusAmount),
    },
    srs: {
      desiredRetention: num('srs.desired_retention', DEFAULTS.srs.desiredRetention),
      directionStabilityThreshold: num('srs.direction_stability_threshold', DEFAULTS.srs.directionStabilityThreshold),
      dailyNewCap: num('srs.daily_new_cap', DEFAULTS.srs.dailyNewCap),
      maxIntervalDays: num('srs.max_interval_days', DEFAULTS.srs.maxIntervalDays),
    },
    deck: {
      masteryThreshold: num('deck.mastery_threshold', DEFAULTS.deck.masteryThreshold),
    },
    fsrs: {
      weights: weights('fsrs.weights'),
    },
  };
}

/** Flatten an AppConfig back into `app_config` rows. */
export function flattenAppConfig(config: AppConfig): Array<{ key: string; valueJson: unknown }> {
  return [
    { key: 'exp.base', valueJson: { value: config.exp.base } },
    { key: 'exp.new_card', valueJson: { value: config.exp.newCard } },
    { key: 'exp.review_success', valueJson: { value: config.exp.reviewSuccess } },
    { key: 'exp.streak_bonus_every', valueJson: { value: config.exp.streakBonusEvery } },
    { key: 'exp.streak_bonus_amount', valueJson: { value: config.exp.streakBonusAmount } },
    { key: 'srs.desired_retention', valueJson: { value: config.srs.desiredRetention } },
    { key: 'srs.direction_stability_threshold', valueJson: { value: config.srs.directionStabilityThreshold } },
    { key: 'srs.daily_new_cap', valueJson: { value: config.srs.dailyNewCap } },
    { key: 'srs.max_interval_days', valueJson: { value: config.srs.maxIntervalDays } },
    { key: 'deck.mastery_threshold', valueJson: { value: config.deck.masteryThreshold } },
    { key: 'fsrs.weights', valueJson: { value: config.fsrs.weights } },
  ];
}