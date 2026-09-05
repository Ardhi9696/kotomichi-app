'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useActionState } from 'react';

import { forgotPasswordAction, type ForgotPasswordState } from '@/app/actions/auth';

export function ForgotPasswordForm() {
  const t = useTranslations('auth');
  const [state, formAction, pending] = useActionState<ForgotPasswordState, FormData>(forgotPasswordAction, {});

  if (state.sent) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <p className="text-sm leading-relaxed text-ink-600 dark:text-ink-300">{t('resetSent')}</p>
        <Link href="/login" className="text-sm font-medium text-shu-500 hover:underline">
          {t('backToLogin')}
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex w-full flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm text-ink-600 dark:text-ink-300">{t('email')}</label>
        <input id="email" name="email" type="email" autoComplete="email" required className="field" />
      </div>

      {state.error && <p className="text-sm text-shu-500">{t.has(state.error) ? t(state.error) : state.error}</p>}

      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? '…' : t('sendResetLink')}
      </button>

      <p className="text-center text-sm text-ink-500 dark:text-ink-400">
        {t('rememberedPassword')}{' '}
        <Link href="/login" className="font-medium text-shu-500 hover:underline">
          {t('signIn')}
        </Link>
      </p>
    </form>
  );
}