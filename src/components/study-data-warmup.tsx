'use client';

import { preload } from 'swr';
import useSWR from 'swr';
import { useEffect } from 'react';

import { fetchDashboardPageData, fetchLearnPageData, fetchQuizPageData, fetchReviewPageData, fetchWordsPageData } from '@/app/actions/page-data';

/**
 * Boot-time data warm-up for non-admin learners. The intent is that in-app
 * navigation to a never-visited study page still renders instantly (SWR cache
 * already holds its snapshot) so only a hard refresh ever shows a skeleton.
 *
 * Each preload is a Server Action that re-authenticates against Supabase and
 * runs DB queries, so firing them all on mount would compete with the page's
 * own data load and stall first paint. To keep the shell responsive we:
 *  1. Wait until the browser is idle before warming at all.
 *  2. Stagger the preloads so they don't burst simultaneously.
 */
export function StudyDataWarmup() {
  const { data: learn } = useSWR('learn-data:', () => fetchLearnPageData(0));

  useEffect(() => {
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];

    const schedule = (ms: number, fn: () => void) => {
      timers.push(setTimeout(() => {
        if (cancelled) return;
        fn();
      }, ms));
    };

    const stop = () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };

    const requestIdle = (cb: () => void, timeout = 2000) => {
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        const id = (window as unknown as { requestIdleCallback(c: () => void, o: { timeout: number }): number }).requestIdleCallback(cb, { timeout });
        return () => (window as unknown as { cancelIdleCallback(id: number): void }).cancelIdleCallback(id);
      }
      const t = setTimeout(cb, 300);
      return () => clearTimeout(t);
    };

    const cancelIdle = requestIdle(() => {
      if (cancelled) return;
      // Stagger the heavy Server-Action preloads so no single navigation floods
      // the connection with parallel auth + DB requests.
      schedule(0, () => { void preload('dashboard-data', fetchDashboardPageData); });
      schedule(250, () => { void preload('review-data', fetchReviewPageData); });
      schedule(500, () => { void preload('words-data:', () => fetchWordsPageData('')); });
      schedule(750, () => { void preload('learn-data:', () => fetchLearnPageData(0)); });
    }, 3000);

    return () => {
      stop();
      cancelIdle();
    };
  }, []);

  // Warm the quiz sessions for every unlocked deck so clicking "Quiz" from
  // /learn (any deck) — or opening /quiz/?deck=… directly — renders instantly.
  useEffect(() => {
    if (!learn) return;
    const timer = setTimeout(() => {
      for (const d of learn.decks) {
        if (d.isLocked) continue;
        // Stagger each deck's quiz warm-up to avoid a burst of Server Actions.
        for (const mode of ['normal', 'hard'] as const) {
          void preload(`quiz-data:${d.id}:${mode}:0`, () => fetchQuizPageData(d.id, mode, 0));
        }
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [learn]);

  return null;
}
