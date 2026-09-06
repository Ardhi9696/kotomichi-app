'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { useTransition } from 'react';

import { fetchLearnPageData } from '@/app/actions/page-data';
import { SelfCheckSession } from '@/components/self-check-session';
import { posLabel } from '@/lib/srs/pos-label';
import { usePageData } from '@/lib/client/use-page-data';
import type { LearnPageData } from '@/lib/page-data/types';

type View = 'list' | 'selfcheck';

export function LearnShell({ decks, activeDeckId, deckTitle, wordCount, words, cards }: LearnPageData) {
  const t = useTranslations('learn');
  const tvocab = useTranslations('vocab');
  const tc = useTranslations('common');
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [view, setView] = useState<View>('list');

  const { data } = usePageData<LearnPageData | null>(
    `learn-data:${activeDeckId}`,
    () => fetchLearnPageData(activeDeckId),
    { decks, activeDeckId, deckTitle, wordCount, words, cards },
  );

  // Warm the sibling deck routes so switching decks feels instant.
  useEffect(() => {
    for (const d of data?.decks ?? decks) {
      if (!d.isLocked) router.prefetch(`/learn?deck=${d.id}`);
    }
  }, [data, decks, router]);

  const deckId = data?.activeDeckId ?? activeDeckId;
  const listDeck = data?.decks ?? decks;
  const listTitle = data?.deckTitle ?? deckTitle;
  const listCount = data?.wordCount ?? wordCount;
  const listWords = data?.words ?? words;
  const listCards = data?.cards ?? cards;

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
            value={deckId}
            disabled={pending}
            onChange={(e) => {
              const id = Number(e.target.value);
              if (Number.isFinite(id)) startTransition(() => router.push(`/learn?deck=${id}`));
            }}
            className="rounded-full border border-ink-200 bg-washi-50 px-4 py-2 text-sm font-semibold text-ink-800 outline-none transition-colors hover:border-kintsugi-500/60 focus:border-kintsugi-500 dark:border-ink-700 dark:bg-ink-900 dark:text-washi-50"
          >
            {listDeck.map((d) => (
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
        listCards.length === 0 ? (
          <div className="card mx-auto w-full max-w-2xl p-10 text-center">
            <p className="font-serif text-2xl text-ink-800 dark:text-washi-50">{t('noCards')}</p>
          </div>
        ) : (
          <SelfCheckSession key={deckId} cards={listCards} deckTitle={listTitle} deckId={deckId} />
        )
      ) : (
        <div className="flex flex-col gap-4">
          {/* Vocab list */}
          <div className="card flex flex-col gap-3 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-100 pb-3 dark:border-ink-800">
              <h2 className="font-serif text-lg font-bold text-ink-900 dark:text-washi-50">{tvocab('listTitle')}</h2>
              <span className="chip">{tvocab('wordCount', { count: listCount })}</span>
            </div>

            {listWords.length === 0 ? (
              <p className="py-8 text-center text-sm text-ink-400">{tvocab('empty')}</p>
            ) : (
              <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {listWords.map((w) => (
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
              href={`/quiz?deck=${deckId}&mode=normal`}
              prefetch
              className="card flex flex-col items-center gap-1 p-6 text-center transition-transform hover:-translate-y-0.5"
            >
              <span className="font-serif text-2xl font-bold text-emerald-600 dark:text-emerald-400">{t('quizNormalTitle')}</span>
              <span className="mt-1 text-sm text-ink-500 dark:text-ink-400">{t('quizNormalDescription')}</span>
            </Link>
            <Link
              href={`/quiz?deck=${deckId}&mode=hard`}
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
          {tc('words')}: {listCount} · {t('totalWordsHint')}
        </p>
      )}
    </div>
  );
}