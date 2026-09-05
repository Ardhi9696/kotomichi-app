'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef } from 'react';
import { useActionState } from 'react';

import { setConfigAction, type ConfigSaveState } from '@/app/actions/admin';
import { FormSubmitButton } from '@/components/form-submit-button';
import { useFlash } from '@/components/flash-provider';

export interface SettingsFormValues {
  dailyNewCap: number;
  desiredRetention: number;
  signupEnabled: boolean;
  resetPasswordEnabled: boolean;
}

export function SettingsForm({ initial }: { initial: SettingsFormValues }) {
  const t = useTranslations('admin');
  const { show } = useFlash();
  const handledRef = useRef(false);
  const [state, formAction] = useActionState<ConfigSaveState, FormData>(setConfigAction, {});

  useEffect(() => {
    if (handledRef.current) return;
    if (state.ok) {
      handledRef.current = true;
      show('success', t('configSaved'));
    } else if (state.error) {
      handledRef.current = true;
      show('error', t.has(state.error) ? t(state.error) : state.error);
    }
  }, [state, show, t]);

  return (
    <form action={formAction} onSubmit={() => { handledRef.current = false; }} className="card flex max-w-xl flex-col gap-4 p-5">
      <label className="flex flex-col gap-1 text-sm text-ink-600 dark:text-ink-300">
        {t('dailyNewCap')}
        <input name="dailyNewCap" type="number" defaultValue={initial.dailyNewCap} className="field" />
      </label>

      <label className="flex flex-col gap-1 text-sm text-ink-600 dark:text-ink-300">
        {t('desiredRetention')}
        <input
          name="desiredRetention"
          type="number"
          step="0.01"
          defaultValue={initial.desiredRetention}
          className="field"
        />
      </label>

      <label className="flex items-center gap-2 text-sm text-ink-700 dark:text-ink-200">
        <input
          type="checkbox"
          name="signupEnabled"
          defaultChecked={initial.signupEnabled}
          className="accent-shu-500"
        />
        {t('signupEnabled')}
      </label>

      <label className="flex items-center gap-2 text-sm text-ink-700 dark:text-ink-200">
        <input
          type="checkbox"
          name="resetPasswordEnabled"
          defaultChecked={initial.resetPasswordEnabled}
          className="accent-shu-500"
        />
        {t('resetPasswordEnabled')}
      </label>

      <FormSubmitButton className="btn-primary" pendingLabel={t('saving')}>
        {t('save')}
      </FormSubmitButton>
    </form>
  );
}