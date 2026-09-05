import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { AuthShell } from '@/components/auth-shell';
import { ResetPasswordForm } from '@/components/reset-password-form';

export const metadata: Metadata = { title: 'Set new password — Kotomichi' };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string | string[]; token_hash?: string | string[]; type?: string }>;
}) {
  const t = await getTranslations('auth');
  const params = await searchParams;

  const read = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const code = read(params.code) ?? read(params.token_hash) ?? '';

  return (
    <AuthShell>
      <div className="card w-full max-w-sm p-8">
        <h1 className="font-serif text-2xl font-bold text-ink-900 dark:text-washi-50">{t('resetTitle')}</h1>
        <p className="mb-6 mt-1 text-sm leading-relaxed text-ink-500 dark:text-ink-400">{t('resetSubtitle')}</p>
        <ResetPasswordForm code={code} />
      </div>
    </AuthShell>
  );
}