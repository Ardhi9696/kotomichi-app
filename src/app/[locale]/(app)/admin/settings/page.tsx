import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

import { requireRole, getStudyContext } from '@/lib/server/dal';
import { setConfigAction } from '@/app/actions/admin';

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

      <form action={setConfigAction} className="card flex max-w-xl flex-col gap-4 p-5">
        <label className="flex flex-col gap-1 text-sm text-ink-600 dark:text-ink-300">
          {t('dailyNewCap')}
          <input name="dailyNewCap" type="number" defaultValue={ctx.config.srs.dailyNewCap} className="field" />
        </label>

        <label className="flex flex-col gap-1 text-sm text-ink-600 dark:text-ink-300">
          {t('desiredRetention')}
          <input
            name="desiredRetention"
            type="number"
            step="0.01"
            defaultValue={ctx.config.srs.desiredRetention}
            className="field"
          />
        </label>

        <label className="flex items-center gap-2 text-sm text-ink-700 dark:text-ink-200">
          <input
            type="checkbox"
            name="signupEnabled"
            defaultChecked={ctx.config.signup.enabled}
            className="accent-shu-500"
          />
          {t('signupEnabled')}
        </label>

        <button type="submit" className="btn-primary">{t('save')}</button>
      </form>

      <p>
        <Link href="/dashboard" className="text-sm text-shu-500 hover:underline">← {t('overviewTitle')}</Link>
      </p>
    </div>
  );
}