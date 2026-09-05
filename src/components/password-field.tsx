'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

interface PasswordFieldProps {
  name: string;
  autoComplete: string;
  required?: boolean;
  minLength?: number;
}

export function PasswordField({ name, autoComplete, required, minLength }: PasswordFieldProps) {
  const t = useTranslations('auth');
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        id={name}
        name={name}
        type={visible ? 'text' : 'password'}
        autoComplete={autoComplete}
        minLength={minLength}
        required={required}
        className="field pr-11"
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-ink-400 transition-colors hover:text-ink-600 dark:text-ink-400 dark:hover:text-ink-200"
        aria-label={visible ? t('hidePassword') : t('showPassword')}
      >
        {visible ? (
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
            <line x1="1" y1="1" x2="23" y2="23" />
          </svg>
        ) : (
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}