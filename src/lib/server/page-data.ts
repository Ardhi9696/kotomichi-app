import 'server-only';

import { requireLearner, getStudyContext } from '@/lib/server/dal';
import { buildStudyCard } from '@/lib/srs/study-card';
import { DIRECTIONS } from '@/lib/srs/directions';
import { pickMeaning } from '@/lib/srs/meaning';
import { buildQuizSession, type QuizMode } from '@/lib/srs/quiz';
import { levelFromExp } from '@/lib/game/gamification';
import type {
  DashboardPageData,
  LearnPageData,
  QuizPageData,
  ReviewPageData,
  WordsPageData,
} from '@/lib/page-data/types';

/** Words (and therefore questions) served per quiz session. */
const WORDS_PER_SESSION = 5;

/** Dashboard calendar look-back window, in days. */
const OVERVIEW_WINDOW_DAYS = 30;

/** Upper bound for /words search results. */
const SEARCH_LIMIT = 60;

/**
 * Reads for the study pages. Used by both the SSR page (initial render) and
 * the server-action SWR fetcher so the hybrid path never drifts from what the
 * server renders on the first visit.
 */
export async function loadReviewPageData(): Promise<ReviewPageData> {
  await requireLearner();
  const { user, profile, service } = await getStudyContext();
  const now = new Date().toISOString();

  const states = await service.decksWithProgress(user.id, profile.preferredLocale, now);
  const queue = await service.buildQueue(user.id, states[0]?.deck.id ?? 1, {
    now,
    locale: profile.preferredLocale,
  });

  return { dueCount: queue.dueCount, queue: [...queue.due, ...queue.newCards] };
}

export async function loadLearnPageData(deckId: number): Promise<LearnPageData | null> {
  await requireLearner();
  const { user, profile, repo, service, thresholds } = await getStudyContext();
  const now = new Date().toISOString();
  const locale = profile.preferredLocale;

  const states = await service.decksWithProgress(user.id, locale, now);
  const active =
    states.find((s) => s.deck.id === deckId && !s.deck.isLocked) ??
    states.find((s) => s.deck.isAvailable && !s.deck.isLocked);
  if (!active) return null;

  const words = await repo.getDeckWords(active.deck.id);
  const direction = 1 as const;
  const cards = words.map((w, i) =>
    buildStudyCard({
      id: `${w.vocabulary.id}:${direction}:self:${i}`,
      word: w,
      direction,
      isNew: true,
      locale,
      thresholds: thresholds[DIRECTIONS[0].id],
    }),
  );

  return {
    decks: states.map((s) => ({ id: s.deck.id, title: s.deck.title, isLocked: s.deck.isLocked })),
    activeDeckId: active.deck.id,
    deckTitle: active.deck.title,
    wordCount: words.length,
    words: words.map((w) => {
      const ex = w.examples[0];
      return {
        id: w.vocabulary.id,
        main: w.vocabulary.kanji ?? w.vocabulary.hiragana,
        hiragana: w.vocabulary.hiragana,
        romaji: w.vocabulary.romaji ?? null,
        meaning: pickMeaning(w, locale),
        partOfSpeech: w.vocabulary.partOfSpeech ?? null,
        example: ex?.japanese ?? null,
        exampleMeaning:
          ex?.translations.find((t) => t.locale === locale)?.translation ?? ex?.translations[0]?.translation ?? null,
      };
    }),
    cards,
  };
}

export async function loadQuizPageData(
  deckId: number,
  mode: QuizMode,
  sessionIndex: number,
): Promise<QuizPageData | null> {
  await requireLearner();
  const { user, profile, repo, service } = await getStudyContext();
  const locale = profile.preferredLocale;

  // Lean path (no full decksWithProgress): only the target deck's words and
  // its gating chain matter, so quiz loads stay cheap even on cold starts.
  const deck = await repo.getDeck(deckId);
  if (!deck || !deck.isPublished) return null;
  const unlocked = await service.isDeckUnlocked(user.id, deck.id);
  if (!unlocked) return null;

  const words = await repo.getDeckWords(deck.id);
  const totalSessions = Math.max(1, Math.ceil(words.length / WORDS_PER_SESSION));
  const clamped = Math.max(0, Math.min(sessionIndex, totalSessions - 1));

  const session = await repo.createQuizSession(user.id, deck.id, mode, totalSessions, clamped);
  const sessionWords = words.slice(clamped * WORDS_PER_SESSION, (clamped + 1) * WORDS_PER_SESSION);
  const questions = buildQuizSession(sessionWords, locale, mode);

  return {
    deckId: deck.id,
    deckTitle: deck.title,
    mode,
    sessionIndex: clamped,
    totalSessions,
    wordCount: words.length,
    sessionId: session.id,
    questions,
  };
}

export async function loadWordsPageData(query: string): Promise<WordsPageData> {
  await requireLearner();
  const { profile, repo } = await getStudyContext();
  const locale = profile.preferredLocale;

  const words = await repo.searchVocabulary(query, { limit: SEARCH_LIMIT });
  const rows = words.map((w) => {
    const ex = w.examples[0];
    return {
      id: w.vocabulary.id,
      main: w.vocabulary.kanji ?? w.vocabulary.hiragana,
      hiragana: w.vocabulary.hiragana,
      romaji: w.vocabulary.romaji ?? null,
      meaning: pickMeaning(w, locale),
      partOfSpeech: w.vocabulary.partOfSpeech ?? null,
      example: ex?.japanese ?? null,
      exampleMeaning:
        ex?.translations.find((t) => t.locale === locale)?.translation ?? ex?.translations[0]?.translation ?? null,
    };
  });

  return { query, rows };
}

/** Learner dashboard snapshot (all reads run in parallel). */
export async function loadDashboardPageData(): Promise<DashboardPageData> {
  await requireLearner();
  const { user, profile, repo, config } = await getStudyContext();

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const midnight = `${today}T00:00:00.000Z`;

  const [dueCount, newToday, activity, dayDetails, studySeconds, recentLogs] = await Promise.all([
    repo.countDue(user.id, now.toISOString()),
    repo.countNewReviews(user.id, midnight),
    repo.getActivity(user.id, OVERVIEW_WINDOW_DAYS),
    repo.getDayDetails(user.id, OVERVIEW_WINDOW_DAYS),
    repo.getStudySeconds(user.id, 1),
    repo.getRecentLogs(user.id, 8),
  ]);

  return {
    displayName: profile.displayName,
    level: levelFromExp(profile.exp, config.exp.base).level,
    exp: profile.exp,
    currentStreak: profile.currentStreak,
    dueCount,
    newToday,
    newDailyCap: config.srs.dailyNewCap,
    studySeconds,
    recentLogs: recentLogs.map((l) => ({
      id: l.id,
      direction: l.direction,
      correctness: l.correctness,
      reviewedAt: l.reviewedAt,
    })),
    activity,
    dayDetails: dayDetails.filter((d) => d.date <= today),
  };
}