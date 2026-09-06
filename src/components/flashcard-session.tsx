'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { submitReviewAction } from '@/app/actions/study';
import type { ReviewOutcome, StudyCard } from '@/lib/domain';

/**
 * CSR-first review session. The full due + new-card queue is preloaded from
 * the server ({@link ReviewPageData.queue}) so flipping/advancing is instant
 * — each answer optimistically moves to the next card while the SRS submit
 * runs in the background, so the UI never waits on a round-trip.
 */
export function FlashcardSession({
  queue,
  deckTitle,
}: {
  queue: StudyCard[];
  deckTitle?: string;
}) {
  const t = useTranslations('review');
  const common = useTranslations('common');

  const [session] = useState(queue);
  const [index, setIndex] = useState(0);
  const [outcomes, setOutcomes] = useState<(ReviewOutcome | null)[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shownAt, setShownAt] = useState(() => Date.now());

  const card = index < session.length ? session[index] : null;
  const outcome = index > 0 ? (outcomes[index - 1] ?? null) : null;

  if (!card) {
    return (
      <div className="card flex flex-col items-center gap-4 p-10 text-center">
        <p className="font-serif text-2xl text-ink-800 dark:text-washi-50">{t('done')}</p>
        <Link href="/dashboard" className="btn-secondary">
          {common('back')}
        </Link>
      </div>
    );
  }

  const answer = (correct: boolean) => {
    const elapsedMs = Date.now() - shownAt;
    const answeredIndex = index;
    const current = card;

    const fd = new FormData();
    fd.set('cardId', current.id);
    fd.set('vocabularyId', String(current.vocabularyId));
    fd.set('direction', String(current.direction));
    fd.set('elapsedMs', String(Math.max(0, elapsedMs)));
    fd.set('correct', String(correct));
    fd.set('answer', '');

    setRevealed(false);
    setIndex((i) => i + 1);
    setShownAt(Date.now());

    void submitReviewAction({}, fd)
      .then((res) => {
        if (res.error) {
          setError(common('error'));
          return;
        }
        if (res.outcome) {
          const outcome = res.outcome;
          setOutcomes((prev) => {
            const next = [...prev];
            next[answeredIndex] = outcome;
            return next;
          });
        }
      })
      .catch(() => setError(common('error')));
  };

  const ratingBadge = outcome
    ? ['again', 'hard', 'good', 'easy'][outcome.rating - 1]
    : null;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      {deckTitle && (
        <p className="text-center text-xs font-semibold uppercase tracking-wider text-ink-400">{deckTitle}</p>
      )}

      {outcome && (
        <div
          className={`card flex items-center justify-between px-4 py-3 text-sm ${
            outcome.correct ? 'border-kintsugi-500/50' : 'border-shu-500/50'
          }`}
        >
          <span className="font-medium text-ink-700 dark:text-ink-200">
            {ratingBadge && <span className="chip mr-2 bg-ink-100 text-ink-700 dark:bg-ink-800 dark:text-ink-200">{ratingBadge}</span>}
            {outcome.correct ? t('correct') : t('incorrect')}
          </span>
          <span className="text-ink-500 dark:text-ink-400">
            {t('expGained', { exp: outcome.expGained })}
            {outcome.streakMilestone && <span className="ml-2 text-kintsugi-500">🏅</span>}
          </span>
        </div>
      )}

      {error && <p className="text-sm text-shu-500">{error}</p>}

      {/* Front */}
      <div className="card flex min-h-64 flex-col items-center justify-center gap-3 p-10 text-center">
        <p className="text-3xl font-semibold leading-relaxed text-ink-900 dark:text-washi-50">
          {card.from}
        </p>
        <p className="text-sm text-ink-400">{t('hint')}</p>

        {card.retrievability !== undefined && (
          <div className="flex w-full max-w-xs items-center gap-2 text-xs text-ink-400">
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-ink-200 dark:bg-ink-800">
              <div
                className="h-full rounded-full bg-kintsugi-500"
                style={{ width: `${Math.round((card.retrievability ?? 0) * 100)}%` }}
              />
            </div>
            {Math.round((card.retrievability ?? 0) * 100)}%
          </div>
        )}

        {!revealed && (
          <button type="button" onClick={() => { setRevealed(true); }} className="btn-primary mt-2">
            {t('showAnswer')}
          </button>
        )}
      </div>

      {/* Back */}
      <div
        className={`card flex flex-col gap-4 p-8 transition-opacity ${revealed ? 'opacity-100' : 'opacity-0 pointer-events-none absolute'}`}
      >
        <div className="text-center">
          <p className="text-3xl font-semibold text-shu-500">{card.to}</p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-sm text-ink-500 dark:text-ink-300">
            {card.romaji && <span className="chip bg-ink-100 dark:bg-ink-800">{card.romaji}</span>}
            <span className="chip bg-ink-100 dark:bg-ink-800">{card.hiragana}</span>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">{t('meaning')}</p>
            <p className="mt-0.5 text-ink-800 dark:text-ink-100">{card.meanings.join(' / ')}</p>
          </div>
          {card.exampleJapanese && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">{t('example')}</p>
              <p className="mt-0.5 leading-relaxed text-ink-800 dark:text-ink-100">{card.exampleJapanese}</p>
              {card.exampleMeaning && <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">{card.exampleMeaning}</p>}
            </div>
          )}
        </div>

        <div className="mt-2 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => answer(false)}
            className="btn-secondary border-shu-500/50 text-shu-500 hover:border-shu-500"
          >
            {t('iForgot')}
          </button>
          <button
            type="button"
            onClick={() => answer(true)}
            className="btn-primary"
          >
            {t('iKnew')}
          </button>
        </div>
      </div>
    </div>
  );
}