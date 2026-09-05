'use client';

import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';

const LOCALES = ['en', 'id'] as const;

export function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();

  const setLocale = (target: string) => {
    document.cookie = `NEXT_LOCALE=${target}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  };

  return (
    <div className="flex overflow-hidden rounded-lg border border-ink-200 text-sm dark:border-ink-700">
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLocale(l)}
          className={`px-2.5 py-1 uppercase transition-colors ${
            locale === l
              ? 'bg-shu-500 text-washi-50'
              : 'bg-washi-50 text-ink-500 hover:text-ink-800 dark:bg-ink-900 dark:text-ink-400 dark:hover:text-ink-100'
          }`}
          aria-label={`Switch language to ${l}`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}