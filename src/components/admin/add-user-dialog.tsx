'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { useActionState } from 'react';
import { useRouter } from 'next/navigation';

import { createUserAction, type CreateUserState } from '@/app/actions/admin';
import { DialogShell } from '@/components/dialog-shell';
import { PasswordField } from '@/components/password-field';
import type { Role } from '@/lib/domain';

const ROLES: Role[] = ['user', 'admin'];

export function AddUserDialog() {
  const t = useTranslations('admin');
  const [session, setSession] = useState(0);

  return (
    <>
      <button type="button" className="btn-ghost" onClick={() => setSession((s) => s + 1)}>
        + {t('addUserButton')}
      </button>
      {session > 0 && <AddUserBody key={session} onClose={() => setSession(0)} />}
    </>
  );
}

function AddUserBody({ onClose }: { onClose: () => void }) {
  const t = useTranslations('admin');
  const at = useTranslations('auth');
  const router = useRouter();
  const [state, formAction, pending] = useActionState<CreateUserState, FormData>(createUserAction, {});

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state.ok, router]);

  return (
    <DialogShell open={!state.ok} onClose={onClose} title={t('addUserTitle')}>
      <form action={formAction} className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm text-ink-600 dark:text-ink-300">
            {at('displayName')}
            <input name="displayName" type="text" autoComplete="off" required className="field" />
          </label>
          <label className="flex flex-col gap-1 text-sm text-ink-600 dark:text-ink-300">
            {at('email')}
            <input name="email" type="email" autoComplete="off" required className="field" />
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm text-ink-600 dark:text-ink-300">
            {at('password')}
            <PasswordField name="password" autoComplete="new-password" minLength={6} required />
          </label>
          <label className="flex flex-col gap-1 text-sm text-ink-600 dark:text-ink-300">
            {t('role')}
            <select name="role" defaultValue="user" className="field" aria-label={t('role')}>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
        </div>

        {state.error && <p className="text-sm text-shu-500">{at.has(state.error) ? at(state.error) : state.error}</p>}

        <div className="flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onClose}>
            {t('cancel')}
          </button>
          <button type="submit" disabled={pending} className="btn-primary">
            {t('save')}
          </button>
        </div>
      </form>
    </DialogShell>
  );
}