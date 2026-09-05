import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { requireRole } from '@/lib/server/dal';
import { getRepository } from '@/lib/server/runtime';
import { ActivityLabel } from '@/components/activity-label';
import { AddUserDialog } from '@/components/admin/add-user-dialog';
import { ManageUserRow } from '@/components/admin/manage-user-row';
import type { RoleChange, UserProfile } from '@/lib/domain';

export const metadata: Metadata = { title: 'Manage users — Kotomichi' };

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireRole('super_admin');
  const t = await getTranslations('admin');
  const { q } = await searchParams;
  const query = q?.trim() ?? '';

  const repo = await getRepository();
  const [users, allUsers, roleChanges] = await Promise.all([
    repo.listUserProfiles(query ? { q: query } : undefined),
    repo.listUserProfiles(),
    repo.listRoleChanges(10),
  ]);
  const activity = await repo.getLastActivityForUsers(users.map((u) => u.id));

  const nameOf = (id: string) => allUsers.find((u) => u.id === id)?.displayName ?? id.slice(0, 8);

  return (
    <div className="flex flex-col gap-6">
      <section className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-ink-900 dark:text-washi-50">{t('manageUsers')}</h1>
          <p className="mt-1 text-sm text-ink-600 dark:text-ink-300">{t('manageUsersSubtitle')}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <AddUserDialog />
          <Link href="/admin/content" className="btn-secondary">← {t('manageContent')}</Link>
        </div>
      </section>

      <form method="GET" className="flex items-center gap-2">
        <input
          name="q"
          defaultValue={query}
          placeholder={t('searchUsers')}
          className="field flex-1"
          aria-label={t('searchUsers')}
        />
        {query ? (
          <Link href="/admin/users" className="btn-ghost shrink-0">{t('clear')}</Link>
        ) : null}
        <button type="submit" className="btn-secondary shrink-0">{t('searchButton')}</button>
      </form>

      <div className="flex flex-col gap-2">
        <h3 className="mb-1 font-serif text-lg font-bold text-ink-800 dark:text-ink-100">
          {users.length} {t('userCount')}
        </h3>
        {users.length === 0 ? (
          <p className="text-sm text-ink-500 dark:text-ink-400">{t('noUsersFound')}</p>
        ) : (
          users.map((u: UserProfile) =>
            u.role === 'super_admin' ? (
              <div key={u.id} className="card flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <div className="min-w-0">
                  <div className="truncate font-medium text-ink-800 dark:text-ink-100">{u.displayName}</div>
                  <div className="text-xs text-ink-400">
                    {t('id')} {u.id.slice(0, 8)} · <ActivityLabel iso={activity[u.id]} />
                  </div>
                </div>
                <span className="chip bg-kintsugi-100 text-kintsugi-500 dark:bg-ink-800 dark:text-kintsugi-500">
                  super_admin
                </span>
              </div>
            ) : (
              <ManageUserRow
                key={`${u.id}-${u.role}`}
                userId={u.id}
                displayName={u.displayName}
                role={u.role}
                lastActive={activity[u.id]}
              />
            ),
          )
        )}
      </div>

      <section className="card p-6">
        <h2 className="mb-3 font-serif text-xl font-bold text-ink-800 dark:text-ink-100">{t('recentChanges')}</h2>
        {roleChanges.length === 0 ? (
          <p className="text-sm text-ink-500 dark:text-ink-400">{t('noChanges')}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-ink-200/70 dark:divide-ink-800">
            {roleChanges.map((c: RoleChange) => (
              <li key={c.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="text-ink-600 dark:text-ink-300">
                  {t('roleChangeLine', {
                    by: nameOf(c.byUserId),
                    target: nameOf(c.userId),
                    from: c.fromRole,
                    to: c.toRole,
                  })}
                </span>
                <span className="shrink-0 text-xs text-ink-400">{c.createdAt.slice(0, 16).replace('T', ' ')}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p>
        <Link href="/dashboard" className="text-sm text-shu-500 hover:underline">← {t('overviewTitle')}</Link>
      </p>
    </div>
  );
}