'use client';

import { preload } from 'swr';
import useSWR from 'swr';
import { useEffect } from 'react';

import { fetchDashboardPageData, fetchLearnPageData, fetchQuizPageData, fetchReviewPageData, fetchWordsPageData } from '@/app/actions/page-data';

/**
 * Boot-time data warm-up for non-admin learners. After the first paint it
 * fetches the snapshots for the primary study pages (SWR keys match each
 * page's shell exactly), so in-app navigation to a page that's never been
 * visited still renders instantly without a skeleton. Only a hard refresh
 * (empty SWR cache) ever shows a loading state.
 */
export function StudyDataWarmup() {
  const { data: learn } = useSWR('learn-data:', () => fetchLearnPageData(0));

  useEffect(() => {
    void preload('dashboard-data', fetchDashboardPageData);
    void preload('review-data', fetchReviewPageData);
    void preload('words-data:', () => fetchWordsPageData(''));
    void preload('learn-data:', () => fetchLearnPageData(0));
  }, []);

  // Once we know the first unlocked deck, warm its quiz sessions too.
  useEffect(() => {
    if (!learn) return;
    const deck = learn.activeDeckId;
    for (const mode of ['normal', 'hard'] as const) {
      void preload(`quiz-data:${deck}:${mode}:0`, () => fetchQuizPageData(deck, mode, 0));
    }
  }, [learn]);

  return null;
}