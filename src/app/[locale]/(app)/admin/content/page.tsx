import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

import { requireRole } from '@/lib/server/dal';
import { getRepository } from '@/lib/server/runtime';
import { DecksSection } from '@/components/admin/decks-section';
import { VocabDashboard } from '@/components/admin/vocab-dashboard';

export const metadata: Metadata = { title: 'Content — Kotomichi' };

export default async function ContentPage() {
  const current = await requireRole('admin', 'super_admin');
  const t = await getTranslations('admin');
  const isSuper = current.profile.role === 'super_admin';

  const repo = await getRepository();
  const [words, decks] = await Promise.all([
    repo.searchVocabulary('', { limit: 100 }),
    repo.listDecks(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <section className="mb-2">
        <h1 className="font-serif text-3xl font-bold text-ink-900 dark:text-washi-50">{t('title')}</h1>
        <p className="mt-1 text-sm text-ink-600 dark:text-ink-300">{t('subtitle')}</p>
      </section>

      {isSuper && (
        <div className="flex gap-3">
          <Link href="/admin/users" className="btn-secondary">{t('manageUsers')}</Link>
          <Link href="/admin/settings" className="btn-secondary">{t('tabConfig')}</Link>
        </div>
      )}

      <div className="flex flex-col gap-6">
        <VocabDashboard words={words} decks={decks} />
        <DecksSection decks={decks} />
      </div>

      <p>
        <Link href="/dashboard" className="text-sm text-shu-500 hover:underline">← {t('overviewTitle')}</Link>
      </p>
    </div>
  );
}