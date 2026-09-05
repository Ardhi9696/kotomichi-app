import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

import { requireRole, getStudyContext } from '@/lib/server/dal';
import { getRepository } from '@/lib/server/runtime';
import { AppHeader } from '@/components/app-header';
import {
  createVocabularyAction,
  createDeckAction,
  updateDeckAction,
  setUserRoleAction,
  setConfigAction,
  togglePublishAction,
} from '@/app/actions/admin';
import type { Deck, UserProfile, WordCard } from '@/lib/domain';

export const metadata: Metadata = { title: 'Admin — Kotomichi' };

const JLPT: Array<'' | 'N5' | 'N4' | 'N3' | 'N2' | 'N1'> = ['', 'N5', 'N4', 'N3', 'N2', 'N1'];
const ROLES = ['user', 'admin', 'super_admin'] as const;

async function VocabTabContent() {
  const repo = await getRepository();
  const search = '';
  const words = await repo.searchVocabulary(search, { limit: 100 });
  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div>
        <h3 className="mb-2 font-serif text-lg font-bold text-ink-800 dark:text-ink-100">New vocabulary</h3>
        <form action={createVocabularyAction} className="card flex flex-col gap-3 p-5">
          <input name="kanji" placeholder="漢字" className="field" />
          <input name="hiragana" placeholder="ひらがな (required)" required className="field" />
          <input name="romaji" placeholder="romaji" className="field" />
          <input name="partOfSpeech" placeholder="part of speech" className="field" />
          <select name="jlptLevel" className="field">
            {JLPT.map((l) => <option key={l} value={l}>{l || 'JLPT'}</option>)}
          </select>
          <input name="meaning_id" placeholder="Meaning (ID)" className="field" />
          <input name="meaning_en" placeholder="Meaning (EN)" className="field" />
          <button type="submit" className="btn-primary">Add</button>
        </form>
      </div>
      <div className="flex flex-col gap-2">
        <h3 className="mb-1 font-serif text-lg font-bold text-ink-800 dark:text-ink-100">{words.length} words</h3>
        {words.map((w: WordCard) => (
          <div key={w.vocabulary.id} className="card flex items-center justify-between px-4 py-2.5 text-sm">
            <span className="font-medium text-ink-800 dark:text-ink-100">
              {w.vocabulary.kanji ?? w.vocabulary.hiragana}
              <span className="ml-2 text-ink-400">{w.vocabulary.hiragana}</span>
            </span>
            <span className="text-ink-500 dark:text-ink-400">{w.translations['en'] ?? ''}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

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
          <form key={d.id} action={updateDeckAction} className="card flex flex-col gap-2 p-4 text-sm">
            <input type="hidden" name="id" value={d.id} />
            <div className="flex items-center gap-2">
              <input name="title" defaultValue={d.title} className="field" />
              <button type="submit" className="btn-secondary">Save</button>
              <form action={togglePublishAction}>
                <input type="hidden" name="id" value={d.id} />
                <input type="hidden" name="published" value={d.isPublished ? '' : 'on'} />
                <button type="submit" className="btn-ghost">{d.isPublished ? 'Unpublish' : 'Publish'}</button>
              </form>
            </div>
            <div className="flex gap-2">
              <select name="jlptLevel" className="field" defaultValue={d.jlptLevel ?? ''}>
                {JLPT.map((l) => <option key={l} value={l}>{l || 'JLPT'}</option>)}
              </select>
              <input name="subtitle" defaultValue={d.subtitle ?? ''} placeholder="Subtitle" className="field" />
            </div>
          </form>
        ))}
      </div>
    </div>
  );
}

async function UsersTabContent() {
  const repo = await getRepository();
  const users = await repo.listUserProfiles();
  return (
    <div className="flex flex-col gap-2">
      <h3 className="mb-1 font-serif text-lg font-bold text-ink-800 dark:text-ink-100">{users.length} users</h3>
      {users.map((u: UserProfile) => (
        <form key={u.id} action={setUserRoleAction} className="card flex items-center justify-between px-4 py-2.5 text-sm">
          <span className="text-ink-800 dark:text-ink-100">
            {u.displayName}
            <span className="ml-2 text-ink-400">{u.role}</span>
          </span>
          <div className="flex items-center gap-2">
            <input type="hidden" name="userId" value={u.id} />
            <select name="role" defaultValue={u.role} className="field">
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <button type="submit" className="btn-secondary">Save</button>
          </div>
        </form>
      ))}
    </div>
  );
}

async function ConfigTabContent() {
  const ctx = await getStudyContext();
  return (
    <form action={setConfigAction} className="card flex max-w-xl flex-col gap-3 p-5">
      <h3 className="font-serif text-lg font-bold text-ink-800 dark:text-ink-100">Settings</h3>
      <label className="flex flex-col gap-1 text-sm text-ink-600 dark:text-ink-300">
        New cards per day
        <input name="dailyNewCap" type="number" defaultValue={ctx.config.srs.dailyNewCap} className="field" />
      </label>
      <label className="flex flex-col gap-1 text-sm text-ink-600 dark:text-ink-300">
        Desired retention
        <input name="desiredRetention" type="number" step="0.01" defaultValue={ctx.config.srs.desiredRetention} className="field" />
      </label>
      <button type="submit" className="btn-primary">Save</button>
    </form>
  );
}

export default async function AdminPage() {
  const current = await requireRole('admin', 'super_admin');
  const t = await getTranslations('admin');
  const isAdmin = current.profile.role === 'admin' || current.profile.role === 'super_admin';

  const [vocab, decks, users] = await Promise.all([
    VocabTabContent(),
    DecksTabContent(),
    UsersTabContent(),
  ]);

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader signedIn isAdmin={isAdmin} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <section className="mb-6">
          <h1 className="font-serif text-3xl font-bold text-ink-900 dark:text-washi-50">{t('title')}</h1>
          <p className="mt-1 text-sm text-ink-600 dark:text-ink-300">{t('subtitle')}</p>
        </section>

        <div className="mb-6 flex flex-col gap-10">
          {vocab}
          {decks}
          {users}
          <ConfigTabContent />
        </div>

        <p className="mt-8">
          <Link href="/dashboard" className="text-sm text-shu-500 hover:underline">← Dashboard</Link>
        </p>
      </main>
    </div>
  );
}
