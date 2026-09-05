import Link from 'next/link';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { getStudyContext } from '@/lib/server/dal';
import { levelFromExp } from '@/lib/game/gamification';
import { ActivityLabel } from '@/components/activity-label';
import { OverviewCalendar } from '@/components/overview-calendar';
import { computeOverview } from '@/lib/stats/overview';
import type { Role } from '@/lib/domain';

export const metadata: Metadata = { title: 'Dashboard — Kotomichi' };

const OVERVIEW_WINDOW_DAYS = 30;

export default async function DashboardPage() {
  const t = await getTranslations('dashboard');
  const to = await getTranslations('dashboard.overview');
  const { user, profile, repo, config } = await getStudyContext();

  if (profile.role === 'admin' || profile.role === 'super_admin') {
    return <AdminOverview currentRole={profile.role} />;
  }

  const now = new Date().toISOString();

  const [dueCount, newToday, studySeconds, activity, recent] = await Promise.all([
    repo.countDue(user.id, now),
    repo.countNewReviews(user.id, now.slice(0, 10) + 'T00:00:00.000Z'),
    repo.getStudySeconds(user.id, 1),
    repo.getActivity(user.id, OVERVIEW_WINDOW_DAYS),
    repo.getRecentLogs(user.id, 8),
  ]);

  const overview = computeOverview(activity, new Date(), OVERVIEW_WINDOW_DAYS);

  const lvl = levelFromExp(profile.exp, config.exp.base);
  const newRemaining = Math.max(0, config.srs.dailyNewCap - newToday);

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h1 className="font-serif text-3xl font-bold text-ink-900 dark:text-washi-50">{t('title', { name: profile.displayName })}</h1>
        <p className="mt-1 text-sm text-ink-600 dark:text-ink-300">{t('subtitle')}</p>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label={t('level')} value={String(lvl.level)} hint={`${profile.exp} EXP`} />
        <Stat label={t('streak')} value={`${profile.currentStreak}`} hint={profile.currentStreak > 0 ? '🔥' : undefined} />
        <Stat label={t('due')} value={String(dueCount)} hint={dueCount ? t('wordCount') : undefined} />
        <Stat label={t('newToday')} value={String(newRemaining)} hint={`/ ${config.srs.dailyNewCap}`} />
      </section>

      {/* Overview: calendar + consistency */}
      <section className="card p-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="font-serif text-xl font-bold text-ink-800 dark:text-ink-100">{to('title')}</h2>
            <p className="text-sm text-ink-500 dark:text-ink-400">{to('subtitle')}</p>
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            <Metric value={String(overview.todayMinutes)} label={to('todayMinutes')} accent />
            <Metric value={`${overview.currentStreak}`} label={to('currentStreak')} />
            <Metric value={String(overview.daysThisMonth)} label={to('daysThisMonth')} />
            <Metric value={String(overview.totalMinutes)} label={to('totalMinutes')} />
          </div>
        </div>
        <OverviewCalendar monthCells={overview.monthCells} monthYear={overview.monthYear} />
      </section>

      {/* Menu */}
      <section>
        <h2 className="mb-3 font-serif text-xl font-bold text-ink-800 dark:text-ink-100">{t('menu')}</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <MenuCard href="/learn" title={t('menuLearn')} description={t('menuLearnDescription')} icon="学" />
          <MenuCard href="/review" title={t('menuReview')} description={t('menuReviewDescription')} icon="復" badge={dueCount > 0 ? String(dueCount) : undefined} />
          <MenuCard href="/words" title={t('menuSearch')} description={t('menuSearchDescription')} icon="索" />
        </div>
      </section>

      {dueCount > 0 && (
        <Link href="/review" className="card group flex items-center justify-between px-5 py-4 transition-colors hover:border-kintsugi-500/50">
          <span className="text-sm text-ink-700 dark:text-ink-200">
            {t('dueStrip', { count: dueCount })}
          </span>
          <span className="text-sm font-medium text-shu-500">{t('startReview')} →</span>
        </Link>
      )}

      <section className="grid gap-3 sm:grid-cols-2">
        <div className="card p-6">
          <h2 className="mb-3 font-serif text-xl font-bold text-ink-800 dark:text-ink-100">{t('activity')}</h2>
          {recent.length === 0 ? (
            <p className="text-sm text-ink-500 dark:text-ink-400">{t('noActivity')}</p>
          ) : (
            <ul className="flex flex-col divide-y divide-ink-200/70 dark:divide-ink-800">
              {recent.map((r) => (
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
            {t('reviewsToday', { count: recent.length })}
          </h2>
          <p className="flex items-center gap-2 text-3xl font-bold text-shu-500">
            {Math.round(studySeconds / 60)}
            <span className="text-sm font-normal text-ink-500 dark:text-ink-400">{t('minutesToday', { minutes: '(min)' })}</span>
          </p>
          <p className="mt-2 text-sm text-ink-500 dark:text-ink-400">
            {profile.level} {t('level')} · {profile.exp} EXP
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
}: {
  href: string;
  title: string;
  description: string;
  icon: string;
  badge?: string;
}) {
  return (
    <Link
      href={href}
      className="card group flex flex-col items-start gap-3 p-5 transition-transform hover:-translate-y-0.5"
    >
      <div className="flex w-full items-center justify-between">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-shu-500/10 font-serif text-lg text-shu-500">
          {icon}
        </span>
        {badge && (
          <span className="chip bg-shu-500/10 text-shu-500">{badge}</span>
        )}
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

const ROLE_LABEL: Record<Role, string> = {
  super_admin: 'super admin',
  admin: 'admin',
  user: 'user',
};

async function AdminOverview({ currentRole }: { currentRole: Role }) {
  const t = await getTranslations('admin');
  const { repo } = await getStudyContext();

  const [users, words, decks] = await Promise.all([
    repo.listUserProfiles(),
    repo.searchVocabulary('', { limit: 10000 }),
    repo.listDecks(),
  ]);
  const activity = await repo.getLastActivityForUsers(users.map((u) => u.id));

  const roleCounts: Record<Role, number> = { super_admin: 0, admin: 0, user: 0 };
  for (const u of users) roleCounts[u.role] += 1;
  const recent = [...users].reverse().slice(0, 5);

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h1 className="font-serif text-3xl font-bold text-ink-900 dark:text-washi-50">{t('overviewTitle')}</h1>
        <p className="mt-1 text-sm text-ink-600 dark:text-ink-300">{t('overviewSubtitle')}</p>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label={t('totalUsers')} value={String(users.length)} />
        <Stat label={t('staff')} value={String(roleCounts.admin + roleCounts.super_admin)} />
        <Stat label={t('vocabWords')} value={String(words.length)} />
        <Stat label={t('decks')} value={String(decks.length)} />
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <div className="card p-6">
          <h2 className="mb-3 font-serif text-xl font-bold text-ink-800 dark:text-ink-100">{t('recentUsers')}</h2>
          {users.length === 0 ? (
            <p className="text-sm text-ink-500 dark:text-ink-400">{t('noUsers')}</p>
          ) : (
            <ul className="flex flex-col divide-y divide-ink-200/70 dark:divide-ink-800">
              {recent.map((u) => (
                <li key={u.id} className="flex items-center justify-between py-2 text-sm">
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-ink-700 dark:text-ink-200">{u.displayName}</span>
                    <span className="text-xs text-ink-400">
                      <ActivityLabel iso={activity[u.id]} />
                    </span>
                  </span>
                  <span className="chip bg-washi-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300">{ROLE_LABEL[u.role]}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-6">
          <h2 className="mb-3 font-serif text-xl font-bold text-ink-800 dark:text-ink-100">{t('quickActions')}</h2>
          <div className="flex flex-col gap-2">
            <Link href="/admin/content" className="btn-primary">{t('manageContent')}</Link>
            {currentRole === 'super_admin' && (
              <>
                <Link href="/admin/users" className="btn-ghost">{t('manageUsers')}</Link>
                <Link href="/admin/settings" className="btn-ghost">{t('settings')}</Link>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}