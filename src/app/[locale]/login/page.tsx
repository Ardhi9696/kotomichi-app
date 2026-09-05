import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { AuthShell } from '@/components/auth-shell';
import { LoginForm } from '@/components/login-form';
import { isResetPasswordEnabled, isSignupEnabled } from '@/lib/server/runtime';

export const metadata: Metadata = { title: 'Log in — Kotomichi' };

export default async function LoginPage() {
  const t = await getTranslations('auth');
  const [signup, resetPassword] = await Promise.all([isSignupEnabled(), isResetPasswordEnabled()]);
  return (
    <AuthShell showControls>
      <div className="card w-full max-w-sm p-8">
        <h1 className="font-serif text-2xl font-bold text-ink-900 dark:text-washi-50">{t('signInTitle')}</h1>
        <p className="mb-6 mt-1 text-sm text-ink-500 dark:text-ink-400">{t('signInSubtitle')}</p>
        <LoginForm showSignupLink={signup} showResetPasswordLink={resetPassword} />
      </div>
    </AuthShell>
  );
}