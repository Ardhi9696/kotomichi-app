import type { Metadata } from 'next';

import { requireLearner, getStudyContext } from '@/lib/server/dal';
import { LearnShell, type LearnDeckOption, type LearnWordRow } from '@/components/learn-shell';
import { buildStudyCard } from '@/lib/srs/study-card';
import { DIRECTIONS } from '@/lib/srs/directions';
import { pickMeaning } from '@/lib/srs/meaning';

export const metadata: Metadata = { title: 'Learn — Kotomichi' };

export default async function LearnPage({
  searchParams,
}: {
  searchParams: Promise<{ deck?: string }>;
}) {
  await requireLearner();
  const { deck } = await searchParams;
  const deckId = Number(deck);

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

  const rows: LearnWordRow[] = words.map((w) => {
    const ex = w.examples[0];
    return {
      id: w.vocabulary.id,
      main: w.vocabulary.kanji ?? w.vocabulary.hiragana,
      hiragana: w.vocabulary.hiragana,
      romaji: w.vocabulary.romaji ?? null,
      meaning: pickMeaning(w, locale),
      partOfSpeech: w.vocabulary.partOfSpeech ?? null,
      example: ex?.japanese ?? null,
      exampleMeaning: ex?.translations.find((t) => t.locale === locale)?.translation ?? ex?.translations[0]?.translation ?? null,
    };
  });

  const deckOptions: LearnDeckOption[] = states.map((s) => ({
    id: s.deck.id,
    title: s.deck.title,
    isLocked: s.deck.isLocked,
  }));

  return (
    <LearnShell
      decks={deckOptions}
      activeDeckId={active.deck.id}
      deckTitle={active.deck.title}
      wordCount={words.length}
      words={rows}
      cards={cards}
    />
  );
}