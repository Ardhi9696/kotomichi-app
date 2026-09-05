import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { requireLearner, getStudyContext } from '@/lib/server/dal';
import { FlashcardSession } from '@/components/flashcard-session';

export const metadata: Metadata = { title: 'Learn — Kotomichi' };

export default async function LearnPage() {
  await requireLearner();
  const t = await getTranslations('learn');
  const { user, profile, service } = await getStudyContext();
  const now = new Date().toISOString();

  const states = await service.decksWithProgress(user.id, profile.preferredLocale, now);
  const available = states.filter((s) => !s.deck.isLocked);
  const deck = available[0] ?? states[0];
  const firstNew = deck?.newCards[0] ?? null;

  return (
    <div className="flex flex-col gap-6">
      <section className="text-center">
        <h1 className="font-serif text-3xl font-bold text-ink-900 dark:text-washi-50">{t('title')}</h1>
        <p className="mt-1 text-sm text-ink-600 dark:text-ink-300">{t('subtitle')}</p>
      </section>

      <FlashcardSession initial={firstNew} kind="learn" deckTitle={deck?.deck.title} />
    </div>
  );
}