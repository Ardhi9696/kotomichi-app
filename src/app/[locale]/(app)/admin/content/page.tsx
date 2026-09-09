import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

import { requireRole } from '@/lib/server/dal';
import { getRepository } from '@/lib/server/runtime';
import { ContentTabs } from '@/components/admin/content-tabs';

export const metadata: Metadata = { title: 'Content — Kotomichi' };

export default async function ContentPage() {
  await requireRole('admin', 'super_admin');
  const t = await getTranslations('admin');

  const repo = await getRepository();
  const [initial, decks] = await Promise.all([
    repo.queryVocabulary({ page: 1, pageSize: 20 }),
    repo.listDecks(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <section className="mb-2">
        <h1 className="font-serif text-3xl font-bold text-ink-900 dark:text-washi-50">{t('title')}</h1>
        <p className="mt-1 text-sm text-ink-600 dark:text-ink-300">{t('subtitle')}</p>
      </section>

      <ContentTabs initial={initial} decks={decks} />

      <p>
        <Link href="/dashboard" className="text-sm text-shu-500 hover:underline">← {t('overviewTitle')}</Link>
      </p>
    </div>
  );
}