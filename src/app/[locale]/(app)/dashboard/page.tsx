import { Suspense } from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { getStudyContext } from '@/lib/server/dal';
import { DashboardShell } from '@/components/dashboard-shell';
import { ActivityLabel } from '@/components/activity-label';
import type { Role } from '@/lib/domain';

export const metadata: Metadata = { title: 'Dashboard — Kotomichi' };

export default async function DashboardPage() {
  const t = await getTranslations('dashboard');
  const { profile } = await getStudyContext();

  // Admin dashboard stays SSR (list/management panels have their own reads);
  // learners get the SWR-backed shell so navigation never re-waits on the DB.
  if (profile.role === 'admin' || profile.role === 'super_admin') {
    return <AdminOverview currentRole={profile.role} />;
  }

  return (
    <div className="flex flex-col gap-6">
      <Suspense>
        <DashboardShell />
      </Suspense>
    </div>
  );
}

const ROLE_LABEL: Record<Role, string> = {
  super_admin: 'super admin',
  admin: 'admin',
  user: 'user',
};

async function AdminOverview({ currentRole }: { currentRole: Role }) {
  const t = await getTranslations('admin');

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h1 className="font-serif text-3xl font-bold text-ink-900 dark:text-washi-50">{t('overviewTitle')}</h1>
        <p className="mt-1 text-sm text-ink-600 dark:text-ink-300">{t('overviewSubtitle')}</p>
      </section>

      <Suspense fallback={<StatsSkeleton />}>
        <AdminStats />
      </Suspense>

      <Suspense fallback={<ActivitySkeleton />}>
        <AdminPanels currentRole={currentRole} />
      </Suspense>
    </div>
  );
}

async function AdminStats() {
  const t = await getTranslations('admin');
  const { repo } = await getStudyContext();

  const [users, words, decks] = await Promise.all([
    repo.listUserProfiles(),
    repo.searchVocabulary('', { limit: 10000 }),
    repo.listDecks(),
  ]);

  const roleCounts: Record<Role, number> = { super_admin: 0, admin: 0, user: 0 };
  for (const u of users) roleCounts[u.role] += 1;

  return (
    <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Stat label={t('totalUsers')} value={String(users.length)} />
      <Stat label={t('staff')} value={String(roleCounts.admin + roleCounts.super_admin)} />
      <Stat label={t('vocabWords')} value={String(words.length)} />
      <Stat label={t('decks')} value={String(decks.length)} />
    </section>
  );
}

async function AdminPanels({ currentRole }: { currentRole: Role }) {
  const t = await getTranslations('admin');
  const { repo } = await getStudyContext();

  const users = await repo.listUserProfiles();
  const activity = await repo.getLastActivityForUsers(users.map((u) => u.id));
  const recent = [...users].reverse().slice(0, 5);

  return (
    <section className="grid gap-3 sm:grid-cols-2">
      <div className="card p-6">
        <h2 className="mb-3 font-serif text-xl font-bold text-ink-800 dark:text-ink-100">{t('recentUsers')}</h2>
        {users.length === 0 ? (
          <p className="text-sm text-ink-500 dark:text-ink-400">{t('noUsers')}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-ink-200/70 dark:divide-ink-800">
            {recent.map((u) => (
              <li key={u.id} className="flex items-center justify-between py-2 text-sm">
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-ink-700 dark:text-ink-200">{u.displayName}</span>
                  <span className="text-xs text-ink-400">
                    <ActivityLabel iso={activity[u.id]} />
                  </span>
                </span>
                <span className="chip bg-washi-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300">{ROLE_LABEL[u.role]}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card p-6">
        <h2 className="mb-3 font-serif text-xl font-bold text-ink-800 dark:text-ink-100">{t('quickActions')}</h2>
        <div className="flex flex-col gap-2">
          <Link href="/admin/content" className="btn-primary">{t('manageContent')}</Link>
          {currentRole === 'super_admin' && (
            <>
              <Link href="/admin/users" className="btn-ghost">{t('manageUsers')}</Link>
              <Link href="/admin/settings" className="btn-ghost">{t('settings')}</Link>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-ink-500 dark:text-ink-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-ink-900 dark:text-washi-50">{value}</p>
      {hint ? <p className="text-xs text-ink-400 dark:text-ink-500">{hint}</p> : null}
    </div>
  );
}

function StatsSkeleton() {
  return (
    <section className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="card p-4">
          <div className="h-3 w-3/4 animate-pulse rounded bg-ink-200/70 dark:bg-ink-800" />
          <div className="mt-3 h-6 w-1/2 animate-pulse rounded bg-ink-200/70 dark:bg-ink-800" />
          <div className="mt-2 h-3 w-2/5 animate-pulse rounded bg-ink-200/50 dark:bg-ink-800/60" />
        </div>
      ))}
    </section>
  );
}

function ActivitySkeleton() {
  return (
    <section className="grid gap-3 sm:grid-cols-2" aria-hidden>
      {[0, 1].map((i) => (
        <div key={i} className="card p-6">
          <div className="h-5 w-32 animate-pulse rounded bg-ink-200/70 dark:bg-ink-800" />
          <div className="mt-4 space-y-3">
            {[0, 1, 2].map((j) => (
              <div key={j} className="h-4 animate-pulse rounded bg-ink-200/50 dark:bg-ink-800/60" />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}