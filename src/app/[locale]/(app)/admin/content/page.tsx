import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

import { requireRole } from '@/lib/server/dal';
import { getRepository } from '@/lib/server/runtime';
import {
  createDeckAction,
  updateDeckAction,
  togglePublishAction,
} from '@/app/actions/admin';
import { VocabDashboard } from '@/components/admin/vocab-dashboard';
import type { Deck, WordCard } from '@/lib/domain';

export const metadata: Metadata = { title: 'Management — Kotomichi' };

const JLPT: Array<'' | 'N5' | 'N4' | 'N3' | 'N2' | 'N1'> = ['', 'N5', 'N4', 'N3', 'N2', 'N1'];

async function DecksTabContent() {
  const repo = await getRepository();
  const decks = await repo.listDecks();
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <form action={createDeckAction} className="card flex flex-col gap-3 p-5">
        <h3 className="font-serif text-lg font-bold text-ink-800 dark:text-ink-100">New deck</h3>
        <input name="title" placeholder="Deck title" required className="field" />
        <input name="subtitle" placeholder="Subtitle" className="field" />
        <select name="jlptLevel" className="field">
          {JLPT.map((l) => <option key={l} value={l}>{l || 'JLPT'}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm text-ink-600 dark:text-ink-300">
          <input type="checkbox" name="published" className="accent-shu-500" /> Published
        </label>
        <button type="submit" className="btn-primary">Create</button>
      </form>

      <div className="flex flex-col gap-3">
        <h3 className="font-serif text-lg font-bold text-ink-800 dark:text-ink-100">Existing decks</h3>
        {decks.map((d: Deck) => (
          <div key={d.id} className="flex flex-col gap-2">
            <form action={updateDeckAction} className="card flex flex-col gap-2 p-4 text-sm">
              <input type="hidden" name="id" value={d.id} />
              <div className="flex items-center gap-2">
                <input name="title" defaultValue={d.title} className="field" />
                <button type="submit" className="btn-secondary">Save</button>
              </div>
              <div className="flex gap-2">
                <select name="jlptLevel" className="field" defaultValue={d.jlptLevel ?? ''}>
                  {JLPT.map((l) => <option key={l} value={l}>{l || 'JLPT'}</option>)}
                </select>
                <input name="subtitle" defaultValue={d.subtitle ?? ''} placeholder="Subtitle" className="field" />
              </div>
            </form>
            <form action={togglePublishAction}>
              <input type="hidden" name="id" value={d.id} />
              <input type="hidden" name="published" value={d.isPublished ? '' : 'on'} />
              <button type="submit" className="btn-ghost">{d.isPublished ? 'Unpublish' : 'Publish'}</button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function AdminPage() {
  const current = await requireRole('admin', 'super_admin');
  const t = await getTranslations('admin');
  const isSuper = current.profile.role === 'super_admin';

  const [words, decks] = await Promise.all([getWords(), DecksTabContent()]);

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

      <div className="flex flex-col gap-10">
        <VocabDashboard words={words} />
        {decks}
      </div>

      <p>
        <Link href="/dashboard" className="text-sm text-shu-500 hover:underline">← {t('overviewTitle')}</Link>
      </p>
    </div>
  );
}

async function getWords(): Promise<WordCard[]> {
  const repo = await getRepository();
  return repo.searchVocabulary('', { limit: 100 });
}