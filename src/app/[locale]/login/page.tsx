import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { LoginForm } from '@/components/login-form';

export const metadata: Metadata = { title: 'Log in — Kotomichi' };

export default async function LoginPage() {
  const t = await getTranslations('auth');
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="card w-full max-w-sm p-8">
        <h1 className="font-serif text-2xl font-bold text-ink-900 dark:text-washi-50">{t('signInTitle')}</h1>
        <p className="mb-6 mt-1 text-sm text-ink-500 dark:text-ink-400">{t('demoNote')}</p>
        <LoginForm />
      </div>
    </main>
  );
}