'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { useActionState } from 'react';
import { useRouter } from 'next/navigation';

import { renameUserAction, type RenameUserState } from '@/app/actions/admin';
import { DialogShell } from '@/components/dialog-shell';

export function EditUserDialog({ userId, displayName }: { userId: string; displayName: string }) {
  const t = useTranslations('admin');
  const [session, setSession] = useState(0);

  return (
    <>
      <button type="button" className="btn-ghost" onClick={() => setSession((s) => s + 1)}>
        {t('edit')}
      </button>
      {session > 0 && (
        <EditUserBody key={session} userId={userId} displayName={displayName} onClose={() => setSession(0)} />
      )}
    </>
  );
}

function EditUserBody({
  userId,
  displayName,
  onClose,
}: {
  userId: string;
  displayName: string;
  onClose: () => void;
}) {
  const t = useTranslations('admin');
  const at = useTranslations('auth');
  const router = useRouter();
  const [state, formAction, pending] = useActionState<RenameUserState, FormData>(renameUserAction, {});

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state.ok, router]);

  return (
    <DialogShell open={!state.ok} onClose={onClose} title={t('editUserTitle')}>
      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="userId" value={userId} />
        <label className="flex flex-col gap-1 text-sm text-ink-600 dark:text-ink-300">
          {at('displayName')}
          <input name="displayName" type="text" defaultValue={displayName} required className="field" />
        </label>
        <p className="text-xs text-ink-500 dark:text-ink-400">{t('passwordFixedNote')}</p>

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