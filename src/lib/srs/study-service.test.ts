import { describe, expect, it } from 'vitest';

import { InMemoryVocabRepo } from '@/lib/adapters/inmemory/vocab.repo';
import { StudyService } from '@/lib/srs/study-service';
import type { UserProfile } from '@/lib/domain';

const USER: UserProfile = {
  id: 'aaaa0000-0000-0000-0000-000000000001',
  displayName: 'Learner',
  role: 'user',
  preferredLocale: 'id',
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
});