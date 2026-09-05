'use server';

import { requireUser, getStudyContext } from '@/lib/server/dal';
import type { Direction } from '@/lib/srs/directions';
import type { ReviewOutcome, StudyCard } from '@/lib/domain';

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