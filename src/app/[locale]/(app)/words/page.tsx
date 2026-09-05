import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { requireLearner, getStudyContext } from '@/lib/server/dal';
import { VocabularySearch, type SearchWordRow } from '@/components/vocabulary-search';
import { pickMeaning } from '@/lib/srs/meaning';

export const metadata: Metadata = { title: 'Vocabulary — Kotomichi' };

const SEARCH_LIMIT = 60;

export default async function WordsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireLearner();
  const t = await getTranslations('vocab');
  const { q } = await searchParams;
  const query = q ?? '';

  const { profile, repo } = await getStudyContext();
  const locale = profile.preferredLocale;

  const words = await repo.searchVocabulary(query, { limit: SEARCH_LIMIT });
  const rows: SearchWordRow[] = words.map((w) => {
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

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h1 className="font-serif text-3xl font-bold text-ink-900 dark:text-washi-50">{t('title')}</h1>
        <p className="mt-1 text-sm text-ink-600 dark:text-ink-300">{t('subtitle')}</p>
      </div>

      <VocabularySearch initialWords={rows} />
    </div>
  );
}