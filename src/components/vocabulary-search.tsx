'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';
import { useTransition } from 'react';

import { fetchWordsPageData } from '@/app/actions/page-data';
import { posLabel } from '@/lib/srs/pos-label';
import { usePageData } from '@/lib/client/use-page-data';
import type { SearchWordRow, WordsPageData } from '@/lib/page-data/types';

export type { SearchWordRow };

export function VocabularySearch() {
  const t = useTranslations('vocab');
  const tLearn = useTranslations('learn');
  const common = useTranslations('common');
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  // Mirror the URL query into a fast local input; the SWR key follows it.
  const initialQuery = searchParams.get('q') ?? '';
  const [query, setQuery] = useState(initialQuery);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data } = usePageData<WordsPageData | null>(
    `words-data:${query}`,
    () => fetchWordsPageData(query),
    null,
    { revalidateOnMount: true },
  );

  const rows: SearchWordRow[] = data?.rows ?? [];
  const searching = query.trim().length > 0;

  return (
    <div className="flex flex-col gap-4">
      <form role="search" onSubmit={(e) => e.preventDefault()} className="flex items-center gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => {
            const next = e.target.value;
            setQuery(next);
            if (debounceRef.current) clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(() => {
              startTransition(() =>
                router.replace(`/words?q=${encodeURIComponent(next)}`, { scroll: false }),
              );
            }, 300);
          }}
          placeholder={t('searchPlaceholder')}
          className="w-full rounded-full border border-ink-200 bg-washi-50 px-5 py-2.5 text-sm text-ink-800 outline-none transition-colors placeholder:text-ink-400 focus:border-kintsugi-500 dark:border-ink-700 dark:bg-ink-900 dark:text-washi-50"
          aria-label={t('searchPlaceholder')}
        />
        {(pending || !data) && <span className="text-xs text-ink-400">{common('loading')}</span>}
      </form>

      <p className="text-xs text-ink-400">
        {t('results', { count: rows.length })}
      </p>

      {!data ? (
        <WordListSkeleton />
      ) : rows.length === 0 && searching ? (
        <div className="card p-10 text-center">
          <p className="font-serif text-xl text-ink-800 dark:text-washi-50">{t('noResults')}</p>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">{t('noResultsHint')}</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="font-serif text-xl text-ink-800 dark:text-washi-50">{t('empty')}</p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {rows.map((w) => (
            <li
              key={w.id}
              className="flex flex-col gap-1 rounded-xl border border-ink-200/60 bg-washi-50/60 p-3 transition-colors dark:border-ink-800 dark:bg-ink-900/40"
            >
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="font-bold text-ink-900 dark:text-washi-50">{w.main}</span>
                {w.hiragana && w.hiragana !== w.main && (
                  <span className="text-sm text-ink-500 dark:text-ink-400">{w.hiragana}</span>
                )}
                {w.romaji && <span className="text-xs text-ink-400">{w.romaji}</span>}
                {w.partOfSpeech && (
                  <span className="chip bg-kintsugi-500/10 px-1.5 py-0 text-[11px] text-kintsugi-600 dark:bg-kintsugi-500/20 dark:text-kintsugi-300">
                    {posLabel(tLearn, w.partOfSpeech)}
                  </span>
                )}
              </div>
              <p className="text-sm text-shu-500">{w.meaning}</p>
              {w.example && (
                <p className="mt-1 text-xs leading-relaxed text-ink-500 dark:text-ink-400">
                  <span className="font-medium text-ink-700 dark:text-ink-200">{w.example}</span>
                  {w.exampleMeaning ? ` — ${w.exampleMeaning}` : ''}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      <p className="text-center text-xs text-ink-400">
        <Link href="/learn" className="underline-offset-2 hover:underline">
          {t('goToLearn')} →
        </Link>
      </p>
    </div>
  );
}

function WordListSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" aria-hidden>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-1 rounded-xl border border-ink-200/60 p-3 dark:border-ink-800">
          <div className="h-4 w-1/2 animate-pulse rounded bg-ink-200/70 dark:bg-ink-800" />
          <div className="h-3 w-2/3 animate-pulse rounded bg-ink-200/50 dark:bg-ink-800/60" />
          <div className="h-3 w-3/4 animate-pulse rounded bg-ink-200/40 dark:bg-ink-800/50" />
        </div>
      ))}
    </div>
  );
}