'use client';

import useSWR, { type Key, type SWRConfiguration } from 'swr';

/**
 * Hybrid SSR + SWR pattern: the server renders the page with `fallbackData`,
 * the client mounts instantly on that data, then silently revalidates in the
 * background (on focus) so returning to the page never re-triggers a skeleton.
 */
export function usePageData<Data>(
  key: Key,
  fetcher: () => Promise<Data>,
  fallbackData: Data,
  options?: SWRConfiguration<Data>,
) {
  return useSWR<Data>(key, fetcher, {
    fallbackData,
    revalidateOnMount: false,
    revalidateOnFocus: true,
    keepPreviousData: true,
    dedupingInterval: 15_000,
    ...options,
  });
}