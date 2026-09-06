import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';

import { requireLearner, getStudyContext } from '@/lib/server/dal';
import { QuizSession } from '@/components/quiz-session';
import { buildQuizSession, type QuizMode } from '@/lib/srs/quiz';

export const metadata: Metadata = { title: 'Quiz — Kotomichi' };

const WORDS_PER_SESSION = 5;

export default async function QuizPage({
  searchParams,
}: {
  searchParams: Promise<{ deck?: string; mode?: string; session?: string }>;
}) {
  await requireLearner();
  const t = await getTranslations('learn');
  const tq = await getTranslations('quiz');
  const { deck, mode: rawMode, session: rawSession } = await searchParams;
  const deckId = Number(deck);
  const mode: QuizMode = rawMode === 'hard' ? 'hard' : 'normal';
  const sessionIndex = rawSession ? Number(rawSession) : 0;

  const { user, profile, repo, service } = await getStudyContext();
  const now = new Date().toISOString();
  const locale = profile.preferredLocale;

  const states = await service.decksWithProgress(user.id, locale, now);
  const active = states.find((s) => s.deck.id === deckId && !s.deck.isLocked);
  if (!active) redirect('/learn');

  const words = await repo.getDeckWords(active.deck.id);
  const totalWords = words.length;
  const totalSessions = Math.ceil(totalWords / WORDS_PER_SESSION);

  // Clamp session index
  const clampedSessionIndex = Math.max(0, Math.min(sessionIndex, totalSessions - 1));

  // If user is trying to access a different session, redirect
  if (clampedSessionIndex !== sessionIndex) {
    redirect(`/quiz?deck=${deckId}&mode=${mode}&session=${clampedSessionIndex}`);
  }

  // Get or create quiz session for this specific session index
  const quizSession = await repo.createQuizSession(user.id, active.deck.id, mode, totalSessions, clampedSessionIndex);

  // Get words for this session
  const sessionWords = words.slice(clampedSessionIndex * WORDS_PER_SESSION, (clampedSessionIndex + 1) * WORDS_PER_SESSION);
  const questions = buildQuizSession(sessionWords, locale, mode);

  if (questions.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <div className="card flex flex-col items-center gap-4 p-10 text-center">
          <h1 className="font-serif text-3xl font-bold text-ink-900 dark:text-washi-50">{t('quizTitle')}</h1>
          <p className="text-sm text-ink-500 dark:text-ink-400">{t('noCards')}</p>
        </div>
      </div>
    );
  }

  // Overall deck progress (across all sessions)
  const overallProgress = totalSessions > 0 ? ((clampedSessionIndex + 1) / totalSessions) * 100 : 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Overall Deck Progress Bar */}
      <div className="card p-4">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="font-semibold uppercase tracking-wider text-ink-400">
            {tq('deckProgress')} {clampedSessionIndex + 1} / {totalSessions} {tq('sessions')}
          </span>
          <span className="text-ink-500 dark:text-ink-400">
            {tq('wordsTotal', { current: (clampedSessionIndex + 1) * WORDS_PER_SESSION, total: totalWords })}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-ink-200 dark:bg-ink-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-shu-500 to-kintsugi-500 transition-all"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
      </div>

      <div className="text-center">
        <h1 className="font-serif text-3xl font-bold text-ink-900 dark:text-washi-50">{t('quizTitle')}</h1>
        <p className="mt-1 text-sm text-ink-600 dark:text-ink-300">
          {tq(mode === 'hard' ? 'modeHardDescription' : 'modeNormalDescription')}
        </p>
      </div>
      <QuizSession 
        key={quizSession.id}
        questions={questions} 
        deckId={active.deck.id} 
        deckTitle={active.deck.title} 
        mode={mode}
        sessionIndex={clampedSessionIndex}
        totalSessions={totalSessions}
        sessionId={quizSession.id}
      />
    </div>
  );
}