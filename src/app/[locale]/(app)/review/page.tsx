import type { Metadata } from 'next';
import { Suspense } from 'react';

import { requireLearner } from '@/lib/server/dal';
import { ReviewShell } from '@/components/review-shell';

export const metadata: Metadata = { title: 'Review — Kotomichi' };

export default async function ReviewPage() {
  await requireLearner();

  return (
    <Suspense>
      <ReviewShell />
    </Suspense>
  );
}