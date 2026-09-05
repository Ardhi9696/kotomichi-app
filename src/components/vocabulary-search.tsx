'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { useTransition } from 'react';

import { posLabel } from '@/lib/srs/pos-label';
import type { PartOfSpeech } from '@/lib/domain';

export interface SearchWordRow {
  id: number;
  main: string;
  hiragana: string;
  romaji: string | null;
  meaning: string;
  partOfSpeech: PartOfSpeech | null;
  example: string | null;
  exampleMeaning: string | null;
}

export function VocabularySearch({ initialWords }: { initialWords: SearchWordRow[] }) {
  const t = useTranslations('vocab');
  const tLearn = useTranslations('learn');
  const common = useTranslations('common');

  const [query, setQuery] = useState('');
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return initialWords;
    return initialWords.filter((w) =>
      [w.main, w.hiragana, w.romaji, w.meaning].filter(Boolean).join(' ').toLowerCase().includes(q),
    );
  }, [query, initialWords]);

  return (
    <div className="flex flex-col gap-4">
      <form
        role="search"
        onSubmit={(e) => e.preventDefault()}
        className="flex items-center gap-2"
      >
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            startTransition(() => router.replace(`/words?q=${encodeURIComponent(e.target.value)}`, { scroll: false }));
          }}
          placeholder={t('searchPlaceholder')}
          className="w-full rounded-full border border-ink-200 bg-washi-50 px-5 py-2.5 text-sm text-ink-800 outline-none transition-colors placeholder:text-ink-400 focus:border-kintsugi-500 dark:border-ink-700 dark:bg-ink-900 dark:text-washi-50"
          aria-label={t('searchPlaceholder')}
        />
        {pending && <span className="text-xs text-ink-400">{common('loading')}</span>}
      </form>

      <p className="text-xs text-ink-400">
        {t('results', { count: filtered.length })}
      </p>

      {filtered.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="font-serif text-xl text-ink-800 dark:text-washi-50">{t('noResults')}</p>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">{t('noResultsHint')}</p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {filtered.map((w) => (
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