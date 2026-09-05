import { describe, expect, it } from 'vitest';
import {
  DEFAULT_OPTIONS,
  DEFAULT_W,
  initialState,
  intervalForRetention,
  retrievability,
  updateState,
} from './index';

describe('forgetting curve & intervals', () => {
  it('R(S, S) == 0.9 by construction', () => {
    for (const s of [0.5, 1, 2, 7, 30, 180]) {
      expect(retrievability(s, s)).toBeCloseTo(0.9, 10);
    }
  });

  it('interval for retention 0.9 equals stability', () => {
    for (const s of [1, 3.7, 12, 50]) {
      expect(intervalForRetention(s, 0.9)).toBeCloseTo(s, 6);
    }
  });

  it('retrievability decays monotonically', () => {
    const r1 = retrievability(1, 5);
    const r2 = retrievability(10, 5);
    const r3 = retrievability(30, 5);
    expect(r1).toBeGreaterThan(r2);
    expect(r2).toBeGreaterThan(r3);
    expect(r3).toBeGreaterThan(0);
  });

  it('higher retention ⇒ shorter interval', () => {
    expect(intervalForRetention(10, 0.9)).toBeLessThan(intervalForRetention(10, 0.85));
  });
});

describe('initial state', () => {
  it('uses w[G-1] for initial stability', () => {
    expect(initialState(1).stability).toBe(DEFAULT_W[0]); // Again ~0.48d
    expect(initialState(3).stability).toBe(DEFAULT_W[2]); // Good ~3.7d
    expect(initialState(4).stability).toBe(DEFAULT_W[3]); // Easy ~13.8d
  });

  it('initial difficulty is monotonic decreasing with rating', () => {
    expect(initialState(1).difficulty).toBeGreaterThan(initialState(3).difficulty);
    expect(initialState(3).difficulty).toBeGreaterThan(initialState(4).difficulty);
    const d = initialState(3).difficulty;
    expect(d).toBeCloseTo(DEFAULT_W[4], 10); // D0(Good) = w4
  });
});

describe('state updates', () => {
  it('success increases stability; easy > good > hard', () => {
    const prev = { stability: 5, difficulty: 5 };
    const rHard = updateState(prev, 3, 2).state.stability;
    const rGood = updateState(prev, 3, 3).state.stability;
    const rEasy = updateState(prev, 3, 4).state.stability;
    expect(rHard).toBeGreaterThan(prev.stability);
    expect(rGood).toBeGreaterThan(rHard);
    expect(rEasy).toBeGreaterThan(rGood);
  });

  it('failure reduces stability and never exceeds previous S', () => {
    const prev = { stability: 20, difficulty: 5 };
    const res = updateState(prev, 10, 1);
    expect(res.success).toBe(false);
    expect(res.state.stability).toBeLessThan(prev.stability);
  });

  it('failure on a fragile card never exceeds old stability (cliamp rule)', () => {
    const prev = { stability: 1, difficulty: 5 };
    const res = updateState(prev, 3, 1);
    expect(res.state.stability).toBeLessThanOrEqual(prev.stability);
  });

  it('higher elapsed time before a success ⇒ bigger stability gain', () => {
    const prev = { stability: 10, difficulty: 5 };
    const early = updateState(prev, 1, 3).state.stability;
    const late = updateState(prev, 10, 3).state.stability;
    expect(late).toBeGreaterThan(early);
  });

  it('hard rating increases difficulty relative to good', () => {
    const prev = { stability: 5, difficulty: 5 };
    expect(updateState(prev, 3, 2).state.difficulty)
      .toBeGreaterThan(updateState(prev, 3, 3).state.difficulty);
  });

  it('respects max interval clamp', () => {
    const res = updateState(null, 0, 4, { ...DEFAULT_OPTIONS, maxIntervalDays: 10 });
    expect(res.intervalDays).toBeLessThanOrEqual(10);
  });

  it('difficulty stays within [1, 10] after many good reviews', () => {
    let state: { stability: number; difficulty: number } = { stability: 1, difficulty: 8 };
    for (let i = 0; i < 50; i++) {
      state = updateState(state, 2, 3).state;
    }
    expect(state.difficulty).toBeGreaterThanOrEqual(1);
    expect(state.difficulty).toBeLessThanOrEqual(10);
  });
});