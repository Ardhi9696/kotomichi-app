/**
 * StudyService — orchestration of Learn + Review (§4, §5).
 *
 * Pure-ish: it depends on the VocabRepository port (adapter injected), the
 * FSRS engine, the gamification helpers and the study-card assembler. No
 * Next.js or vendor imports, so it is testable under vitest.
 */

import type {
  AppConfig,
  DeckWithProgress,
  DirectionThreshold,
  ReviewOutcome,
  ReviewSubmission,
  SrsProgress,
  StudyCard,
  UserProfile,
  WordCard,
} from '@/lib/domain';
import type { Direction } from '@/lib/srs/directions';
import {
  DIRECTIONS,
  isDirectionUnlocked,
  nextDirectionToLearn,
} from '@/lib/srs/directions';
import { buildStudyCard } from '@/lib/srs/study-card';
import { ratingFromAnswer } from '@/lib/srs/rating';
import { updateState } from '@/lib/fsrs';
import { expForReview, levelFromExp, nextStreak } from '@/lib/game/gamification';
import type { VocabRepository } from '@/lib/ports/db-port';

const DAY_MS = 86_400_000;

export interface StudyQueue {
  due: StudyCard[];
  newCards: StudyCard[];
  dueCount: number;
  newCountRemaining: number;
  dailyNewCap: number;
}

export interface DeckStudyState {
  deck: DeckWithProgress;
  newCards: StudyCard[];
  firstDue: StudyCard | null;
}

const mkId = (vocabularyId: number, direction: Direction, isNew: boolean): string =>
  `${vocabularyId}:${direction}:${isNew ? 'new' : 'rev'}:${Math.random().toString(36).slice(2, 10)}`;

const daysBetween = (later: string, earlier: string): number =>
  Math.max(0, Math.floor((new Date(later).getTime() - new Date(earlier).getTime()) / DAY_MS));

export class StudyService {
  constructor(
    private readonly repo: VocabRepository,
    private readonly config: AppConfig,
    private readonly thresholds: Record<Direction, DirectionThreshold>,
  ) {}

  // ------------------------------------------------------------------
  // Queue building
  // ------------------------------------------------------------------

  /** Review cards already due right now. */
  private async dueCards(userId: string, now: string, locale: string, limit?: number): Promise<StudyCard[]> {
    const entries = await this.repo.getDueEntries(userId, now, { limit });
    const cards: StudyCard[] = [];
    for (const e of entries) {
      const def = DIRECTIONS.find((d) => d.id === e.progress.direction);
      if (!def) continue; // safety: unknown direction proto
      cards.push(
        buildStudyCard({
          id: mkId(e.progress.vocabularyId, def.id, false),
          word: e.word,
          direction: def.id,
          isNew: false,
          locale,
          thresholds: this.thresholds[def.id],
          progress: e.progress,
          retrievability: e.progress.retrievability ?? undefined,
        }),
      );
    }
    return cards;
  }

  /**
   * The next "new" cards for a deck: words with no progress yet, in a
   * direction currently unlocked by the 6-direction gate (§5), capped by
   * dailyNewCap minus the new cards already studied today.
   */
  private async newCards(
    userId: string,
    deckId: number,
    now: string,
    locale: string,
    limit?: number,
  ): Promise<{ cards: StudyCard[]; remaining: number }> {
    const words = await this.repo.getDeckWords(deckId);
    const reviewedIds = new Set(await this.repo.getWordsWithProgress(userId));
    const candidates = words.filter((w) => !reviewedIds.has(w.vocabulary.id));
    if (candidates.length === 0) return { cards: [], remaining: 0 };

    const lastMidnight = now.slice(0, 10) + 'T00:00:00.000Z';
    const newToday = await this.repo.countNewReviews(userId, lastMidnight);
    const cap = Math.max(0, this.config.srs.dailyNewCap - newToday);
    const take = Math.min(limit ?? cap, cap, candidates.length);

    const progress = await this.repo.getProgressForVocabulary(
      userId,
      candidates.map((c) => c.vocabulary.id),
    );
    const stabByVocab = new Map<number, Partial<Record<Direction, number>>>();
    for (const p of progress) {
      const cur = stabByVocab.get(p.vocabularyId) ?? {};
      cur[p.direction] = p.stability;
      stabByVocab.set(p.vocabularyId, cur);
    }

    const threshold = this.config.srs.directionStabilityThreshold;
    const chosen: StudyCard[] = [];
    for (const w of candidates) {
      if (chosen.length >= take) break;
      const stabs = stabByVocab.get(w.vocabulary.id) ?? {};
      const dir = nextDirectionToLearn(stabs, threshold);
      if (dir === null) continue;
      chosen.push(
        buildStudyCard({
          id: mkId(w.vocabulary.id, dir, true),
          word: w,
          direction: dir,
          isNew: true,
          locale,
          thresholds: this.thresholds[dir],
        }),
      );
    }
    return { cards: chosen, remaining: Math.max(0, take - chosen.length) };
  }

