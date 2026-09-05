'use client';

import { useTranslations } from 'next-intl';

import { heatLevel, type DayStat } from '@/lib/stats/overview';

const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

const HEAT_CLASS = [
  'border-ink-200/50 bg-washi-50/40 dark:border-ink-800 dark:bg-ink-900/30',
  'bg-kintsugi-500/20 border-kintsugi-500/20',
  'bg-kintsugi-500/50 border-kintsugi-500/40',
  'bg-kintsugi-500 border-kintsugi-500',
];

export function OverviewCalendar({
  monthCells,
  monthYear,
}: {
  monthCells: (DayStat | null)[];
  monthYear: string;
}) {
  const t = useTranslations('dashboard.overview');

  const formatDay = (d: DayStat): number => {
    const utc = new Date(`${d.date}T00:00:00.000Z`);
    return utc.getUTCDate();
  };

  return (
    <div className="overflow-x-auto pb-1">
      <div className="min-w-72">
        <div className="mb-2 flex items-center justify-between px-1">
          <p className="text-sm font-bold capitalize text-ink-800 dark:text-washi-50">{monthYear}</p>
          <span className="text-xs text-ink-400">{t('studyMinutesPerDay')}</span>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {WEEKDAYS.map((w) => (
            <div key={w} className="pb-0.5 text-center text-[10px] font-semibold uppercase tracking-wider text-ink-400">
              {t(`week.${w}`)}
            </div>
          ))}
          {monthCells.map((cell, i) =>
            cell === null ? (
              <div key={`empty-${i}`} className="aspect-square rounded-lg border border-dashed border-ink-200/40 dark:border-ink-800/60" />
            ) : (
              <div
                key={cell.date}
                title={t('cellTooltip', {
                  date: cell.date,
                  minutes: String(cell.minutes),
                })}
                className={`aspect-square flex items-center justify-center rounded-lg border text-[11px] font-medium transition-colors ${
                  cell.isToday ? 'ring-2 ring-shu-500/70' : ''
                } ${
                  cell.isFuture
                    ? 'border-transparent text-transparent'
                    : cell.minutes > 0
                      ? 'text-ink-900 dark:text-washi-50'
                      : 'text-ink-300 dark:text-ink-600'
                } ${cell.isFuture ? '' : HEAT_CLASS[heatLevel(cell.minutes)]}`}
              >
                {cell.isFuture ? '' : formatDay(cell)}
              </div>
            ),
          )}
        </div>
        <div className="mt-2 flex items-center justify-end gap-1.5 px-1 text-[10px] text-ink-400">
          <span>{t('less')}</span>
          {HEAT_CLASS.map((_, i) => (
            <span key={i} className={`h-3 w-3 rounded ${HEAT_CLASS[i]}`} />
          ))}
          <span>{t('more')}</span>
        </div>
      </div>
    </div>
  );
}