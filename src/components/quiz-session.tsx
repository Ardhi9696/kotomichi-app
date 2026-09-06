'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';

import { submitQuizSessionAction, type QuizAnswerOutput } from '@/app/actions/study';
import { speedForElapsed, type AnswerSpeed, type QuizMode, type QuizQuestion } from '@/lib/srs/quiz';

interface PendingAnswer {
  question: QuizQuestion;
  correct: boolean;
  elapsedMs: number;
  answer: string;
}

interface AnsweredQuestion {
  question: QuizQuestion;
  result: QuizAnswerOutput;
  speed: AnswerSpeed;
}

interface SessionAnswerDetail {
  vocabularyId: number;
  front: string;
  directions: {
    dir: number;
    elapsedMs: number;
    correct: boolean;
    speed: AnswerSpeed;
    expGained: number;
  }[];
}

const SPEED_LABELS: Record<AnswerSpeed, { labelKey: 'easyLabel' | 'goodLabel' | 'hardLabel'; className: string; badgeClass: string }> = {
  easy: { labelKey: 'easyLabel', className: 'text-emerald-600 dark:text-emerald-400', badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400' },
  good: { labelKey: 'goodLabel', className: 'text-kintsugi-600 dark:text-kintsugi-400', badgeClass: 'bg-kintsugi-500/10 text-kintsugi-600 dark:bg-kintsugi-500/20 dark:text-kintsugi-400' },
  hard: { labelKey: 'hardLabel', className: 'text-shu-600 dark:text-shu-400', badgeClass: 'bg-shu-500/10 text-shu-600 dark:bg-shu-500/20 dark:text-shu-400' },
};

const DIRECTION_NAMES: Record<number, string> = {
  1: 'Kanji → Arti',
  2: 'Kanji → Hiragana',
  3: 'Hiragana → Arti',
  4: 'Arti → Hiragana',
  5: 'Hiragana → Kanji',
  6: 'Arti → Kanji',
};

export function QuizSession({
  questions: initialQuestions,
  deckId,
  deckTitle,
  mode,
  sessionIndex = 0,
  totalSessions = 1,
  sessionId,
}: {
  questions: QuizQuestion[];
  deckId: number;
  deckTitle: string;
  mode: QuizMode;
  sessionIndex?: number;
  totalSessions?: number;
  sessionId?: number;
}) {
  const t = useTranslations('quiz');
  const common = useTranslations('common');
  const tLearn = useTranslations('learn');

  const [questions] = useState<QuizQuestion[]>(initialQuestions);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [pendingAnswers, setPendingAnswers] = useState<PendingAnswer[]>([]);
  const [answered, setAnswered] = useState<AnsweredQuestion[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const shownAt = useRef<number>(0);

  const question = questions[index];
  const total = questions.length;
  const done = index >= total;

  useEffect(() => {
    shownAt.current = Date.now();
  }, [index, done]);

  const toPayload = (a: PendingAnswer) => ({
    vocabularyId: a.question.vocabularyId,
    direction: a.question.directionId,
    elapsedMs: a.elapsedMs,
    correct: a.correct,
    answer: a.answer,
  });

  /** Client-known result (exp is patched in once the server confirms). */
  const optimistic = (a: PendingAnswer): AnsweredQuestion => ({
    question: a.question,
    result: {
      vocabularyId: a.question.vocabularyId,
      direction: a.question.directionId,
      correct: a.correct,
      elapsedMs: a.elapsedMs,
      expGained: 0,
    },
    speed: speedForElapsed(a.elapsedMs),
  });

  const submitAll = useCallback(async (answers: PendingAnswer[]) => {
    if (answers.length === 0) return;
    setSubmitting(true);
    setError(null);

    const fd = new FormData();
    fd.set('answers', JSON.stringify(answers.map(toPayload)));
    if (sessionId) fd.set('sessionId', String(sessionId));

    try {
      const res = await submitQuizSessionAction({}, fd);
      if (res.error) {
        setError(common('error'));
        return;
      }
      const confirmed = answers.map(optimistic).map((a, i) => ({
        ...a,
        result: res.results?.[i] ?? a.result,
      }));
      setAnswered((prev) => [...prev, ...confirmed]);
      setPendingAnswers((prev) => prev.slice(answers.length));
    } catch {
      setError(common('error'));
    } finally {
      setSubmitting(false);
    }
  }, [sessionId, common]);

  const choose = (optionText: string) => {
    if (!question || picked) return;
    // eslint-disable-next-line react-hooks/purity -- event handler, not render
    const elapsedMs = Math.max(0, Date.now() - shownAt.current);
    const correct = question.options.find((o) => o.text === optionText)?.correct ?? false;
    setPicked(optionText);

    const newAnswers = [...pendingAnswers, { question, correct, elapsedMs, answer: optionText }];
    setPendingAnswers(newAnswers);

    if (correct) {
      window.setTimeout(() => {
        setPicked(null);
        setIndex((i) => i + 1);
      }, 900);
    }

    // Last question answered — submit in the background while the summary
    // renders instantly from optimistic data.
    if (index + 1 >= total) {
      void submitAll(newAnswers);
    }
  };

  const nextQuestion = () => {
    setPicked(null);
    setIndex((i) => i + 1);
  };

  // ----- Summary (optimistic: rendered immediately, even before the final
  // batch answers are confirmed by the server) -----
  if (done) {
    if (total === 0) {
      return (
        <div className="card flex flex-col items-center gap-4 p-10 text-center">
          <p className="font-serif text-2xl text-ink-800 dark:text-washi-50">{t('noQuestions')}</p>
          <Link href="/dashboard" prefetch className="rounded-full bg-shu-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-shu-700">
            {common('back')}
          </Link>
        </div>
      );
    }

    const reviewed: AnsweredQuestion[] = [...answered, ...pendingAnswers.map(optimistic)];
    const correctCount = reviewed.filter((a) => a.result.correct).length;
    const expGained = reviewed.reduce((sum, a) => sum + a.result.expGained, 0);
    const speedCounts: Record<AnswerSpeed, number> = { easy: 0, good: 0, hard: 0 };
    for (const a of reviewed) speedCounts[a.speed] += 1;
    const avgSeconds = reviewed.length
      ? Math.round((reviewed.reduce((s, a) => s + a.result.elapsedMs, 0) / reviewed.length / 1000) * 10) / 10
      : 0;

    const byVocab = new Map<number, SessionAnswerDetail>();
    for (const a of reviewed) {
      const vid = a.question.vocabularyId;
      const existing = byVocab.get(vid) ?? { vocabularyId: vid, front: a.question.front, directions: [] };
      existing.directions.push({
        dir: a.question.directionId,
        elapsedMs: a.result.elapsedMs,
        correct: a.result.correct,
        speed: a.speed,
        expGained: a.result.expGained,
      });
      byVocab.set(vid, existing);
    }
    const vocabDetails = [...byVocab.values()].sort((a, b) => a.vocabularyId - b.vocabularyId);

    const isLastSession = sessionIndex >= totalSessions - 1;
    const saving = pendingAnswers.length > 0;

    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6 sm:p-8">
        <div className="text-center">
          <p className="font-serif text-3xl font-bold text-ink-900 dark:text-washi-50">{t('sessionComplete')}</p>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
            {t('sessionProgress', { current: sessionIndex + 1, total: totalSessions })}
          </p>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
            {t('summaryScore', { correct: correctCount, total: reviewed.length })}
          </p>
          {expGained > 0 && (
            <p className="mt-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
              {tLearn('expGained', { exp: expGained })}
            </p>
          )}
          {saving && (
            <p className="mt-2 flex items-center justify-center gap-2 text-xs text-ink-500 dark:text-ink-400">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              {t('submitting')}
            </p>
          )}
          {error && (
            <div className="mt-2 flex items-center justify-center gap-3 text-sm text-shu-600 dark:text-shu-400">
              <span>{common('error')}</span>
              <button
                type="button"
                className="rounded-full border border-shu-500/50 px-3 py-1 text-xs font-semibold transition-colors hover:bg-shu-500/10"
                onClick={() => setError(null)}
              >
                {t('tryAgain')}
              </button>
            </div>
          )}
        </div>

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

        {/* Per-vocabulary breakdown with direction details */}
        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-400">{t('perVocabulary')}</h3>
          <div className="flex flex-col gap-2">
            {vocabDetails.map((vocab) => (
              <div key={vocab.vocabularyId} className="rounded-xl border border-ink-200/70 bg-washi-50 p-4 dark:border-ink-800 dark:bg-ink-900/40">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-semibold text-ink-900 dark:text-washi-50">{vocab.front}</span>
                  <span className="text-xs text-ink-500 dark:text-ink-400">
                    {vocab.directions.length} {t('directions')}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                  {vocab.directions.map((d) => (
                    <div
                      key={d.dir}
                      className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium ${
                        d.correct
                          ? 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'
                          : 'bg-shu-500/10 text-shu-600 dark:bg-shu-500/20 dark:text-shu-400'
                      }`}
                    >
                      <span className="text-ink-500 dark:text-ink-400">{DIRECTION_NAMES[d.dir] ?? `Dir ${d.dir}`}</span>
                      <span className="font-mono">
                        {(d.elapsedMs / 1000).toFixed(1)}s
                      </span>
                      <span className={SPEED_LABELS[d.speed].badgeClass}>
                        {t(SPEED_LABELS[d.speed].labelKey)}
                      </span>
                      {!d.correct && <span className="text-shu-600 dark:text-shu-400">{t('again')}</span>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-ink-500 dark:text-ink-400">
          <span className="chip">{tLearn('correct')}: {correctCount}</span>
          <span className="chip">{t('avgTime', { seconds: String(avgSeconds) })}</span>
          <span className="chip">{t(mode === 'hard' ? 'modeHard' : 'modeNormal')}</span>
        </div>

        <div className="mt-1 flex flex-wrap items-center justify-center gap-3">
          {isLastSession ? (
            <>
              <Link href="/dashboard" prefetch className="rounded-full bg-shu-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-shu-700">
                {t('finish')} → {t('backToDashboard')}
              </Link>
              <Link href={`/learn?deck=${deckId}`} prefetch className="rounded-full border border-ink-300 px-4 py-2 text-sm font-semibold text-ink-600 transition-colors hover:border-ink-400 dark:border-ink-700 dark:text-washi-100 dark:hover:border-ink-500">
                {t('repeatDeck')}
              </Link>
            </>
          ) : (
            <>
              <Link
                href={`/quiz?deck=${deckId}&mode=${mode}&session=${sessionIndex + 1}`}
                prefetch
                className="rounded-full bg-shu-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-shu-700"
              >
                → {t('nextSession')} ({sessionIndex + 2}/{totalSessions})
              </Link>
              <Link href={`/learn?deck=${deckId}`} prefetch className="rounded-full border border-ink-300 px-4 py-2 text-sm font-semibold text-ink-600 transition-colors hover:border-ink-400 dark:border-ink-700 dark:text-washi-100 dark:hover:border-ink-500">
                {t('repeatDeck')}
              </Link>
              <Link href="/dashboard" prefetch className="rounded-full border border-ink-300 px-4 py-2 text-sm font-semibold text-ink-600 transition-colors hover:border-ink-400 dark:border-ink-700 dark:text-washi-100 dark:hover:border-ink-500">
                {t('backToDashboard')}
              </Link>
            </>
          )}
        </div>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="card flex flex-col items-center gap-4 p-10 text-center">
        <p className="font-serif text-2xl text-ink-800 dark:text-washi-50">{t('noQuestions')}</p>
        <Link href="/dashboard" prefetch className="rounded-full bg-shu-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-shu-700">
          {common('back')}
        </Link>
      </div>
    );
  }

  const reveal = picked !== null;
  const lastAnswer = pendingAnswers[pendingAnswers.length - 1] ?? null;
  const lastAnswerCorrect = lastAnswer?.correct ?? false;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      {/* Question Progress */}
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
        {submitting && (
          <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {t('syncing')}
          </span>
        )}
      </div>

      <p className="text-center text-sm font-semibold tracking-wide text-ink-500 dark:text-ink-400">{t('pickAnswer')}</p>

      {/* Front word */}
      <div className="card flex min-h-40 flex-col items-center justify-center gap-2 p-8 text-center">
        <p className="text-4xl font-semibold leading-relaxed text-ink-900 dark:text-washi-50">{question.front}</p>
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
          <p className={`text-sm font-semibold ${lastAnswerCorrect ? 'text-emerald-600 dark:text-emerald-400' : 'text-shu-600 dark:text-shu-400'}`}>
            {lastAnswerCorrect ? t('answerCorrect') : t('answerWrong')}
          </p>
          {!lastAnswerCorrect && (
            <button type="button" className="rounded-full bg-shu-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-shu-700" onClick={nextQuestion}>
              {t('next')} →
            </button>
          )}
        </div>
      )}
    </div>
  );
}