import Link from 'next/link';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { getStudyContext } from '@/lib/server/dal';
import { levelFromExp } from '@/lib/game/gamification';
import { ActivityLabel } from '@/components/activity-label';
import type { DeckStudyState } from '@/lib/srs/study-service';
import type { Role } from '@/lib/domain';

export const metadata: Metadata = { title: 'Dashboard — Kotomichi' };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ deck?: string }>;
}) {
  const t = await getTranslations('dashboard');
  const { user, profile, repo, config, service } = await getStudyContext();

  if (profile.role === 'admin' || profile.role === 'super_admin') {
    return <AdminOverview currentRole={profile.role} />;
  }

  const now = new Date().toISOString();
  const locale = profile.preferredLocale;

  const [dueCount, newToday, studySeconds, states, recent] = await Promise.all([
    repo.countDue(user.id, now),
    repo.countNewReviews(user.id, now.slice(0, 10) + 'T00:00:00.000Z'),
    repo.getStudySeconds(user.id, 1),
    service.decksWithProgress(user.id, locale, now),
    repo.getRecentLogs(user.id, 8),
  ]);

  const { deck } = await searchParams;
  const selectedId = Number(deck);
  const selected =
    states.find((s) => s.deck.id === selectedId && !s.deck.isLocked) ??
    states.find((s) => !s.deck.isLocked) ??
    null;

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

      <section>
        <div className="mb-3">
          <h2 className="font-serif text-xl font-bold text-ink-800 dark:text-ink-100">{t('selectDeck')}</h2>
          <p className="text-sm text-ink-500 dark:text-ink-400">{t('selectDeckHint')}</p>
        </div>

        <div className="flex flex-col gap-3">
          {states.map((s) => (
            <DeckPickerCard key={s.deck.id} s={s} selected={selected?.deck.id === s.deck.id} t={t} />
          ))}
        </div>
      </section>

      {selected && (
        <section className="card flex flex-wrap items-center justify-between gap-4 p-6">
          <div>
            <h3 className="font-serif text-lg font-bold text-ink-900 dark:text-washi-50">{selected.deck.title}</h3>
            <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
              {selected.deck.subtitle}
            </p>
          </div>
          <Link href={`/learn?deck=${selected.deck.id}`} className="btn-primary">
            {t('checkAbility')} →
          </Link>
        </section>
      )}

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

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-ink-500 dark:text-ink-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-ink-900 dark:text-washi-50">{value}</p>
      {hint ? <p className="text-xs text-ink-400 dark:text-ink-500">{hint}</p> : null}
    </div>
  );
}

function DeckPickerCard({
  s,
  selected,
  t,
}: {
  s: DeckStudyState;
  selected: boolean;
  t: {
    (key: string, values?: Record<string, string | number | Date>): string;
  };
}) {
  const { deck } = s;
  const pct = deck.mastery === null ? 0 : Math.round(deck.mastery * 100);
  return (
    <div
      className={`card flex flex-wrap items-center justify-between gap-3 p-5 transition-colors ${
        selected ? 'ring-2 ring-kintsugi-500/70' : ''
      } ${deck.isLocked ? 'opacity-60' : ''}`}
    >
      <Link href={`/dashboard?deck=${deck.id}`} className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-serif text-lg font-bold text-ink-900 dark:text-washi-50">
            {deck.title}
            {deck.subtitle && (
              <span className="ml-2 font-sans text-xs font-medium text-ink-400">{deck.subtitle}</span>
            )}
          </h3>
          {deck.isLocked && <span className="text-xs text-ink-400">🔒 {t('deckLocked')}</span>}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-ink-500 dark:text-ink-400">
          <span className="chip bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300">
            {deck.wordCount} {t('wordCount')}
          </span>
          <span className="chip bg-shu-500/10 text-shu-500">{deck.reviewedCount} {t('reviewedCount')}</span>
          {deck.mastery !== null && <span className="chip bg-kintsugi-100 text-kintsugi-500">{pct}%</span>}
          {selected && <span className="chip bg-emerald-500/10 text-emerald-600">{t('selected')}</span>}
        </div>

        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-ink-200/70 dark:bg-ink-800">
          <div className="h-full rounded-full bg-gradient-to-r from-shu-500 to-kintsugi-500" style={{ width: `${pct}%` }} />
        </div>
      </Link>

      <div className="flex shrink-0 flex-col items-end gap-2">
        {selected ? (
          <Link href={`/learn?deck=${deck.id}`} className="btn-primary">
            {t('checkAbility')} →
          </Link>
        ) : (
          <span className="text-xs text-ink-400">
            {deck.isLocked ? t('deckLocked') : t('selectHint')}
          </span>
        )}
      </div>
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