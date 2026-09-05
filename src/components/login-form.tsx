'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useActionState } from 'react';

import { signInAction, type ActionState } from '@/app/actions/auth';
import { PasswordField } from '@/components/password-field';

export function LoginForm() {
  const t = useTranslations('auth');
  const [state, formAction, pending] = useActionState<ActionState, FormData>(signInAction, {});

  return (
    <form action={formAction} className="flex w-full flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm text-ink-600 dark:text-ink-300">{t('email')}</label>
        <input id="email" name="email" type="email" autoComplete="email" required className="field" />
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="password" className="text-sm text-ink-600 dark:text-ink-300">{t('password')}</label>
          <Link href="/forgot-password" className="text-xs font-medium text-shu-500 hover:underline">
            {t('forgotPassword')}
          </Link>
        </div>
        <PasswordField name="password" autoComplete="current-password" required />
      </div>

      {state.error && <p className="text-sm text-shu-500">{t.has(state.error) ? t(state.error) : state.error}</p>}

      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? '…' : t('submit')}
      </button>

      <p className="text-center text-sm text-ink-500 dark:text-ink-400">
        {t('noAccount')}{' '}
        <Link href="/register" className="font-medium text-shu-500 hover:underline">
          {t('createOne')}
        </Link>
      </p>
    </form>
  );
}