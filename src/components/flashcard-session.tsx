'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';

import { submitReviewAction } from '@/app/actions/study';
import type { ReviewOutcome, StudyCard } from '@/lib/domain';

type Kind = 'learn' | 'review';

export function FlashcardSession({
  initial,
  kind,
  deckTitle,
}: {
  initial: StudyCard | null;
  kind: Kind;
  deckTitle?: string;
}) {
  const t = useTranslations(kind === 'learn' ? 'learn' : 'review');
  const common = useTranslations('common');

  const [card, setCard] = useState<StudyCard | null>(initial);
  const [outcome, setOutcome] = useState<ReviewOutcome | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(!initial);
  const [isPending, startTransition] = useTransition();
  const [shownAt, setShownAt] = useState(() => Date.now());

  if (done || !card) {
    return (
      <div className="card flex flex-col items-center gap-4 p-10 text-center">
        <p className="font-serif text-2xl text-ink-800 dark:text-washi-50">{t('done')}</p>
        {kind === 'learn' && <p className="text-sm text-ink-500 dark:text-ink-400">{t('sessionDone')}</p>}
        <a href={kind === 'learn' ? '/dashboard' : '/dashboard'} className="btn-secondary">
          {common('back')}
        </a>
      </div>
    );
  }

  const answer = (correct: boolean) => {
    const elapsedMs = Date.now() - shownAt;
    const fd = new FormData();
    fd.set('cardId', card.id);
    fd.set('vocabularyId', String(card.vocabularyId));
    fd.set('direction', String(card.direction));
    fd.set('elapsedMs', String(Math.max(0, elapsedMs)));
    fd.set('correct', String(correct));
    fd.set('answer', '');

    setRevealed(false);
    startTransition(async () => {
      const res = await submitReviewAction({}, fd);
      if (res.error) {
        setError(common('error'));
        return;
      }
      setOutcome(res.outcome ?? null);
      setCard(res.next ?? null);
      if (res.next) setShownAt(Date.now());
      if (!res.next) setDone(true);
    });
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
      {isPending && <p className="text-sm text-ink-400">{common('loading')}</p>}

      {/* Front */}
      <div className="card flex min-h-64 flex-col items-center justify-center gap-3 p-10 text-center">
        <p className="text-3xl font-semibold leading-relaxed text-ink-900 dark:text-washi-50">
          {card.from}
        </p>
        <p className="text-sm text-ink-400">{t(kind === 'learn' ? 'fromHint' : 'hint')}</p>

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
          <button type="button" onClick={() => { setRevealed(true); setOutcome(null); }} className="btn-primary mt-2">
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
            disabled={isPending}
            onClick={() => answer(false)}
            className="btn-secondary border-shu-500/50 text-shu-500 hover:border-shu-500"
          >
            {t('iForgot')}
          </button>
          <button
            type="button"
            disabled={isPending}
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