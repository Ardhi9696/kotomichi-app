import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { AuthShell } from '@/components/auth-shell';
import { ForgotPasswordForm } from '@/components/forgot-password-form';

export const metadata: Metadata = { title: 'Reset password — Kotomichi' };

export default async function ForgotPasswordPage() {
  const t = await getTranslations('auth');
  return (
    <AuthShell>
      <div className="card w-full max-w-sm p-8">
        <h1 className="font-serif text-2xl font-bold text-ink-900 dark:text-washi-50">{t('forgotTitle')}</h1>
        <p className="mb-6 mt-1 text-sm leading-relaxed text-ink-500 dark:text-ink-400">{t('forgotSubtitle')}</p>
        <ForgotPasswordForm />
      </div>
    </AuthShell>
  );
}