  /** Full queue for a session: due cards first, then today's new cards. */
  async buildQueue(userId: string, deckId: number, opts: { now: string; locale: string; limit?: number }): Promise<StudyQueue> {
    const { now, locale, limit } = opts;
    const due = await this.dueCards(userId, now, locale, limit);
    const { cards: newCards, remaining } = await this.newCards(userId, deckId, now, locale, limit);
    const dueCount = await this.repo.countDue(userId, now);
    return {
      due,
      newCards,
      dueCount,
      newCountRemaining: remaining,
      dailyNewCap: this.config.srs.dailyNewCap,
    };
  }

  // ------------------------------------------------------------------
  // Submit review
  // ------------------------------------------------------------------

  async submit(
    user: UserProfile,
    submission: ReviewSubmission,
    now: string,
    locale: string,
  ): Promise<{ outcome: ReviewOutcome; next: StudyCard | null }> {
    const { vocabularyId, direction, elapsedMs, correct } = submission;
    const threshold = this.thresholds[safeDirection(direction)];
    if (!threshold) throw new Error(`No thresholds for direction ${direction}`);

    const rating = ratingFromAnswer(correct, elapsedMs, threshold.fastThresholdMs, threshold.goodThresholdMs);
    const prev = await this.repo.getProgress(user.id, vocabularyId, direction);
    const word = await this.repo.getVocabularyById(vocabularyId);
    if (!word) throw new Error(`Vocabulary ${vocabularyId} not found`);

    const prevNonNull = Boolean(prev && prev.stability > 0);
    const prevState = prevNonNull && prev
      ? { stability: prev.stability, difficulty: prev.difficulty }
      : null;
    const elapsedDays = prevState && prev
      ? daysBetween(now, prev.lastReviewAt ?? prev.dueAt)
      : 0;

    const upd = updateState(prevState, elapsedDays, rating, {
      w: this.config.fsrs.weights,
      desiredRetention: this.config.srs.desiredRetention,
      maxIntervalDays: this.config.srs.maxIntervalDays,
    });

    const isNew = prevState === null;
    const reviewCount = (prev?.reviewCount ?? 0) + 1;
    const lapses = (prev?.lapses ?? 0) + (rating === 1 ? 1 : 0);
    const dueAt = new Date(new Date(now).getTime() + upd.intervalDays * DAY_MS).toISOString();

    // streak + EXP (§9.3, §9.5)
    const today = now.slice(0, 10);
    const yesterday = new Date(new Date(now).getTime() - DAY_MS).toISOString().slice(0, 10);
    const { streak } = nextStreak(user.currentStreak, user.lastReviewDate, today, yesterday);
    const streakMilestone = streak > 1 && streak % this.config.exp.streakBonusEvery === 0;
    const expGained = expForReview({ isNew, correct, config: this.config.exp, streakMilestone });
    const newExp = user.exp + expGained;
    const levelInfo = levelFromExp(newExp, this.config.exp.base);
    const longestStreak = Math.max(user.longestStreak, streak);

    await this.repo.applyReview({
      userId: user.id,
      log: {
        vocabularyId,
        direction,
        isNew,
        correctness: correct,
        elapsedMs,
        rating,
        stabilityBefore: prev?.stability ?? null,
        stabilityAfter: upd.state.stability,
        difficultyBefore: prev?.difficulty ?? null,
        difficultyAfter: upd.state.difficulty,
        retrievabilityBefore: prev ? upd.retrievabilityBefore : null,
      },
      progress: {
        vocabularyId,
        direction,
        stability: upd.state.stability,
        difficulty: upd.state.difficulty,
        retrievability: prev ? upd.retrievabilityBefore : 1,
        dueAt,
        lastReviewAt: now,
        reviewCount,
        lapses,
      },
      userStats: {
        exp: newExp,
        level: levelInfo.level,
        currentStreak: streak,
        longestStreak,
        lastReviewDate: today,
      },
    });

    const queue = await this.buildQueue(user.id, await findDeckForWord(this.repo, word), {
      now,
      locale,
      limit: 1,
    });
    const next = queue.due[0] ?? queue.newCards[0] ?? null;

    return {
      outcome: {
        vocabularyId,
        direction,
        correct,
        elapsedMs,
        rating,
        stability: upd.state.stability,
        difficulty: upd.state.difficulty,
        intervalDays: Math.ceil(upd.intervalDays),
        expGained,
        nextStreak: streak,
        streakMilestone,
        dueCountRemaining: queue.dueCount - queue.due.length,
        newCountRemaining: queue.newCountRemaining,
      },
      next,
    };
  }

