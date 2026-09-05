import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { AuthShell } from '@/components/auth-shell';
import { RegisterForm } from '@/components/register-form';

export const metadata: Metadata = { title: 'Create account — Kotomichi' };

export default async function RegisterPage() {
  const t = await getTranslations('auth');
  return (
    <AuthShell>
      <div className="card w-full max-w-sm p-8">
        <h1 className="font-serif text-2xl font-bold text-ink-900 dark:text-washi-50">{t('signUpTitle')}</h1>
        <p className="mb-6 mt-1 text-sm text-ink-500 dark:text-ink-400">{t('signUpSubtitle')}</p>
        <RegisterForm />
      </div>
    </AuthShell>
  );
}