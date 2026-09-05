'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useActionState } from 'react';

import { resetPasswordAction, type ActionState } from '@/app/actions/auth';
import { PasswordField } from '@/components/password-field';

export function ResetPasswordForm({ code }: { code: string }) {
  const t = useTranslations('auth');
  const [state, formAction, pending] = useActionState<ActionState, FormData>(resetPasswordAction, {});

  if (!code) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <p className="text-sm leading-relaxed text-ink-600 dark:text-ink-300">{t('invalidResetCode')}</p>
        <Link href="/forgot-password" className="text-sm font-medium text-shu-500 hover:underline">
          {t('forgotPassword')}
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex w-full flex-col gap-4">
      <input type="hidden" name="code" value={code} />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm text-ink-600 dark:text-ink-300">{t('newPassword')}</label>
        <PasswordField name="password" autoComplete="new-password" minLength={6} required />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="confirmPassword" className="text-sm text-ink-600 dark:text-ink-300">{t('confirmPassword')}</label>
        <PasswordField name="confirmPassword" autoComplete="new-password" minLength={6} required />
      </div>

      {state.error && <p className="text-sm text-shu-500">{t.has(state.error) ? t(state.error) : state.error}</p>}

      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? '…' : t('saveNewPassword')}
      </button>
    </form>
  );
}