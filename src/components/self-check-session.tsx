'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';

import { submitSelfCheckAction } from '@/app/actions/study';
import { posLabel } from '@/lib/srs/pos-label';
import type { StudyCard } from '@/lib/domain';

const SWIPE_THRESHOLD = 64;

export function SelfCheckSession({
  cards: initialCards,
  deckTitle,
  deckId,
}: {
  cards: StudyCard[];
  deckTitle: string;
  deckId: number;
}) {
  const t = useTranslations('learn');
  const common = useTranslations('common');
  const [sessionCards, setSessionCards] = useState<StudyCard[]>(initialCards);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rememberedCards, setRememberedCards] = useState<StudyCard[]>([]);
  const [forgottenCards, setForgottenCards] = useState<StudyCard[]>([]);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const shownAt = useRef<number | null>(null);
  const skipClick = useRef(false);

  useEffect(() => {
    shownAt.current = Date.now();
  }, [index]);

  const total = sessionCards.length;
  const done = index >= total;
  const answered = Math.min(index, total);
  const progressPct = total === 0 ? 0 : Math.round((answered / total) * 100);

  const answer = async (correct: boolean) => {
    if (pending) return;
    const card = sessionCards[index];
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
    if (correct) {
      setRememberedCards((prev) => [...prev, card]);
    } else {
      setForgottenCards((prev) => [...prev, card]);
    }
    setIndex((i) => i + 1);
  };

  const repeatForgotten = () => {
    if (forgottenCards.length === 0) return;
    setSessionCards(forgottenCards);
    setIndex(0);
    setFlipped(false);
    setRememberedCards([]);
    setForgottenCards([]);
  };

  const repeatAll = () => {
    setSessionCards(initialCards);
    setIndex(0);
    setFlipped(false);
    setRememberedCards([]);
    setForgottenCards([]);
  };

  if (done) {
    const rememberedCount = rememberedCards.length;
    const forgottenCount = forgottenCards.length;

    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <div className="card flex flex-col items-center gap-3 p-8 text-center">
          <p className="font-serif text-3xl font-bold text-ink-900 dark:text-washi-50">{t('done')}</p>
          <p className="text-sm text-ink-500 dark:text-ink-400">
            {t('result', { remembered: rememberedCount, forgotten: forgottenCount })}
          </p>

          <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
            {forgottenCount > 0 && (
              <button
                type="button"
                onClick={repeatForgotten}
                className="btn-primary"
              >
                ↺ {t('repeatForgotten')} ({forgottenCount})
              </button>
            )}
            <button
              type="button"
              onClick={repeatAll}
              className="btn-secondary"
            >
              {t('repeatAll')}
            </button>
            <Link
              href="/dashboard"
              className={forgottenCount === 0 ? 'btn-primary' : 'btn-secondary'}
            >
              {t('finish')} → {t('backToDashboard')}
            </Link>
            <Link
              href={`/learn?deck=${deckId}`}
              className="btn-ghost text-xs text-ink-500 hover:text-ink-800 dark:hover:text-washi-50"
            >
              {t('repeatDeck')}
            </Link>
          </div>
        </div>

        {/* Summary lists of remembered and forgotten */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Forgotten / Belum Ingat */}
          <div className="card flex flex-col gap-3 p-5 border-shu-500/20">
            <div className="flex items-center justify-between border-b border-ink-100 pb-2 dark:border-ink-800">
              <h3 className="font-serif font-bold text-shu-600 dark:text-shu-400">
                {t('forgottenWords', { count: forgottenCount })}
              </h3>
              <span className="chip bg-shu-500/10 text-shu-600 dark:text-shu-400">
                {forgottenCount}
              </span>
            </div>

            {forgottenCount === 0 ? (
              <p className="py-6 text-center text-xs text-ink-400 dark:text-ink-500">
                {t('allRemembered')}
              </p>
            ) : (
              <div className="flex max-h-80 flex-col gap-2 overflow-y-auto pr-1">
                {forgottenCards.map((c) => (
                  <SummaryCardItem key={c.id} card={c} t={t} />
                ))}
              </div>
            )}
          </div>

          {/* Remembered / Sudah Ingat */}
          <div className="card flex flex-col gap-3 p-5 border-emerald-500/20">
            <div className="flex items-center justify-between border-b border-ink-100 pb-2 dark:border-ink-800">
              <h3 className="font-serif font-bold text-emerald-600 dark:text-emerald-400">
                {t('rememberedWords', { count: rememberedCount })}
              </h3>
              <span className="chip bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                {rememberedCount}
              </span>
            </div>

            {rememberedCount === 0 ? (
              <p className="py-6 text-center text-xs text-ink-400 dark:text-ink-500">
                {t('noneRemembered')}
              </p>
            ) : (
              <div className="flex max-h-80 flex-col gap-2 overflow-y-auto pr-1">
                {rememberedCards.map((c) => (
                  <SummaryCardItem key={c.id} card={c} t={t} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const card = sessionCards[index];

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
            {/* Back: shows Hiragana, Meaning (Arti), and Part of Speech */}
            <div className="card absolute inset-0 flex flex-col items-center justify-center gap-3 p-8 text-center [transform:rotateY(180deg)] [backface-visibility:hidden]">
              {/* Hiragana reading */}
              <p className="text-3xl font-bold tracking-wide text-ink-900 dark:text-washi-50">
                {card.hiragana}
              </p>

              {/* Meaning / Arti */}
              <p className="text-2xl font-semibold text-shu-500">
                {card.meanings?.length ? card.meanings.join(', ') : card.to}
              </p>

              {/* Tags: Part of speech, Kanji (if different), Romaji */}
              <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
                {card.partOfSpeech && (
                  <span className="chip bg-kintsugi-500/15 font-medium text-kintsugi-600 dark:bg-kintsugi-500/20 dark:text-kintsugi-300">
                    {posLabel(t, card.partOfSpeech)}
                  </span>
                )}
                {card.kanji && card.kanji !== card.hiragana && (
                  <span className="chip bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300">
                    {card.kanji}
                  </span>
                )}
                {card.romaji && (
                  <span className="chip bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300">
                    {card.romaji}
                  </span>
                )}
              </div>

              {card.exampleJapanese && (
                <div className="mt-2 max-w-sm rounded-lg bg-ink-50 px-3 py-2 text-left text-xs leading-relaxed text-ink-600 dark:bg-ink-800/50 dark:text-ink-300">
                  <p className="font-medium text-ink-800 dark:text-ink-100">{card.exampleJapanese}</p>
                  {card.exampleMeaning && (
                    <p className="mt-0.5 text-ink-500 dark:text-ink-400">{card.exampleMeaning}</p>
                  )}
                </div>
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

function SummaryCardItem({
  card,
  t,
}: {
  card: StudyCard;
  t: ReturnType<typeof useTranslations<'learn'>>;
}) {
  const primary = card.kanji ?? card.hiragana;
  const showHiraganaSub = card.kanji && card.kanji !== card.hiragana;
  const meaning = card.meanings?.length ? card.meanings.join(', ') : card.to;

  return (
    <div className="flex items-center justify-between rounded-xl border border-ink-200/60 bg-washi-50/60 p-3 text-left transition-colors dark:border-ink-800 dark:bg-ink-900/40">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-bold text-ink-900 dark:text-washi-50">{primary}</span>
          {showHiraganaSub && (
            <span className="text-xs text-ink-500 dark:text-ink-400">({card.hiragana})</span>
          )}
          {card.partOfSpeech && (
            <span className="chip px-1.5 py-0 text-[11px] bg-kintsugi-500/10 text-kintsugi-600 dark:bg-kintsugi-500/20 dark:text-kintsugi-300">
              {posLabel(t, card.partOfSpeech)}
            </span>
          )}
        </div>
        <p className="mt-0.5 truncate text-xs text-ink-600 dark:text-ink-300">{meaning}</p>
      </div>
      {card.romaji && (
        <span className="ml-2 shrink-0 text-xs text-ink-400 dark:text-ink-500">{card.romaji}</span>
      )}
    </div>
  );
}