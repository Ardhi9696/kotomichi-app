import type { Metadata } from 'next';
import { Suspense } from 'react';

import { requireLearner } from '@/lib/server/dal';
import { QuizShell } from '@/components/quiz-shell';

export const metadata: Metadata = { title: 'Quiz — Kotomichi' };

export default async function QuizPage() {
  await requireLearner();

  // Quiz sessions are loaded client-side via SWR (thin shell), so switching
  // between sessions serves cached questions without a server round-trip.
  return (
    <Suspense>
      <QuizShell />
    </Suspense>
  );
}