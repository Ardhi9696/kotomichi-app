import type { Metadata } from 'next';
import { Suspense } from 'react';

import { requireLearner } from '@/lib/server/dal';
import { LearnShell } from '@/components/learn-shell';

export const metadata: Metadata = { title: 'Learn — Kotomichi' };

export default async function LearnPage() {
  await requireLearner();

  // Deck data loads via SWR in the client shell (instant learn-shaped
  // skeleton, cached across navigations) instead of blocking the server
  // render — the same pattern as /quiz.
  return (
    <Suspense>
      <LearnShell />
    </Suspense>
  );
}