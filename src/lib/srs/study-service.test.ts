import { describe, expect, it } from 'vitest';

import { InMemoryVocabRepo } from '@/lib/adapters/inmemory/vocab.repo';
import { StudyService } from '@/lib/srs/study-service';
import type { UserProfile } from '@/lib/domain';

const USER: UserProfile = {
  id: 'aaaa0000-0000-0000-0000-000000000001',
  displayName: 'Learner',
  role: 'user',
  preferredLocale: 'id',
  theme: 'system',
  level: 1,
  exp: 0,
  lastReviewDate: null,
  currentStreak: 0,
  longestStreak: 0,
  createdAt: '2026-09-05T00:00:00.000Z',
};

const NOW = '2026-09-05T12:00:00.000Z';

async function svc(): Promise<{ repo: InMemoryVocabRepo; service: StudyService }> {
  const repo = new InMemoryVocabRepo();
  await repo.createUserProfile(USER);
  const config = await repo.getAppConfig();
  const thresholds = await repo.getDirectionThresholds();
  return { repo, service: new StudyService(repo, config, thresholds) };
}

describe('StudyService', () => {
  it('builds a queue with new cards gated by direction 1 first', async () => {
    const { service } = await svc();
    const q = await service.buildQueue(USER.id, 101, { now: NOW, locale: 'id', limit: 10 });
    expect(q.newCards.length).toBeGreaterThan(0);
    expect(q.newCards[0].direction).toBe(1);
    expect(q.newCards[0].isNew).toBe(true);
    expect(q.newCards[0].from.length).toBeGreaterThan(0);
    expect(q.newCards[0].to.length).toBeGreaterThan(0);
    expect(q.due).toHaveLength(0);
  });

  it('moves a word to the due queue after learning it', async () => {
    const { repo, service } = await svc();
    const learned = await service.submit(USER, {
      cardId: 'x', vocabularyId: 2, direction: 1, elapsedMs: 4000, correct: true, answer: 'makan',
    }, NOW, 'id');

    expect(learned.outcome.rating).toBe(4);
    expect(learned.outcome.expGained).toBeGreaterThan(0);
    expect(learned.outcome.intervalDays).toBeGreaterThan(0);
    expect(learned.outcome.nextStreak).toBe(1);

    const profile = await repo.getUserProfile(USER.id);
    expect(profile?.exp).toBe(learned.outcome.expGained);
    expect(profile?.level).toBe(1);
    expect(profile?.currentStreak).toBe(1);

    // the word now counts as reviewed (dedup §5.1) and is no longer "new"
    const q = await service.buildQueue(USER.id, 101, { now: NOW, locale: 'id', limit: 10 });
    expect(q.newCards.some((c) => c.vocabularyId === 2)).toBe(false);
    expect(q.due.some((c) => c.vocabularyId === 2)).toBe(false); // dueAt in the future
  });

  it('applies FSRS failure reset and streak growth', async () => {
    const { service } = await svc();

    const r1 = await service.submit(USER, {
      cardId: 'x', vocabularyId: 3, direction: 1, elapsedMs: 3000, correct: true, answer: 'pergi',
    }, NOW, 'id');

    const s2 = await service.submit({ ...USER, lastReviewDate: NOW.slice(0, 10), currentStreak: 1, exp: r1.outcome.expGained }, {
      cardId: 'x', vocabularyId: 3, direction: 1, elapsedMs: 6000, correct: true, answer: 'pergi',
    }, NOW, 'id');
    expect(s2.outcome.nextStreak).toBe(1); // same day => streak stays

    const tomorrow = new Date(new Date(NOW).getTime() + 86400000).toISOString();
    const s3 = await service.submit(
      { ...USER, lastReviewDate: NOW.slice(0, 10), currentStreak: 1, exp: r1.outcome.expGained + s2.outcome.expGained },
      { cardId: 'x', vocabularyId: 3, direction: 1, elapsedMs: 10000, correct: false, answer: '' },
      tomorrow,
      'id',
    );
    expect(s3.outcome.rating).toBe(1);
    expect(s3.outcome.intervalDays).toBeLessThanOrEqual(s2.outcome.intervalDays);
  });

  it('reports deck lock state from average retrievability (§4.9)', async () => {
    const { service } = await svc();
    // deck 101 (order 0) is first; all decks unlocked since it has no predecessor requirement
    const states = await service.decksWithProgress(USER.id, 'id', NOW);
    expect(states.length).toBe(3);
    expect(states[0].deck.isLocked).toBe(false);
    expect(states[0].deck.isAvailable).toBe(true);
    expect(states[0].deck.wordCount).toBeGreaterThan(0);
  });

  it('isDeckUnlocked matches the gating chain for the first deck, and locks a deck whose predecessor is unmastered', async () => {
    const { service } = await svc();
    // First deck is unlocked by construction.
    expect(await service.isDeckUnlocked(USER.id, 101)).toBe(true);

    // Master deck 101 fully (correctly answer all of its words), then the next deck unlocks.
    const words101 = (await service.decksWithProgress(USER.id, 'id', NOW))[0].newCards;
    for (const card of words101) {
      for (const direction of [1, 2, 3, 4, 5, 6]) {
        await service.submit(USER, {
          cardId: `x:${card.vocabularyId}`, vocabularyId: card.vocabularyId, direction,
          elapsedMs: 3000, correct: true, answer: 'x',
        }, NOW, 'id');
      }
    }
    // 102 unlocks; 103 stays locked because its predecessor (102) is unmastered.
    expect(await service.isDeckUnlocked(USER.id, 102)).toBe(true);
    expect(await service.isDeckUnlocked(USER.id, 103)).toBe(false);
    expect(await service.isDeckUnlocked(USER.id, 999)).toBe(false);

    // Unlock 103 the same way: master every word of deck 102.
    const words102 = (await service.decksWithProgress(USER.id, 'id', NOW))[1].newCards;
    for (const card of words102) {
      for (const direction of [1, 2, 3, 4, 5, 6]) {
        await service.submit(USER, {
          cardId: `x:${card.vocabularyId}`, vocabularyId: card.vocabularyId, direction,
          elapsedMs: 3000, correct: true, answer: 'x',
        }, NOW, 'id');
      }
    }
    expect(await service.isDeckUnlocked(USER.id, 103)).toBe(true);
  });

  it('saves self-check progress but awards no exp or streak', async () => {
    const { repo, service } = await svc();
    const profile = { ...USER, exp: 120, level: 3, currentStreak: 2, longestStreak: 4, lastReviewDate: '2026-09-04' };

    const outcome = await service.submitSelfCheck(
      profile,
      { cardId: '', vocabularyId: 2, direction: 1, elapsedMs: 5000, correct: true, answer: '' },
      NOW,
    );

    expect(outcome.expGained).toBe(0);
    expect(outcome.rating).toBe(4);
    expect(outcome.intervalDays).toBeGreaterThan(0);

    const stored = await repo.getUserProfile(profile.id);
    expect(stored?.exp).toBe(120);
    expect(stored?.level).toBe(3);
    expect(stored?.currentStreak).toBe(2);
    expect(stored?.longestStreak).toBe(4);
    expect(stored?.lastReviewDate).toBe('2026-09-04');

    // progress is recorded: the word no longer counts as brand-new (counts as reviewed)
    const q = await service.buildQueue(profile.id, 101, { now: NOW, locale: 'id', limit: 10 });
    expect(q.newCards.some((c) => c.vocabularyId === 2)).toBe(false);
  });
});