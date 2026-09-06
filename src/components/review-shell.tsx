'use client';

import { useTranslations } from 'next-intl';

import { fetchReviewPageData } from '@/app/actions/page-data';
import { FlashcardSession } from '@/components/flashcard-session';
import { usePageData } from '@/lib/client/use-page-data';
import type { ReviewPageData } from '@/lib/page-data/types';

export function ReviewShell() {
  const t = useTranslations('review');
  const { data, isLoading } = usePageData<ReviewPageData | null>('review-data', fetchReviewPageData, null, {
    revalidateOnMount: true,
  });

  if (!data && isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="mx-auto text-center">
          <div className="h-8 w-40 animate-pulse rounded-lg bg-ink-200/70 dark:bg-ink-800" />
          <div className="mt-2 h-4 w-64 animate-pulse rounded bg-ink-200/50 dark:bg-ink-800/60" />
        </div>
        <div className="card mx-auto flex h-72 w-full max-w-2xl animate-pulse items-center justify-center">
          <div className="h-10 w-40 rounded bg-ink-200/70 dark:bg-ink-800" />
        </div>
        <div className="mx-auto flex items-center justify-center gap-2">
          {[0, 1].map((i) => (
            <div key={i} className="h-12 w-36 animate-pulse rounded-xl bg-ink-200/50 dark:bg-ink-800/60" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

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