  // ------------------------------------------------------------------
  // Dashboard / deck gating (§4.9)
  // ------------------------------------------------------------------

  /**
   * Deck state for the dashboard: word/review counts, mastery (average
   * retrievability), lock state from previous-deck gating, and ready cards.
   */
  async decksWithProgress(userId: string, locale: string, now: string): Promise<DeckStudyState[]> {
    const decks = await this.repo.listDecks({ publishedOnly: true });
    const threshold = this.config.deck.masteryThreshold;
    const out: DeckStudyState[] = [];

    let previousMastered = true;
    for (const deck of decks) {
      const words = await this.repo.getDeckWords(deck.id);
      const ids = words.map((w) => w.vocabulary.id);
      const progress = await this.repo.getProgressForVocabulary(userId, ids);
      const byVocab = new Map<number, SrsProgress[]>();
      for (const p of progress) {
        const list = byVocab.get(p.vocabularyId) ?? [];
        list.push(p);
        byVocab.set(p.vocabularyId, list);
      }

      const reviewedCount = ids.filter((id) => byVocab.has(id)).length;
      const rValues = [...progress].filter((p) => p.retrievability !== null).map((p) => p.retrievability as number);
      const mastery = rValues.length > 0 ? rValues.reduce((a, b) => a + b, 0) / rValues.length : null;
      const isMyDeckMastered = reviewedCount > 0 && (mastery ?? 0) >= threshold;
      const isLocked = !previousMastered;
      previousMastered = isMyDeckMastered;

      const due = await this.repo.getDueEntries(userId, now, { limit: 1 });
      const firstDue = due.find((d) => ids.includes(d.progress.vocabularyId)) ?? null;
      const firstDueCard = firstDue
        ? buildStudyCard({
            id: mkId(firstDue.progress.vocabularyId, firstDue.progress.direction, false),
            word: firstDue.word,
            direction: firstDue.progress.direction,
            isNew: false,
            locale,
            thresholds: this.thresholds[firstDue.progress.direction],
            progress: firstDue.progress,
            retrievability: firstDue.progress.retrievability ?? undefined,
          })
        : null;

      const newState = await this.newCards(userId, deck.id, now, locale, this.config.srs.dailyNewCap);
      const dueCount = await this.repo.countDue(userId, now);

      out.push({
        deck: {
          id: deck.id,
          title: deck.title,
          subtitle: deck.subtitle,
          jlptLevel: deck.jlptLevel,
          orderIndex: deck.orderIndex,
          isPublished: deck.isPublished,
          createdBy: deck.createdBy,
          createdAt: deck.createdAt,
          updatedAt: deck.updatedAt,
          wordCount: words.length,
          reviewedCount,
          mastery,
          isLocked,
          newCount: newState.cards.length,
          dueCount,
          isAvailable: !isLocked,
        },
        newCards: newState.cards,
        firstDue: firstDueCard,
      });
    }
    return out;
  }
}

function safeDirection(d: Direction): Direction {
  return DIRECTIONS.some((x) => x.id === d) ? d : (1 as Direction);
}

/** A review's home deck = first deck (in order) containing the word. */
async function findDeckForWord(repo: VocabRepository, word: WordCard): Promise<number> {
  const decks = await repo.listDecks({ publishedOnly: true });
  for (const d of decks) {
    if (await repo.deckContainsVocabulary(d.id, word.vocabulary.id)) return d.id;
  }
  return decks[0]?.id ?? 1;
}

export { isDirectionUnlocked };