import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { requireLearner, getStudyContext } from '@/lib/server/dal';
import { FlashcardSession } from '@/components/flashcard-session';

export const metadata: Metadata = { title: 'Review — Kotomichi' };

export default async function ReviewPage() {
  await requireLearner();
  const t = await getTranslations('review');
  const { user, profile, service } = await getStudyContext();
  const now = new Date().toISOString();

  const states = await service.decksWithProgress(user.id, profile.preferredLocale, now);
  const queue = await service.buildQueue(user.id, states[0]?.deck.id ?? 1, {
    now,
    locale: profile.preferredLocale,
  });
  const dueCount = queue.dueCount;
  const firstDue = queue.due[0] ?? null;

  return (
    <div className="flex flex-col gap-6">
      <section className="text-center">
        <h1 className="font-serif text-3xl font-bold text-ink-900 dark:text-washi-50">{t('title')}</h1>
        <p className="mt-1 text-sm text-ink-600 dark:text-ink-300">
          {dueCount > 0 ? t('subtitle', { count: dueCount }) : t('noDue')}
        </p>
      </section>

      <FlashcardSession initial={firstDue} kind="review" />
    </div>
  );
}