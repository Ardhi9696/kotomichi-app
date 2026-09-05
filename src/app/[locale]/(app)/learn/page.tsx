import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';

import { requireLearner, getStudyContext } from '@/lib/server/dal';
import { SelfCheckSession } from '@/components/self-check-session';
import { buildStudyCard } from '@/lib/srs/study-card';
import { DIRECTIONS } from '@/lib/srs/directions';

export const metadata: Metadata = { title: 'Learn — Kotomichi' };

export default async function LearnPage({
  searchParams,
}: {
  searchParams: Promise<{ deck?: string }>;
}) {
  await requireLearner();
  const t = await getTranslations('learn');
  const { deck } = await searchParams;
  const deckId = Number(deck);

  const { user, profile, repo, service, thresholds } = await getStudyContext();
  const now = new Date().toISOString();
  const locale = profile.preferredLocale;

  const states = await service.decksWithProgress(user.id, locale, now);
  const state = states.find((s) => s.deck.id === deckId);
  if (!state || state.deck.isLocked) redirect('/dashboard');

  const words = await repo.getDeckWords(state.deck.id);
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

  if (cards.length === 0) redirect('/dashboard');

  return (
    <div className="flex flex-col gap-6">
      <section className="text-center">
        <h1 className="font-serif text-3xl font-bold text-ink-900 dark:text-washi-50">{t('title')}</h1>
        <p className="mt-1 text-sm text-ink-600 dark:text-ink-300">{t('subtitle')}</p>
      </section>

      <SelfCheckSession cards={cards} deckTitle={state.deck.title} deckId={state.deck.id} />
    </div>
  );
}