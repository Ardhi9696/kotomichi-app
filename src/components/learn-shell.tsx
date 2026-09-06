'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { useTransition } from 'react';

import { fetchLearnPageData } from '@/app/actions/page-data';
import { SelfCheckSession } from '@/components/self-check-session';
import { posLabel } from '@/lib/srs/pos-label';
import { usePageData } from '@/lib/client/use-page-data';
import type { LearnPageData } from '@/lib/page-data/types';

type View = 'list' | 'selfcheck';

const isFiniteNumber = (n: number): boolean => Number.isFinite(n);

export function LearnShell() {
  const t = useTranslations('learn');
  const tvocab = useTranslations('vocab');
  const tc = useTranslations('common');
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [view, setView] = useState<View>('list');

  const rawDeck = searchParams.get('deck');
  const deckId = Number(rawDeck);
  const hasDeck = Number.isFinite(deckId) && deckId > 0;

  const { data, isLoading } = usePageData<LearnPageData | null>(
    `learn-data:${rawDeck ?? ''}`,
    () => fetchLearnPageData(hasDeck ? deckId : 0),
    null,
    { revalidateOnMount: true },
  );

  // Warm the sibling deck routes so switching decks feels instant.
  useEffect(() => {
    for (const d of data?.decks ?? []) {
      if (!d.isLocked) router.prefetch(`/learn?deck=${d.id}`);
    }
  }, [data, router]);

  // No deck available for this learner → back to the dashboard.
  useEffect(() => {
    if (!data && !isLoading) {
      router.replace('/dashboard');
    }
  }, [data, isLoading, router]);

  if (!data) return <LearnSkeleton />;

  const deckIdResolved = data.activeDeckId;
  const deckIdUrl = Number(rawDeck);
  const selectedDeck = isFiniteNumber(deckIdUrl) && deckIdUrl > 0 ? deckIdUrl : data.activeDeckId;
  const { decks, deckTitle, wordCount, words, cards } = data;

  return (
    <div className="flex flex-col gap-6">
      {/* Heading + deck switcher */}
      <div className="flex flex-col items-center gap-4">
        <div className="text-center">
          <h1 className="font-serif text-3xl font-bold text-ink-900 dark:text-washi-50">{t('title')}</h1>
          <p className="mt-1 text-sm text-ink-600 dark:text-ink-300">{t('subtitle')}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-400">{t('deck')}</span>
          <select
            value={selectedDeck}
            disabled={pending}
            onChange={(e) => {
              const id = Number(e.target.value);
              if (Number.isFinite(id)) startTransition(() => router.push(`/learn?deck=${id}`));
            }}
            className="rounded-full border border-ink-200 bg-washi-50 px-4 py-2 text-sm font-semibold text-ink-800 outline-none transition-colors hover:border-kintsugi-500/60 focus:border-kintsugi-500 dark:border-ink-700 dark:bg-ink-900 dark:text-washi-50"
          >
            {decks.map((d) => (
              <option key={d.id} value={d.id} disabled={d.isLocked}>
                {d.title}{d.isLocked ? ` (${t('locked')})` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Mode tabs: vocabulary list vs self check */}
      <div className="flex justify-center gap-2">
        {(['list', 'selfcheck'] as View[]).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors ${
              view === v
                ? 'bg-shu-600 text-white'
                : 'border border-ink-200 text-ink-600 hover:border-ink-300 dark:border-ink-700 dark:text-washi-100'
            }`}
          >
            {v === 'list' ? tvocab('listTitle') : t('selfCheckTitle')}
          </button>
        ))}
      </div>

      {view === 'selfcheck' ? (
        cards.length === 0 ? (
          <div className="card mx-auto w-full max-w-2xl p-10 text-center">
            <p className="font-serif text-2xl text-ink-800 dark:text-washi-50">{t('noCards')}</p>
          </div>
        ) : (
          <SelfCheckSession key={deckIdResolved} cards={cards} deckTitle={deckTitle} deckId={deckIdResolved} />
        )
      ) : (
        <div className="flex flex-col gap-4">
          {/* Vocab list */}
          <div className="card flex flex-col gap-3 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-100 pb-3 dark:border-ink-800">
              <h2 className="font-serif text-lg font-bold text-ink-900 dark:text-washi-50">{tvocab('listTitle')}</h2>
              <span className="chip">{tvocab('wordCount', { count: wordCount })}</span>
            </div>

            {words.length === 0 ? (
              <p className="py-8 text-center text-sm text-ink-400">{tvocab('empty')}</p>
            ) : (
              <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {words.map((w) => (
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
                          {posLabel(t, w.partOfSpeech)}
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
          </div>

          {/* Actions: self check + quizzes (normal & hard) */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => setView('selfcheck')}
              className="card flex flex-col items-center gap-1 p-6 text-center transition-transform hover:-translate-y-0.5"
            >
              <span className="font-serif text-2xl font-bold text-ink-900 dark:text-washi-50">{t('selfCheckTitle')}</span>
              <span className="mt-1 text-sm text-ink-500 dark:text-ink-400">{t('selfCheckDescription')}</span>
            </button>
            <Link
              href={`/quiz?deck=${deckIdResolved}&mode=normal`}
              prefetch
              className="card flex flex-col items-center gap-1 p-6 text-center transition-transform hover:-translate-y-0.5"
            >
              <span className="font-serif text-2xl font-bold text-emerald-600 dark:text-emerald-400">{t('quizNormalTitle')}</span>
              <span className="mt-1 text-sm text-ink-500 dark:text-ink-400">{t('quizNormalDescription')}</span>
            </Link>
            <Link
              href={`/quiz?deck=${deckIdResolved}&mode=hard`}
              prefetch
              className="card flex flex-col items-center gap-1 p-6 text-center transition-transform hover:-translate-y-0.5"
            >
              <span className="font-serif text-2xl font-bold text-kintsugi-600 dark:text-kintsugi-400">{t('quizHardTitle')}</span>
              <span className="mt-1 text-sm text-ink-500 dark:text-ink-400">{t('quizHardDescription')}</span>
            </Link>
          </div>
        </div>
      )}

      {view === 'list' && (
        <p className="text-center text-xs text-ink-400">
          {tc('words')}: {wordCount} · {t('totalWordsHint')}
        </p>
      )}
    </div>
  );
}

/** Learn-shaped placeholder shown while the deck snapshot loads. */
function LearnSkeleton() {
  const tc = useTranslations('common');
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label={tc('loading')}>
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-2/5 animate-pulse rounded-lg bg-ink-200/70 dark:bg-ink-800" />
        <div className="h-4 w-3/5 animate-pulse rounded bg-ink-200/50 dark:bg-ink-800/60" />
        <div className="mt-1 h-9 w-40 animate-pulse rounded-full bg-ink-200/50 dark:bg-ink-800/60" />
      </div>

      <div className="flex justify-center gap-2">
        {[0, 1].map((i) => (
          <div key={i} className="h-9 w-24 animate-pulse rounded-full bg-ink-200/50 dark:bg-ink-800/60" />
        ))}
      </div>

      <div className="card flex flex-col gap-3 p-5">
        <div className="flex items-center justify-between border-b border-ink-100 pb-3 dark:border-ink-800">
          <div className="h-5 w-24 animate-pulse rounded bg-ink-200/70 dark:bg-ink-800" />
          <div className="h-4 w-10 animate-pulse rounded bg-ink-200/50 dark:bg-ink-800/60" />
        </div>
        <ol>
          {Array.from({ length: 4 }).map((_, i) => (
            <li key={i} className="flex flex-col gap-2 py-3">
              <div className="h-5 w-2/3 animate-pulse rounded bg-ink-200/70 dark:bg-ink-800" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-ink-200/50 dark:bg-ink-800/60" />
              <div className="h-3 w-3/4 animate-pulse rounded bg-ink-200/40 dark:bg-ink-800/50" />
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}