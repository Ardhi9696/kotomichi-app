'use client';

import { useTranslations } from 'next-intl';

import { fetchReviewPageData } from '@/app/actions/page-data';
import { FlashcardSession } from '@/components/flashcard-session';
import { usePageData } from '@/lib/client/use-page-data';
import type { ReviewPageData } from '@/lib/page-data/types';

export function ReviewShell({ initial }: { initial: ReviewPageData }) {
  const t = useTranslations('review');
  const { data = initial } = usePageData<ReviewPageData>('review-data', fetchReviewPageData, initial);

  return (
    <div className="flex flex-col gap-6">
      <section className="text-center">
        <h1 className="font-serif text-3xl font-bold text-ink-900 dark:text-washi-50">{t('title')}</h1>
        <p className="mt-1 text-sm text-ink-600 dark:text-ink-300">
          {data.dueCount > 0 ? t('subtitle', { count: data.dueCount }) : t('noDue')}
        </p>
      </section>

      <FlashcardSession queue={data.queue} />
    </div>
  );
}