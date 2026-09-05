import { describe, expect, it } from 'vitest';

import { InMemoryVocabRepo } from '@/lib/adapters/inmemory/vocab.repo';
import { DEMO_ADMIN } from '@/lib/adapters/inmemory/auth';
import type { ApplyReviewInput } from '@/lib/ports/db-port';

const USER = '11111111-1111-1111-1111-111111111111';
const NOW = '2026-09-05T09:00:00.000Z';

const review = (
  vocabularyId: number,
  userStats?: Partial<ApplyReviewInput['userStats']>,
): ApplyReviewInput => ({
  userId: USER,
  log: {
    vocabularyId,
    direction: 1,
    isNew: true,
    correctness: true,
    elapsedMs: 6000,
    rating: 4,
    stabilityBefore: null,
    stabilityAfter: 2.5,
    difficultyBefore: null,
    difficultyAfter: 3.0,
    retrievabilityBefore: null,
  },
  progress: {
    vocabularyId,
    direction: 1,
    stability: 2.5,
    difficulty: 3.0,
    retrievability: 0.95,
    dueAt: '2026-09-10T09:00:00.000Z',
    lastReviewAt: NOW,
    reviewCount: 1,
    lapses: 0,
  },
  userStats: {
    exp: 120,
    level: 1,
    currentStreak: 1,
    longestStreak: 1,
    lastReviewDate: '2026-09-05',
    ...userStats,
  },
});

describe('InMemoryVocabRepo', () => {
  it('exposes seeded vocabulary and decks', async () => {
    const repo = new InMemoryVocabRepo();
    expect((await repo.searchVocabulary('みず')).length).toBeGreaterThan(0);
    expect((await repo.listDecks()).length).toBe(3);
    await expect(repo.getVocabularyByReading('水', 'みず')).resolves.toMatchObject({ id: 1 });
  });

  it('runs a seeded demo profile through a review round trip', async () => {
    const repo = new InMemoryVocabRepo();
    await repo.createUserProfile({
      id: USER, displayName: 'Tester', role: 'user', preferredLocale: 'id', theme: 'system',
      level: 1, exp: 0, lastReviewDate: null, currentStreak: 0, longestStreak: 0,
      createdAt: NOW,
    });

    await repo.applyReview(review(1));
    await repo.applyReview(review(2, { exp: 240, currentStreak: 2, longestStreak: 2 }));

    const profile = await repo.getUserProfile(USER);
    expect(profile?.exp).toBe(240);
    expect(profile?.currentStreak).toBe(2);

    const due = await repo.getDueEntries(USER, '2026-09-11T00:00:00.000Z');
    expect(due).toHaveLength(2);
    expect(due[0].word.vocabulary.hiragana).toBeTruthy();

    expect(await repo.countDue(USER, NOW)).toBe(0);
    expect(await repo.getWordsWithProgress(USER)).toEqual([1, 2]);

    const logs = await repo.getRecentLogs(USER);
    expect(logs).toHaveLength(2);
    expect(await repo.getActivity(USER, 7)).toHaveLength(1);
    expect(await repo.getStudySeconds(USER, 7)).toBe(12);
  });

  it('keeps deck membership consistent', async () => {
    const repo = new InMemoryVocabRepo();
    const deck = await repo.createDeck({ title: 'Baru', orderIndex: 9 }, DEMO_ADMIN);
    await repo.addVocabularyToDeck(deck.id, 1);
    await repo.addVocabularyToDeck(deck.id, 2);
    expect(await repo.getDeckWordIds(deck.id)).toEqual([1, 2]);
    await repo.removeVocabularyFromDeck(deck.id, 1);
    expect(await repo.deckContainsVocabulary(deck.id, 1)).toBe(false);
    expect(await repo.getDeckWordCount(deck.id)).toBe(1);
  });

  it('assembles config from its own defaults', async () => {
    const repo = new InMemoryVocabRepo();
    const config = await repo.getAppConfig();
    expect(config.srs.dailyNewCap).toBe(20);
    expect(config.fsrs.weights).toHaveLength(17);
    await repo.setAppConfig({ ...config, srs: { ...config.srs, dailyNewCap: 5 } });
    expect((await repo.getAppConfig()).srs.dailyNewCap).toBe(5);
  });

  it('audits role changes and tracks last activity', async () => {
    const repo = new InMemoryVocabRepo();
    await repo.createUserProfile({
      id: '22222222-2222-2222-2222-222222222222', displayName: 'Target', role: 'user',
      preferredLocale: 'en', theme: 'system', level: 1, exp: 0, lastReviewDate: null,
      currentStreak: 0, longestStreak: 0, createdAt: NOW,
    });

    await repo.applyReview(review(1));
    await repo.logRoleChange({ userId: '22222222-2222-2222-2222-222222222222', byUserId: DEMO_ADMIN, fromRole: 'user', toRole: 'admin' });

    const changes = await repo.listRoleChanges();
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({ fromRole: 'user', toRole: 'admin', byUserId: DEMO_ADMIN });

    const target = '22222222-2222-2222-2222-222222222222';
    const activity = await repo.getLastActivityForUsers([target, USER, 'missing-id']);
    expect(activity[USER]).toBeTruthy();
    expect(activity[target]).toBeUndefined();
    expect(activity['missing-id']).toBeUndefined();

    await repo.touchLastActivity(target);
    const after = await repo.getLastActivityForUsers([target, USER, 'missing-id']);
    expect(after[target]).toBeTruthy();
    expect(Date.parse(after[target])).toBeGreaterThan(Date.parse(activity[USER]));
  });
});