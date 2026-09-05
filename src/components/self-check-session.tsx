'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';

import { submitSelfCheckAction } from '@/app/actions/study';
import type { StudyCard } from '@/lib/domain';

const SWIPE_THRESHOLD = 64;

export function SelfCheckSession({
  cards,
  deckTitle,
  deckId,
}: {
  cards: StudyCard[];
  deckTitle: string;
  deckId: number;
}) {
  const t = useTranslations('learn');
  const common = useTranslations('common');
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remembered, setRemembered] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const shownAt = useRef<number | null>(null);
  const skipClick = useRef(false);

  useEffect(() => {
    shownAt.current = Date.now();
  }, [index]);

  const total = cards.length;
  const done = index >= total;
  const answered = Math.min(index, total);
  const progressPct = total === 0 ? 0 : Math.round((answered / total) * 100);

  const answer = async (correct: boolean) => {
    if (pending) return;
    const card = cards[index];
    if (!card) return;
    const start = shownAt.current ?? Date.now();
    const elapsedMs = Date.now() - start;
    shownAt.current = Date.now();
    skipClick.current = true;
    setPending(true);
    setError(null);
    setFlipped(false);
    setDragX(0);

    const fd = new FormData();
    fd.set('vocabularyId', String(card.vocabularyId));
    fd.set('direction', String(card.direction));
    fd.set('elapsedMs', String(Math.max(0, elapsedMs)));
    fd.set('correct', String(correct));

    const res = await submitSelfCheckAction({}, fd);
    setPending(false);
    if (res.error) {
      setError(common('error'));
      return;
    }
    if (correct) setRemembered((r) => r + 1);
    setIndex((i) => i + 1);
  };

  if (done) {
    const forgotten = total - remembered;
    return (
      <div className="card flex flex-col items-center gap-4 p-10 text-center">
        <p className="font-serif text-2xl text-ink-800 dark:text-washi-50">{t('done')}</p>
        <p className="text-sm text-ink-500 dark:text-ink-400">
          {t('result', { remembered, forgotten })}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Link href={`/learn?deck=${deckId}`} className="btn-secondary">
            {t('repeatDeck')}
          </Link>
          <Link href="/dashboard" className="btn-primary">
            {t('backToDashboard')}
          </Link>
        </div>
      </div>
    );
  }

  const card = cards[index];

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pending) return;
    startX.current = e.clientX;
    startY.current = e.clientY;
    setDragging(true);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (startX.current === null || startY.current === null) return;
    const dx = e.clientX - startX.current;
    const dy = e.clientY - startY.current;
    if (Math.abs(dx) > Math.abs(dy)) setDragX(dx);
  };

  const onPointerUp = () => {
    if (startX.current === null) return;
    startX.current = null;
    startY.current = null;
    setDragging(false);
    const dx = Math.abs(dragX) >= SWIPE_THRESHOLD ? dragX : 0;
    setDragX(0);
    if (dx !== 0) void answer(dx > 0);
  };

  const onCardClick = () => {
    if (skipClick.current) {
      skipClick.current = false;
      return;
    }
    setFlipped((f) => !f);
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold uppercase tracking-wider text-ink-400">{deckTitle}</span>
        <span className="text-ink-500 dark:text-ink-400">
          {index + 1} / {total}
        </span>
      </div>

      <div className="flex items-center gap-2 text-xs">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-200 dark:bg-ink-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-shu-500 to-kintsugi-500 transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <span className="w-10 text-right text-ink-500 dark:text-ink-400">{progressPct}%</span>
      </div>

      <p className="text-center text-xs text-ink-500 dark:text-ink-400">
        {t('swipeHint')} · {t('flipHint')}
      </p>

      {error && <p className="text-center text-sm text-shu-500">{error}</p>}

      <div
        className="[perspective:1200px]"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        <button
          type="button"
          onClick={onCardClick}
          disabled={pending}
          className="relative block h-80 w-full select-none outline-none"
          aria-label={t('flipHint')}
        >
          <div
            className={`relative h-full w-full transition-transform duration-300 [transform-style:preserve-3d] ${
              flipped ? '[transform:rotateY(180deg)]' : ''
            } ${dragging ? 'pointer-events-none' : ''}`}
            style={{ transform: dragging ? `translateX(${dragX}px) rotate(${dragX / 14}deg)` : undefined }}
          >
            {/* Front */}
            <div className="card absolute inset-0 flex flex-col items-center justify-center gap-3 p-10 text-center [backface-visibility:hidden]">
              <p className="text-5xl font-semibold leading-relaxed text-ink-900 dark:text-washi-50">
                {card.from}
              </p>
              <p className="text-sm text-ink-400">{t('fromHint')}</p>
            </div>
            {/* Back */}
            <div className="card absolute inset-0 flex flex-col items-center justify-center gap-3 p-10 text-center [transform:rotateY(180deg)] [backface-visibility:hidden]">
              <p className="text-4xl font-semibold text-shu-500">{card.to}</p>
              <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-ink-500 dark:text-ink-300">
                {card.kanji && <span className="chip bg-ink-100 dark:bg-ink-800">{card.kanji}</span>}
                {card.romaji && <span className="chip bg-ink-100 dark:bg-ink-800">{card.romaji}</span>}
              </div>
              {card.exampleJapanese && (
                <p className="mt-1 max-w-sm text-sm leading-relaxed text-ink-600 dark:text-ink-300">
                  {card.exampleJapanese}
                  {card.exampleMeaning && (
                    <span className="mt-0.5 block text-ink-400">{card.exampleMeaning}</span>
                  )}
                </p>
              )}
            </div>
          </div>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={() => void answer(false)}
          className="rounded-xl border border-shu-500/50 px-4 py-3 font-medium text-shu-600 transition-colors hover:bg-shu-500/10 disabled:opacity-50 dark:text-shu-300"
        >
          {t('notYet')}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => void answer(true)}
          className="rounded-xl border border-emerald-500/60 bg-emerald-500/10 px-4 py-3 font-medium text-emerald-600 transition-colors hover:bg-emerald-500/20 disabled:opacity-50 dark:text-emerald-300"
        >
          {t('remember')}
        </button>
      </div>
    </div>
  );
}