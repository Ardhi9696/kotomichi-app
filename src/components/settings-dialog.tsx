'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { useActionState } from 'react';
import { useRouter } from 'next/navigation';

import { updateSettingsAction, type SettingsState } from '@/app/actions/settings';
import { DialogShell } from '@/components/dialog-shell';
import type { ThemeMode } from '@/lib/domain';

const THEMES: { value: ThemeMode; label: 'themeLight' | 'themeDark' | 'themeSystem' }[] = [
  { value: 'light', label: 'themeLight' },
  { value: 'dark', label: 'themeDark' },
  { value: 'system', label: 'themeSystem' },
];

export interface ProfileSettings {
  displayName: string;
  preferredLocale: string;
  theme: ThemeMode;
}

export function SettingsDialog({ profile }: { profile: ProfileSettings }) {
  const t = useTranslations('nav');
  const [session, setSession] = useState(0);

  return (
    <>
      <button
        type="button"
        className="w-full rounded-lg px-3 py-2.5 text-left text-sm transition-colors text-ink-600 hover:text-ink-800 dark:text-ink-300 dark:hover:text-ink-100 md:w-auto md:py-1.5"
        onClick={() => setSession((s) => s + 1)}
      >
        {t('setting')}
      </button>
      {session > 0 && <SettingsBody key={session} profile={profile} onClose={() => setSession(0)} />}
    </>
  );
}

function SettingsBody({ profile, onClose }: { profile: ProfileSettings; onClose: () => void }) {
  const t = useTranslations('settings');
  const router = useRouter();
  const [state, formAction, pending] = useActionState<SettingsState, FormData>(updateSettingsAction, {});

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state.ok, router]);

  return (
    <DialogShell open={!state.ok} onClose={onClose} title={t('title')}>
      <form action={formAction} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm text-ink-600 dark:text-ink-300">
          {t('displayName')}
          <input name="displayName" type="text" defaultValue={profile.displayName} required className="field" />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm text-ink-600 dark:text-ink-300">
            {t('language')}
            <select name="language" defaultValue={profile.preferredLocale} className="field">
              <option value="en">{t('languageEn')}</option>
              <option value="id">{t('languageId')}</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm text-ink-600 dark:text-ink-300">
            {t('theme')}
            <select name="theme" defaultValue={profile.theme} className="field">
              {THEMES.map(({ value, label }) => (
                <option key={value} value={value}>
                  {t(label)}
                </option>
              ))}
            </select>
          </label>
        </div>

        {state.error && <p className="text-sm text-shu-500">{t.has(state.error) ? t(state.error) : state.error}</p>}

        <div className="flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onClose}>
            {t('cancel')}
          </button>
          <button type="submit" disabled={pending} className="btn-primary">
            {t('save')}
          </button>
        </div>
      </form>
    </DialogShell>
  );
}