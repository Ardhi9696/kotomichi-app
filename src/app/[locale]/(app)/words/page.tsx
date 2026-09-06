import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';

import { requireLearner } from '@/lib/server/dal';
import { VocabularySearch } from '@/components/vocabulary-search';

export const metadata: Metadata = { title: 'Vocabulary — Kotomichi' };

export default async function WordsPage() {
  await requireLearner();
  const t = await getTranslations('vocab');

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h1 className="font-serif text-3xl font-bold text-ink-900 dark:text-washi-50">{t('title')}</h1>
        <p className="mt-1 text-sm text-ink-600 dark:text-ink-300">{t('subtitle')}</p>
      </div>

      <Suspense>
        <VocabularySearch />
      </Suspense>
    </div>
  );
}