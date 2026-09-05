'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useActionState } from 'react';

import { signUpAction, type ActionState } from '@/app/actions/auth';

export function RegisterForm() {
  const t = useTranslations('auth');
  const [state, formAction, pending] = useActionState<ActionState, FormData>(signUpAction, {});

  return (
    <form action={formAction} className="flex w-full flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="displayName" className="text-sm text-ink-600 dark:text-ink-300">{t('displayName')}</label>
        <input id="displayName" name="displayName" type="text" autoComplete="nickname" required className="field" />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm text-ink-600 dark:text-ink-300">{t('email')}</label>
        <input id="email" name="email" type="email" autoComplete="email" required className="field" />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm text-ink-600 dark:text-ink-300">{t('password')}</label>
        <input id="password" name="password" type="password" autoComplete="new-password" minLength={6} required className="field" />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="confirmPassword" className="text-sm text-ink-600 dark:text-ink-300">{t('confirmPassword')}</label>
        <input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" minLength={6} required className="field" />
      </div>

      {state.error && <p className="text-sm text-shu-500">{t(state.error) || state.error}</p>}

      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? '…' : t('submit')}
      </button>

      <p className="text-center text-sm text-ink-500 dark:text-ink-400">
        {t('haveAccount')}{' '}
        <Link href="/login" className="font-medium text-shu-500 hover:underline">
          {t('signIn')}
        </Link>
      </p>
    </form>
  );
}