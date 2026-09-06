'use server';

import { loadLearnPageData, loadReviewPageData } from '@/lib/server/page-data';
import type { LearnPageData, ReviewPageData } from '@/lib/page-data/types';

/** SWR fetcher for the /review snapshot (same reads as SSR). */
export async function fetchReviewPageData(): Promise<ReviewPageData> {
  return loadReviewPageData();
}

/** SWR fetcher for the /learn snapshot keyed by deck (same reads as SSR). */
export async function fetchLearnPageData(deckId: number): Promise<LearnPageData | null> {
  return loadLearnPageData(deckId);
}