import type { Metadata } from 'next';
import Link from 'next/link';

import { requireRole, getStudyContext } from '@/lib/server/dal';
import { AppHeader } from '@/components/app-header';
import { setConfigAction } from '@/app/actions/admin';

export const metadata: Metadata = { title: 'Settings — Kotomichi' };

export default async function AdminSettingsPage() {
  await requireRole('super_admin');
  const isAdmin = true;

  const ctx = await getStudyContext();

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader signedIn isAdmin={isAdmin} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <section className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-serif text-3xl font-bold text-ink-900 dark:text-washi-50">Settings</h1>
            <p className="mt-1 text-sm text-ink-600 dark:text-ink-300">Global configuration — super admin only.</p>
          </div>
          <Link href="/admin" className="btn-secondary">← Content</Link>
        </section>

        <form action={setConfigAction} className="card flex max-w-xl flex-col gap-3 p-5">
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

        <p className="mt-8">
          <Link href="/dashboard" className="text-sm text-shu-500 hover:underline">← Dashboard</Link>
        </p>
      </main>
    </div>
  );
}