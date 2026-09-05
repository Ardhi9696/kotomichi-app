'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';

import { submitQuizAnswerAction } from '@/app/actions/study';
import { speedForElapsed, type AnswerSpeed, type QuizMode, type QuizQuestion } from '@/lib/srs/quiz';
import type { QuizAnswerResult } from '@/lib/domain';

interface AnsweredQuestion {
  question: QuizQuestion;
  correct: boolean;
  elapsedMs: number;
  speed: AnswerSpeed;
  expGained: number;
}

const AUTO_NEXT_DELAY_MS = 900;

const SPEED_LABELS: Record<AnswerSpeed, { labelKey: 'easyLabel' | 'goodLabel' | 'hardLabel'; className: string }> = {
  easy: { labelKey: 'easyLabel', className: 'text-emerald-600 dark:text-emerald-400' },
  good: { labelKey: 'goodLabel', className: 'text-kintsugi-600 dark:text-kintsugi-400' },
  hard: { labelKey: 'hardLabel', className: 'text-shu-600 dark:text-shu-400' },
};

export function QuizSession({
  questions: initialQuestions,
  deckId,
  deckTitle,
  mode,
}: {
  questions: QuizQuestion[];
  deckId: number;
  deckTitle: string;
  mode: QuizMode;
}) {
  const t = useTranslations('quiz');
  const common = useTranslations('common');
  const tLearn = useTranslations('learn');

  const [questions] = useState<QuizQuestion[]>(initialQuestions);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [result, setResult] = useState<QuizAnswerResult | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [answered, setAnswered] = useState<AnsweredQuestion[]>([]);
  const shownAt = useRef<number>(0);

  const question = questions[index];
  const total = questions.length;
  const done = index >= total;

  useEffect(() => {
    shownAt.current = Date.now();
  }, [index, done]);

  const resetToState = () => {
    setPicked(null);
    setResult(null);
    setError(null);
    setPending(false);
    setIndex((i) => i + 1);
  };

  const choose = (optionText: string) => {
    if (!question || pending || picked) return;
    // eslint-disable-next-line react-hooks/purity -- event handler, not render
    const elapsedMs = Math.max(0, Date.now() - shownAt.current);
    const correct = question.options.find((o) => o.text === optionText)?.correct ?? false;
    setPicked(optionText);

    const fd = new FormData();
    fd.set('vocabularyId', String(question.vocabularyId));
    fd.set('direction', String(question.directionId));
    fd.set('elapsedMs', String(elapsedMs));
    fd.set('correct', String(correct));
    fd.set('answer', optionText);

    setPending(true);
    setError(null);
    void submitQuizAnswerAction(null, fd).then((res) => {
      setPending(false);
      if ('error' in res) {
        setError(common('error'));
        setPicked(null);
        return;
      }
      setResult(res);
      setAnswered((prev) => [
        ...prev,
        { question, correct: res.correct, elapsedMs: res.elapsedMs, speed: speedForElapsed(res.elapsedMs), expGained: res.expGained },
      ]);
      if (res.correct) {
        window.setTimeout(resetToState, AUTO_NEXT_DELAY_MS);
      }
    });
  };

  // ----- Summary screen -----
  if (done) {
    const correctCount = answered.filter((a) => a.correct).length;
    const expGained = answered.reduce((sum, a) => sum + a.expGained, 0);
    const speedCounts: Record<AnswerSpeed, number> = { easy: 0, good: 0, hard: 0 };
    for (const a of answered) speedCounts[a.speed] += 1;
    const avgSeconds = answered.length
      ? Math.round((answered.reduce((s, a) => s + a.elapsedMs, 0) / answered.length / 1000) * 10) / 10
      : 0;

    // Direction-level breakdown
    const byDir = new Map<number, { correct: number; total: number }>();
    for (const a of answered) {
      const dir = a.question.directionId;
      const cur = byDir.get(dir) ?? { correct: 0, total: 0 };
      cur.total += 1;
      if (a.correct) cur.correct += 1;
      byDir.set(dir, cur);
    }
    const dirSummaries = [...byDir.entries()]
      .sort(([a], [b]) => a - b)
      .map(([dirId, stats]) => ({
        dirId,
        label: answered.find((a) => a.question.directionId === dirId)?.question.directionLabel,
        ...stats,
      }));

    return (
      <div className="card mx-auto flex w-full max-w-2xl flex-col gap-6 p-6 sm:p-8">
        <div className="text-center">
          <p className="font-serif text-3xl font-bold text-ink-900 dark:text-washi-50">{t('summaryTitle')}</p>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
            {t('summaryScore', { correct: correctCount, total: answered.length })}
          </p>
          {expGained > 0 && (
            <p className="mt-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
              {tLearn('expGained', { exp: expGained })}
            </p>
          )}
        </div>

        {/* Direction breakdown */}
        {dirSummaries.length > 0 && (
          <div className="flex flex-col gap-2 text-sm">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-400">{t('byDirection')}</h3>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-3">
              {dirSummaries.map((ds) => (
                <div key={ds.dirId} className="flex items-center justify-between rounded-xl border border-ink-200/70 bg-washi-50 px-3 py-2 dark:border-ink-800 dark:bg-ink-900/40">
                  <span className="text-xs text-ink-600 dark:text-ink-300">
                    {ds.label?.source} → {ds.label?.target}
                  </span>
                  <span className={`font-semibold ${ds.correct === ds.total ? 'text-emerald-600 dark:text-emerald-400' : 'text-ink-500'}`}>
                    {ds.correct}/{ds.total}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Speed buckets */}
        <div className="grid grid-cols-3 gap-3 text-center">
          {(Object.keys(SPEED_LABELS) as AnswerSpeed[]).map((speed) => (
            <div key={speed} className="rounded-xl border border-ink-200/70 bg-washi-50 p-4 dark:border-ink-800 dark:bg-ink-900/40">
              <p className="text-2xl font-bold text-ink-900 dark:text-washi-50">{speedCounts[speed]}</p>
              <p className={`mt-0.5 text-xs font-semibold uppercase tracking-wide ${SPEED_LABELS[speed].className}`}>
                {t(SPEED_LABELS[speed].labelKey)}
              </p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-ink-500 dark:text-ink-400">
          <span className="chip">{tLearn('correct')}: {correctCount}</span>
          <span className="chip">{t('avgTime', { seconds: String(avgSeconds) })}</span>
          <span className="chip">{t(mode === 'hard' ? 'modeHard' : 'modeNormal')}</span>
        </div>

        <div className="mt-1 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            className="rounded-full border border-ink-300 px-4 py-2 text-sm font-semibold text-ink-600 transition-colors hover:border-ink-400 dark:border-ink-700 dark:text-washi-100 dark:hover:border-ink-500"
            onClick={() => {
              setIndex(0);
              setAnswered([]);
              setPicked(null);
              setResult(null);
            }}
          >
            ↺ {t('repeatSession')}
          </button>
          <Link href={`/learn?deck=${deckId}`} className="rounded-full border border-ink-300 px-4 py-2 text-sm font-semibold text-ink-600 transition-colors hover:border-ink-400 dark:border-ink-700 dark:text-washi-100 dark:hover:border-ink-500">
            {t('repeatDeck')}
          </Link>
          <Link href="/dashboard" className="rounded-full bg-shu-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-shu-700">
            {t('backToDashboard')}
          </Link>
        </div>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="card flex flex-col items-center gap-4 p-10 text-center">
        <p className="font-serif text-2xl text-ink-800 dark:text-washi-50">{t('noQuestions')}</p>
        <Link href="/dashboard" className="rounded-full bg-shu-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-shu-700">
          {common('back')}
        </Link>
      </div>
    );
  }

  const reveal = picked !== null;
  const lastResultCorrect = result !== null && 'correct' in result && result.correct;
  const expGainedNow = result !== null && 'expGained' in result ? result.expGained : 0;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold uppercase tracking-wider text-ink-400">{deckTitle}</span>
        <span className="text-ink-500 dark:text-ink-400">
          {tLearn('quiz')} · {Math.min(index + 1, total)} / {total}
        </span>
      </div>

      <div className="flex items-center gap-2 text-xs">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-200 dark:bg-ink-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-shu-500 to-kintsugi-500 transition-all"
            style={{ width: `${Math.round((index / total) * 100)}%` }}
          />
        </div>
        <span className="w-10 text-right text-ink-500 dark:text-ink-400">{Math.round((index / total) * 100)}%</span>
      </div>

      {/* Direction badge */}
      <div className="flex items-center justify-center gap-2">
        <span className="rounded-full bg-shu-500/10 px-3 py-1 text-xs font-semibold text-shu-600 dark:text-shu-300">
          {question.directionLabel.source} → {question.directionLabel.target}
        </span>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
          mode === 'hard'
            ? 'bg-kintsugi-500/10 text-kintsugi-600 dark:text-kintsugi-300'
            : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300'
        }`}>
          {t(mode === 'hard' ? 'modeHard' : 'modeNormal')}
        </span>
      </div>

      <p className="text-center text-sm font-semibold tracking-wide text-ink-500 dark:text-ink-400">{t('pickAnswer')}</p>

      {error && <p className="text-center text-sm text-shu-500">{error}</p>}
      {pending && !reveal && <p className="text-center text-sm text-ink-400">{common('loading')}</p>}

      {/* Front word */}
      <div className="card flex min-h-40 flex-col items-center justify-center gap-2 p-8 text-center">
        <p className="text-4xl font-semibold leading-relaxed text-ink-900 dark:text-washi-50">{question.front}</p>
        {question.hint && (
          <p className="text-2xl font-medium text-ink-500 dark:text-ink-300">{question.hint}</p>
        )}
      </div>

      {/* 4 options */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {question.options.map((opt) => {
          let classes = 'rounded-xl border px-4 py-3 text-left font-medium transition-colors disabled:opacity-100 ';
          if (reveal) {
            if (opt.correct) {
              classes += 'border-emerald-500/60 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
            } else if (opt.text === picked) {
              classes += 'border-shu-500/60 bg-shu-500/10 text-shu-600 dark:text-shu-300';
            } else {
              classes += 'border-ink-200/60 text-ink-400 dark:border-ink-800 dark:text-ink-500';
            }
          } else {
            classes += opt.text === picked
              ? 'border-shu-500 bg-shu-500/10 text-ink-800 dark:border-shu-400 dark:text-washi-50'
              : 'border-ink-200/60 text-ink-800 hover:border-kintsugi-500/50 dark:border-ink-700 dark:text-washi-50';
          }
          return (
            <button key={opt.text} type="button" disabled={reveal} onClick={() => choose(opt.text)} className={classes}>
              {reveal && opt.correct && <span className="mr-2 text-emerald-500">✓</span>}
              {reveal && !opt.correct && opt.text === picked && <span className="mr-2 text-shu-500">✗</span>}
              {opt.text}
            </button>
          );
        })}
      </div>

      {reveal && (
        <div className="mt-1 flex flex-col items-center gap-2">
          <p className={`text-sm font-semibold ${lastResultCorrect ? 'text-emerald-600 dark:text-emerald-400' : 'text-shu-600 dark:text-shu-400'}`}>
            {lastResultCorrect ? t('answerCorrect') : t('answerWrong')}
            {lastResultCorrect && expGainedNow > 0 && (
              <span className="ml-2 text-emerald-600 dark:text-emerald-400">
                {tLearn('expGained', { exp: expGainedNow })}
              </span>
            )}
          </p>
          {!lastResultCorrect && (
            <button type="button" className="rounded-full bg-shu-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-shu-700" onClick={resetToState}>
              {t('next')} →
            </button>
          )}
        </div>
      )}
    </div>
  );
}