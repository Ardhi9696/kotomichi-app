import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';

import { requireLearner, getStudyContext } from '@/lib/server/dal';
import { QuizSession } from '@/components/quiz-session';
import { buildQuizSession, type QuizMode } from '@/lib/srs/quiz';

export const metadata: Metadata = { title: 'Quiz — Kotomichi' };

export default async function QuizPage({
  searchParams,
}: {
  searchParams: Promise<{ deck?: string; mode?: string }>;
}) {
  await requireLearner();
  const t = await getTranslations('learn');
  const tq = await getTranslations('quiz');
  const { deck, mode: rawMode } = await searchParams;
  const deckId = Number(deck);
  const mode: QuizMode = rawMode === 'hard' ? 'hard' : 'normal';

  const { user, profile, repo, service } = await getStudyContext();
  const now = new Date().toISOString();
  const locale = profile.preferredLocale;

  const states = await service.decksWithProgress(user.id, locale, now);
  const active = states.find((s) => s.deck.id === deckId && !s.deck.isLocked);
  if (!active) redirect('/learn');

  const words = await repo.getDeckWords(active.deck.id);
  const questions = buildQuizSession(words, locale, mode);

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

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h1 className="font-serif text-3xl font-bold text-ink-900 dark:text-washi-50">{t('quizTitle')}</h1>
        <p className="mt-1 text-sm text-ink-600 dark:text-ink-300">
          {tq(mode === 'hard' ? 'modeHardDescription' : 'modeNormalDescription')}
        </p>
      </div>
      <QuizSession questions={questions} deckId={active.deck.id} deckTitle={active.deck.title} mode={mode} />
    </div>
  );
}