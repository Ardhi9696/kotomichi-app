'use server';

import {
  loadDashboardPageData,
  loadLearnPageData,
  loadQuizPageData,
  loadReviewPageData,
  loadWordsPageData,
} from '@/lib/server/page-data';
import type {
  DashboardPageData,
  LearnPageData,
  QuizPageData,
  ReviewPageData,
  WordsPageData,
} from '@/lib/page-data/types';
import type { QuizMode } from '@/lib/srs/quiz';

/** SWR fetcher for the /review snapshot (same reads as SSR). */
export async function fetchReviewPageData(): Promise<ReviewPageData> {
  return loadReviewPageData();
}

/** SWR fetcher for the /dashboard snapshot (same reads as SSR). */
export async function fetchDashboardPageData(): Promise<DashboardPageData> {
  return loadDashboardPageData();
}

/** SWR fetcher for the /words snapshot keyed by the search query. */
export async function fetchWordsPageData(query: string): Promise<WordsPageData> {
  return loadWordsPageData(query);
}

/** SWR fetcher for the /learn snapshot keyed by deck (same reads as SSR). */
export async function fetchLearnPageData(deckId: number): Promise<LearnPageData | null> {
  return loadLearnPageData(deckId);
}

/** SWR fetcher for a /quiz session snapshot keyed by (deck, mode, session). */
export async function fetchQuizPageData(
  deckId: number,
  mode: QuizMode,
  sessionIndex: number,
): Promise<QuizPageData | null> {
  return loadQuizPageData(deckId, mode, sessionIndex);
}