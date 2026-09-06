import 'server-only';

import { requireLearner, getStudyContext } from '@/lib/server/dal';
import { buildStudyCard } from '@/lib/srs/study-card';
import { DIRECTIONS } from '@/lib/srs/directions';
import { pickMeaning } from '@/lib/srs/meaning';
import type { LearnPageData, ReviewPageData } from '@/lib/page-data/types';

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

  return { dueCount: queue.dueCount, firstDue: queue.due[0] ?? null };
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