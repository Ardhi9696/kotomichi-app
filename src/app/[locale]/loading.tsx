import { getTranslations } from 'next-intl/server';

export default async function LocaleLoading() {
  const t = await getTranslations('common');
  return (
    <div
      className="flex min-h-dvh items-center justify-center"
      role="status"
      aria-label={t('loading')}
    >
      <div className="flex flex-col items-center gap-3">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-ink-300 border-t-shu-500 dark:border-ink-700 dark:border-t-shu-400" />
        <span className="text-sm text-ink-500 dark:text-ink-400">{t('loading')}</span>
      </div>
    </div>
  );
}