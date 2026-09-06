import type { Metadata } from 'next';

import { loadReviewPageData } from '@/lib/server/page-data';
import { ReviewShell } from '@/components/review-shell';

export const metadata: Metadata = { title: 'Review — Kotomichi' };

export default async function ReviewPage() {
  const data = await loadReviewPageData();
  return <ReviewShell initial={data} />;
}