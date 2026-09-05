/**
 * Kotomichi FSRS engine — pure functions. NO I/O, NO vendor imports.
 *
 * Faithful FSRS-4.5 (open-spaced-repetition / srs-benchmark reference):
 *   - 17 default weights (see DEFAULT_W)
 *   - forgetting curve  R(t,S) = (1 + FACTOR·t/S)^DECAY, DECAY=-0.5, FACTOR=19/81
 *   - interval          I(r,S) = (S/FACTOR)·(r^(1/DECAY) − 1),  r = desired retention
 *   - initial state     S₀(G)=w[G−1], D₀(G)=clamp(w₄ − w₅·(G−3), 1, 10)
 *   - recall update     S'ᵣ = S·(1 + e^w₈·(11−D)·S^−w₉·(e^(w₁₀·(1−R))−1)·hard·easy)
 *                       D'  = clamp(w₇·D₀(3) + (1−w₇)·(D − w₆·(G−3)), 1, 10)
 *   - failure update    S'f = min(w₁₁·D^−w₁₂·((S+1)^w₁₃−1)·e^(w₁₄·(1−R)), S)
 *                       D'  = clamp(w₇·D₀(3) + (1−w₇)·(D + 2·w₆), 1, 10)
 *
 * Ratings (Anki convention): 1=Again, 2=Hard, 3=Good, 4=Easy.
 */

export type Rating = 1 | 2 | 3 | 4;

export const RATINGS: readonly Rating[] = [1, 2, 3, 4];

export interface FsrsState {
  /** Stability in days (interval at which R falls to 90%). */
  stability: number;
  /** Difficulty in [1, 10]. */
  difficulty: number;
}

export interface FsrsOptions {
  /** 17 FSRS-4.5 weights. */
  w: readonly number[];
  desiredRetention: number;
  maxIntervalDays: number;
}

export interface ReviewUpdate {
  state: FsrsState;
  /** Retrievability at review time (derived from elapsedDays). */
  retrievabilityBefore: number;
  /** Next interval in days for the configured desired retention. */
  intervalDays: number;
  /** True when the review was a success (rating > 1). */
  success: boolean;
}

/** Canonical FSRS-4.5 default parameters (17 weights). */
export const DEFAULT_W: readonly number[] = [
  0.4872, 1.4003, 3.7145, 13.8206, 5.1618, 1.2298, 0.8975, 0.031, 1.6474,
  0.1367, 1.0461, 2.1072, 0.0793, 0.3246, 1.587, 0.2272, 2.8755,
];

export const DEFAULT_OPTIONS: FsrsOptions = {
  w: DEFAULT_W,
  desiredRetention: 0.9,
  maxIntervalDays: 365,
};

export const clamp = (x: number, lo: number, hi: number): number =>
  Math.min(hi, Math.max(lo, x));

/** FSRS-4.5 forgetting curve: R(t,S) = (1 + (19/81)·t/S)^(−0.5). */
export function retrievability(elapsedDays: number, stability: number): number {
  const t = Math.max(0, elapsedDays);
  const s = Math.max(0.0001, stability);
  return Math.pow(1 + (19 / 81) * (t / s), -0.5);
}

/** Interval (days) needed so that R(t,S) = desiredRetention. */
export function intervalForRetention(
  stability: number,
  desiredRetention: number = 0.9,
): number {
  // I(r,S) = (S/FACTOR)·(r^(1/DECAY) − 1),  DECAY=−0.5 ⇒ r^(−2) − 1
  const factor = 19 / 81;
  const invR2 = 1 / (desiredRetention * desiredRetention);
  return Math.max(0, (stability / factor) * (invR2 - 1));
}

/** FSRS-4.5 initial state after the very first rating of a card. */
export function initialState(rating: Rating, w: readonly number[] = DEFAULT_W): FsrsState {
  const s0 = w[rating - 1];
  const d0 = clamp(w[4] - w[5] * (rating - 3), 1, 10);
  return { stability: s0, difficulty: d0 };
}

/**
 * Advance FSRS-4.5 state after a review.
 *
 * @param prev          existing state, or `null` for a brand-new card
 * @param elapsedDays   days since the previous review of this card
 * @param rating        Again=1 / Hard=2 / Good=3 / Easy=4
 * @param opts          weights + retention, defaults provided
 */
export function updateState(
  prev: FsrsState | null,
  elapsedDays: number,
  rating: Rating,
  opts: FsrsOptions = DEFAULT_OPTIONS,
): ReviewUpdate {
  const w = opts.w;
  const success = rating > 1;

  let state: FsrsState;
  let rBefore: number;
  let intervalDays: number;

  if (prev === null || prev.stability <= 0) {
    state = initialState(rating, w);
    rBefore = 1; // a brand-new card has never been tested
    intervalDays = intervalForRetention(state.stability, opts.desiredRetention);
  } else {
    rBefore = retrievability(elapsedDays, prev.stability);

    if (success) {
      const hardPenalty = rating === 2 ? w[15] : 1;
      const easyBonus = rating === 4 ? w[16] : 1;
      const sInc = 1 + Math.exp(w[8]) * (11 - prev.difficulty)
        * Math.pow(prev.stability, -w[9])
        * (Math.exp(w[10] * (1 - rBefore)) - 1)
        * hardPenalty * easyBonus;
      const s = prev.stability * Math.max(1, sInc);
      // linear damping + mean reversion toward D₀(3) = w₄
      const dTmp = prev.difficulty - w[6] * (rating - 3);
      const d = clamp(w[7] * w[4] + (1 - w[7]) * dTmp, 1, 10);
      state = { stability: s, difficulty: d };
    } else {
      // failure (Again): stability_after_failure, clamped to old S (FSRS-4.5)
      const sIncFail = w[11] * Math.pow(prev.difficulty, -w[12])
        * (Math.pow(prev.stability + 1, w[13]) - 1)
        * Math.exp(w[14] * (1 - rBefore));
      const s = Math.min(sIncFail, prev.stability);
      const dTmp = prev.difficulty + 2 * w[6];
      const d = clamp(w[7] * w[4] + (1 - w[7]) * dTmp, 1, 10);
      state = { stability: s, difficulty: d };
    }

    intervalDays = intervalForRetention(state.stability, opts.desiredRetention);
  }

  intervalDays = Math.min(intervalDays, opts.maxIntervalDays);
  return { state, retrievabilityBefore: rBefore, intervalDays, success };
}