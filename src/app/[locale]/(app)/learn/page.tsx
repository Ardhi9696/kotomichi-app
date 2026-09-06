import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { loadLearnPageData } from '@/lib/server/page-data';
import { LearnShell } from '@/components/learn-shell';

export const metadata: Metadata = { title: 'Learn — Kotomichi' };

export default async function LearnPage({
  searchParams,
}: {
  searchParams: Promise<{ deck?: string }>;
}) {
  const { deck } = await searchParams;
  const data = await loadLearnPageData(Number(deck));
  if (!data) redirect('/dashboard');
  return <LearnShell {...data} />;
}