import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

import { requireRole, getStudyContext } from '@/lib/server/dal';
import { SettingsForm } from '@/components/admin/settings-form';

export const metadata: Metadata = { title: 'Settings — Kotomichi' };

export default async function AdminSettingsPage() {
  await requireRole('super_admin');
  const t = await getTranslations('admin');
  const ctx = await getStudyContext();

  return (
    <div className="flex flex-col gap-6">
      <section className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold text-ink-900 dark:text-washi-50">{t('tabConfig')}</h1>
          <p className="mt-1 text-sm text-ink-600 dark:text-ink-300">{t('settingsSubtitle')}</p>
        </div>
        <Link href="/admin" className="btn-secondary">← {t('manageContent')}</Link>
      </section>

      <SettingsForm
        initial={{
          dailyNewCap: ctx.config.srs.dailyNewCap,
          desiredRetention: ctx.config.srs.desiredRetention,
          signupEnabled: ctx.config.signup.enabled,
          resetPasswordEnabled: ctx.config.signup.resetPassword,
        }}
      />

      <p>
        <Link href="/dashboard" className="text-sm text-shu-500 hover:underline">← {t('overviewTitle')}</Link>
      </p>
    </div>
  );
}