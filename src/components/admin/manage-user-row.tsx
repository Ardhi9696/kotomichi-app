'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { deleteUserAction, setUserRoleAction } from '@/app/actions/admin';
import { ConfirmModal } from '@/components/confirm-modal';
import { EditUserDialog } from '@/components/admin/edit-user-dialog';
import type { Role } from '@/lib/domain';

const ROLES: Role[] = ['user', 'admin'];

type PendingAction = { kind: 'role'; role: Role } | { kind: 'delete' } | null;

export function ManageUserRow({
  userId,
  displayName,
  role,
  lastActive,
}: {
  userId: string;
  displayName: string;
  role: Role;
  lastActive?: string | null;
}) {
  const t = useTranslations('admin');
  const ct = useTranslations('common');
  const router = useRouter();
  const [roleState, setRoleState] = useState<Role>(role);
  const [pending, setPending] = useState<PendingAction>(null);

  const onSubmit = async (action: Exclude<PendingAction, null>) => {
    setPending(null);
    const fd = new FormData();
    fd.set('userId', userId);
    if (action.kind === 'role') fd.set('role', action.role);
    if (action.kind === 'delete') {
      await deleteUserAction(fd);
    } else {
      await setUserRoleAction(fd);
    }
    router.refresh();
  };

  return (
    <>
      <div className="card flex items-center justify-between gap-3 px-4 py-3 text-sm">
        <div className="min-w-0">
          <div className="truncate font-medium text-ink-800 dark:text-ink-100">{displayName}</div>
          <div className="text-xs text-ink-400">
            {t('id')} {userId.slice(0, 8)} ·{' '}
            {lastActive ? t('lastActive', { date: lastActive.slice(0, 16).replace('T', ' ') }) : t('neverActive')}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <EditUserDialog userId={userId} displayName={displayName} />
          <select
            value={roleState}
            onChange={(e) => setRoleState(e.target.value as Role)}
            className="field w-32"
            aria-label={t('role')}
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              if (roleState === role) return;
              setPending({ kind: 'role', role: roleState });
            }}
          >
            {t('save')}
          </button>
          <button
            type="button"
            className="btn-ghost text-shu-500 hover:bg-shu-500/10"
            onClick={() => setPending({ kind: 'delete' })}
          >
            {t('delete')}
          </button>
        </div>
      </div>

      <ConfirmModal
        open={pending !== null}
        title={pending?.kind === 'delete' ? t('deleteUserTitle') : t('roleChangeTitle')}
        description={
          pending?.kind === 'delete'
            ? t('deleteUserDescription', { name: displayName })
            : t('roleChangeDescription', { name: displayName, from: role, to: pending?.role ?? role })
        }
        confirmLabel={pending?.kind === 'delete' ? t('delete') : t('save')}
        cancelLabel={ct('cancel')}
        danger={pending?.kind === 'delete'}
        onConfirm={() => pending && void onSubmit(pending)}
        onCancel={() => setPending(null)}
      />
    </>
  );
}