'use server';

import { requireUser, getStudyContext } from '@/lib/server/dal';
import type { Direction } from '@/lib/srs/directions';
import type { QuizAnswerResult, ReviewOutcome, StudyCard } from '@/lib/domain';

export interface SubmitReviewState {
  outcome?: ReviewOutcome;
  next?: StudyCard | null;
  error?: string;
}

export async function submitReviewAction(_prev: SubmitReviewState, formData: FormData): Promise<SubmitReviewState> {
  const { profile } = await requireUser();
  const ctx = await getStudyContext();

  const vocabularyId = Number(formData.get('vocabularyId'));
  const direction = Number(formData.get('direction')) as Direction;
  const elapsedMs = Number(formData.get('elapsedMs') ?? 0);
  const correct = formData.get('correct') === 'true';

  if (!Number.isFinite(vocabularyId) || !Number.isFinite(elapsedMs)) {
    return { error: 'invalid' };
  }

  try {
    const result = await ctx.service.submit(
      profile,
      { cardId: String(formData.get('cardId') ?? ''), vocabularyId, direction, elapsedMs, correct, answer: String(formData.get('answer') ?? '') },
      new Date().toISOString(),
      profile.preferredLocale,
    );
    return { outcome: result.outcome, next: result.next };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'unknown' };
  }
}

export interface SubmitSelfCheckState {
  ok?: boolean;
  error?: string;
}

/**
 * Record one quiz answer. The kindness=eligibility and correctness are
 * decided on the client (the option set is shown as-is); the server
 * validates the inputs and runs the usual study roundtrip so a *new* quiz
 * word earns EXP and moves into the SRS schedule exactly like a review.
 */
export async function submitQuizAnswerAction(
  _prev: QuizAnswerResult | null,
  formData: FormData,
): Promise<QuizAnswerResult> {
  const { profile } = await requireUser();
  const ctx = await getStudyContext();

  const vocabularyId = Number(formData.get('vocabularyId'));
  const direction = Number(formData.get('direction')) as Direction;
  const elapsedMs = Number(formData.get('elapsedMs') ?? 0);
  const correct = formData.get('correct') === 'true';

  if (!Number.isFinite(vocabularyId) || !Number.isFinite(elapsedMs)) {
    return { error: 'invalid' };
  }

  try {
    const result = await ctx.service.submit(
      profile,
      {
        cardId: `quiz:${vocabularyId}:${direction}`,
        vocabularyId,
        direction,
        elapsedMs,
        correct,
        answer: String(formData.get('answer') ?? ''),
      },
      new Date().toISOString(),
      profile.preferredLocale,
    );
    return {
      correct,
      elapsedMs,
      expGained: result.outcome.expGained,
      nextStreak: result.outcome.nextStreak,
      streakMilestone: result.outcome.streakMilestone,
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'unknown' };
  }
}

/** Subjective self-assessment: saves progress but awards no exp/streak. */
export async function submitSelfCheckAction(
  _prev: SubmitSelfCheckState,
  formData: FormData,
): Promise<SubmitSelfCheckState> {
  const { profile } = await requireUser();
  const ctx = await getStudyContext();

  const vocabularyId = Number(formData.get('vocabularyId'));
  const direction = Number(formData.get('direction')) as Direction;
  const elapsedMs = Number(formData.get('elapsedMs') ?? 0);
  const correct = formData.get('correct') === 'true';

  if (!Number.isFinite(vocabularyId) || !Number.isFinite(elapsedMs)) {
    return { error: 'invalid' };
  }

  try {
    await ctx.service.submitSelfCheck(
      profile,
      { cardId: '', vocabularyId, direction, elapsedMs, correct, answer: String(formData.get('answer') ?? '') },
      new Date().toISOString(),
    );
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'unknown' };
  }
}