'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';

import { preload } from 'swr';

import { fetchQuizPageData } from '@/app/actions/page-data';
import { QuizSession } from '@/components/quiz-session';
import { usePageData } from '@/lib/client/use-page-data';
import type { QuizPageData } from '@/lib/page-data/types';

export function QuizShell() {
  const t = useTranslations('learn');
  const router = useRouter();
  const searchParams = useSearchParams();

  const rawDeck = searchParams.get('deck');
  const deckId = Number(rawDeck);
  const mode = searchParams.get('mode') === 'hard' ? 'hard' : 'normal';
  const sessionIndex = Math.max(0, Number(searchParams.get('session') ?? 0) || 0);
  const hasDeck = Number.isFinite(deckId) && deckId > 0;

  const { data, isLoading } = usePageData<QuizPageData | null>(
    `quiz-data:${rawDeck}:${mode}:${sessionIndex}`,
    () => (hasDeck ? fetchQuizPageData(deckId, mode, sessionIndex) : Promise.resolve(null)),
    null,
    { revalidateOnMount: true },
  );

  // Warm the next session so the summary's "Next session" link navigates
  // straight to cached questions (the normal flow is sequential).
  useEffect(() => {
    if (!data || data.sessionIndex !== sessionIndex) return;
    const next = sessionIndex + 1;
    if (next < data.totalSessions) {
      void preload(`quiz-data:${data.deckId}:${data.mode}:${next}`, () =>
        fetchQuizPageData(data.deckId, data.mode, next),
      );
    }
  }, [data, sessionIndex]);

  // Invalid deck → send the learner back to /learn.
  useEffect(() => {
    if (!data && !isLoading && hasDeck) {
      router.replace('/learn');
    }
  }, [data, isLoading, hasDeck, router]);

  // Clamped session (e.g. ?session=99) → normalize the URL.
  useEffect(() => {
    if (data && data.sessionIndex !== sessionIndex) {
      router.replace(`/quiz?deck=${data.deckId}&mode=${data.mode}&session=${data.sessionIndex}`);
    }
  }, [data, sessionIndex, router]);

  if (!data) {
    return (
      <div className="flex flex-col gap-6">
        <QuizPageSkeleton />
      </div>
    );
  }

  const { deckId: aid, deckTitle, sessionIndex: idx, totalSessions, wordCount } = data;

  if (data.questions.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <div className="card flex flex-col items-center gap-4 p-10 text-center">
          <h1 className="font-serif text-3xl font-bold text-ink-900 dark:text-washi-50">{t('quizTitle')}</h1>
          <p className="text-sm text-ink-500 dark:text-ink-400">{t('noCards')}</p>
        </div>
      </div>
    );
  }

  return (
    <QuizSession
      key={data.sessionId}
      questions={data.questions}
      deckId={aid}
      deckTitle={deckTitle}
      mode={data.mode}
      sessionIndex={idx}
      totalSessions={totalSessions}
      sessionId={data.sessionId}
      totalWords={wordCount}
    />
  );
}

/** Learning content loads in the background; show a light placeholder meanwhile. */
function QuizPageSkeleton() {
  return (
    <>
      <div className="card animate-pulse p-4">
        <div className="mb-2 h-4 w-52 rounded bg-ink-200/70 dark:bg-ink-800" />
        <div className="h-2 rounded-full bg-ink-200/50 dark:bg-ink-800/60" />
      </div>
      <div className="flex flex-col items-center gap-2">
        <div className="h-8 w-40 animate-pulse rounded bg-ink-200/70 dark:bg-ink-800" />
        <div className="h-4 w-72 animate-pulse rounded bg-ink-200/50 dark:bg-ink-800/60" />
      </div>
      <div className="card flex h-72 items-center justify-center animate-pulse">
        <div className="h-10 w-40 rounded bg-ink-200/70 dark:bg-ink-800" />
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-14 animate-pulse rounded-xl bg-ink-200/50 dark:bg-ink-800/60" />
        ))}
      </div>
    </>
  );
}