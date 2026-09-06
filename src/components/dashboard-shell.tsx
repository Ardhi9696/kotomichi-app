'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { fetchDashboardPageData } from '@/app/actions/page-data';
import { OverviewCalendar } from '@/components/overview-calendar';
import { usePageData } from '@/lib/client/use-page-data';
import { computeOverview } from '@/lib/stats/overview';
import type { DashboardPageData } from '@/lib/page-data/types';
import type { DayDetail } from '@/lib/domain';

const OVERVIEW_WINDOW_DAYS = 30;

export function DashboardShell() {
  const t = useTranslations('dashboard');

  const { data, isLoading } = usePageData<DashboardPageData | null>(
    'dashboard-data',
    fetchDashboardPageData,
    null,
    { revalidateOnMount: true },
  );

  if (!data && isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <DashboardSkeleton />
      </div>
    );
  }

  if (!data) return null;

  const newRemaining = Math.max(0, data.newDailyCap - data.newToday);
  const overview = computeOverview(data.activity, new Date(), OVERVIEW_WINDOW_DAYS);
  const dayDetails: Record<string, DayDetail> = Object.fromEntries(data.dayDetails.map((d) => [d.date, d]));

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h1 className="font-serif text-3xl font-bold text-ink-900 dark:text-washi-50">{t('title', { name: data.displayName })}</h1>
        <p className="mt-1 text-sm text-ink-600 dark:text-ink-300">{t('subtitle')}</p>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label={t('level')} value={String(data.level)} hint={`${data.exp} EXP`} />
        <Stat label={t('streak')} value={`${data.currentStreak}`} hint={data.currentStreak > 0 ? '🔥' : undefined} />
        <Stat label={t('due')} value={String(data.dueCount)} hint={data.dueCount ? t('wordCount') : undefined} />
        <Stat label={t('newToday')} value={String(newRemaining)} hint={`/ ${data.newDailyCap}`} />
      </section>

      {/* Overview + calendar */}
      <section className="card p-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="font-serif text-xl font-bold text-ink-800 dark:text-ink-100">{t('overview.title')}</h2>
            <p className="text-sm text-ink-500 dark:text-ink-400">{t('overview.subtitle')}</p>
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            <Metric value={String(overview.todayMinutes)} label={t('overview.todayMinutes')} accent />
            <Metric value={`${overview.currentStreak}`} label={t('overview.currentStreak')} />
            <Metric value={String(overview.daysThisMonth)} label={t('overview.daysThisMonth')} />
            <Metric value={String(overview.totalMinutes)} label={t('overview.totalMinutes')} />
          </div>
        </div>
        <OverviewCalendar monthCells={overview.monthCells} monthYear={overview.monthYear} dayDetails={dayDetails} />
      </section>

      {/* Menu */}
      <section>
        <h2 className="mb-3 font-serif text-xl font-bold text-ink-800 dark:text-ink-100">{t('menu')}</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <MenuCard href="/learn" title={t('menuLearn')} description={t('menuLearnDescription')} icon="学" prefetch />
          <MenuCard
            href="/review"
            title={t('menuReview')}
            description={t('menuReviewDescription')}
            icon="復"
            prefetch
            badge={
              data.dueCount + newRemaining > 0 ? (
                <span className="chip bg-shu-500/10 text-shu-500">{String(data.dueCount + newRemaining)}</span>
              ) : null
            }
          />
          <MenuCard href="/words" title={t('menuSearch')} description={t('menuSearchDescription')} icon="索" prefetch />
        </div>
      </section>

      {data.dueCount > 0 && (
        <Link
          href="/review"
          prefetch
          className="card group flex items-center justify-between px-5 py-4 transition-colors hover:border-kintsugi-500/50"
        >
          <span className="text-sm text-ink-700 dark:text-ink-200">{t('dueStrip', { count: data.dueCount })}</span>
          <span className="text-sm font-medium text-shu-500">{t('startReview')} →</span>
        </Link>
      )}

      <section className="grid gap-3 sm:grid-cols-2">
        <div className="card p-6">
          <h2 className="mb-3 font-serif text-xl font-bold text-ink-800 dark:text-ink-100">{t('activity')}</h2>
          {data.recentLogs.length === 0 ? (
            <p className="text-sm text-ink-500 dark:text-ink-400">{t('noActivity')}</p>
          ) : (
            <ul className="flex flex-col divide-y divide-ink-200/70 dark:divide-ink-800">
              {data.recentLogs.map((r) => (
                <li key={r.id} className="flex items-center justify-between py-2 text-sm">
                  <span className="flex items-center gap-2">
                    <span className={r.correctness ? 'text-kintsugi-500' : 'text-shu-500'}>{r.correctness ? '✓' : '✗'}</span>
                    <span className="text-ink-600 dark:text-ink-300">dir{r.direction}</span>
                  </span>
                  <span className="text-ink-400">{r.reviewedAt.slice(0, 16).replace('T', ' ')}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="card p-6">
          <h2 className="mb-3 font-serif text-xl font-bold text-ink-800 dark:text-ink-100">
            {t('reviewsToday', { count: data.recentLogs.length })}
          </h2>
          <p className="flex items-center gap-2 text-3xl font-bold text-shu-500">
            {Math.round(data.studySeconds / 60)}
            <span className="text-sm font-normal text-ink-500 dark:text-ink-400">{t('minutesToday', { minutes: '(min)' })}</span>
          </p>
          <p className="mt-2 text-sm text-ink-500 dark:text-ink-400">
            {data.level} {t('level')} · {data.exp} EXP
          </p>
        </div>
      </section>
    </div>
  );
}

function Metric({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl border px-3 py-1.5 ${accent ? 'border-shu-500/40 bg-shu-500/5' : 'border-ink-200/70 dark:border-ink-800'}`}>
      <span className={`mr-1.5 text-lg font-bold ${accent ? 'text-shu-500' : 'text-ink-800 dark:text-washi-50'}`}>{value}</span>
      <span className="text-xs text-ink-500 dark:text-ink-400">{label}</span>
    </div>
  );
}

function MenuCard({
  href,
  title,
  description,
  icon,
  badge,
  prefetch: shouldPrefetch,
}: {
  href: string;
  title: string;
  description: string;
  icon: string;
  badge?: React.ReactNode;
  prefetch?: boolean;
}) {
  return (
    <Link
      href={href}
      prefetch={shouldPrefetch}
      className="card group flex flex-col items-start gap-3 p-5 transition-transform hover:-translate-y-0.5"
    >
      <div className="flex w-full items-center justify-between">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-shu-500/10 font-serif text-lg text-shu-500">
          {icon}
        </span>
        {badge}
      </div>
      <span className="font-serif text-lg font-bold text-ink-900 dark:text-washi-50">{title}</span>
      <span className="text-sm text-ink-500 dark:text-ink-400">{description}</span>
    </Link>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-ink-500 dark:text-ink-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-ink-900 dark:text-washi-50">{value}</p>
      {hint ? <p className="text-xs text-ink-400 dark:text-ink-500">{hint}</p> : null}
    </div>
  );
}

function DashboardSkeleton() {
  const tc = useTranslations('common');
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label={tc('loading')}>
      <section>
        <div className="h-8 w-2/5 animate-pulse rounded-lg bg-ink-200/70 dark:bg-ink-800" />
        <div className="mt-2 h-4 w-3/5 animate-pulse rounded bg-ink-200/50 dark:bg-ink-800/60" />
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="card p-4">
            <div className="h-3 w-3/4 animate-pulse rounded bg-ink-200/70 dark:bg-ink-800" />
            <div className="mt-3 h-6 w-1/2 animate-pulse rounded bg-ink-200/70 dark:bg-ink-800" />
            <div className="mt-2 h-3 w-2/5 animate-pulse rounded bg-ink-200/50 dark:bg-ink-800/60" />
          </div>
        ))}
      </section>

      <section className="card p-6">
        <div className="flex items-end justify-between">
          <div>
            <div className="h-5 w-36 animate-pulse rounded bg-ink-200/70 dark:bg-ink-800" />
            <div className="mt-2 h-3 w-48 animate-pulse rounded bg-ink-200/50 dark:bg-ink-800/60" />
          </div>
          <div className="flex gap-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-9 w-16 animate-pulse rounded-xl bg-ink-200/50 dark:bg-ink-800/60" />
            ))}
          </div>
        </div>
        <div className="mt-5 grid grid-cols-7 gap-1">
          {Array.from({ length: 28 }).map((_, i) => (
            <div key={i} className="aspect-square animate-pulse rounded-lg bg-ink-200/40 dark:bg-ink-800/50" />
          ))}
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="card p-6">
            <div className="h-5 w-32 animate-pulse rounded bg-ink-200/70 dark:bg-ink-800" />
            <div className="mt-4 space-y-3">
              {[0, 1, 2].map((j) => (
                <div key={j} className="h-4 animate-pulse rounded bg-ink-200/50 dark:bg-ink-800/60" />
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}