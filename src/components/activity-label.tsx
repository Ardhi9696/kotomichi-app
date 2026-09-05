'use client';

import { useTranslations } from 'next-intl';

import { formatLastActive } from '@/lib/activity';

export function ActivityLabel({ iso, suffix }: { iso?: string | null; suffix?: string }) {
  const t = useTranslations('admin');
  const label = formatLastActive(iso);

  if (!label) return <span>{t('neverActive')}</span>;
  if (label.kind === 'online') {
    return (
      <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
        <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
        {t('online')}
      </span>
    );
  }
  if (label.kind === 'minutesAgo') {
    return (
      <span>
        {t('minutesAgo', { count: label.count })}
        {suffix ? ` ${suffix}` : ''}
      </span>
    );
  }
  return (
    <span>
      {t('lastActive', { date: label.date })}
      {suffix ? ` ${suffix}` : ''}
    </span>
  );
}