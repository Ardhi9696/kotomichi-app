import { Suspense } from 'react';

import { AppHeader } from '@/components/app-header';
import { ActivityHeartbeat } from '@/components/activity-heartbeat';
import { FlashProvider } from '@/components/flash-provider';
import { ProfileSync } from '@/components/profile-sync';
import { getCurrentUser } from '@/lib/server/dal';
import type { ThemeMode } from '@/lib/domain';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <FlashProvider>
      <div className="flex min-h-dvh flex-col">
        {/* The header depends on session/profile data. Suspending it here keeps
            the shell streaming instantly while that data resolves, so the
            loading.tsx fallback can be shown immediately on navigation. */}
        <Suspense fallback={<AppHeaderSkeleton />}>
          <AppChrome />
        </Suspense>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
      </div>
    </FlashProvider>
  );
}

async function AppChrome() {
  const current = await getCurrentUser();
  const isAdmin = current?.profile.role === 'admin' || current?.profile.role === 'super_admin';
  const profile = current
    ? {
        displayName: current.profile.displayName,
        preferredLocale: current.profile.preferredLocale,
        theme: current.profile.theme as ThemeMode,
      }
    : null;

  return (
    <>
      {current && <ActivityHeartbeat />}
      {profile && <ProfileSync theme={profile.theme} preferredLocale={profile.preferredLocale} />}
      <AppHeader signedIn={Boolean(current)} isAdmin={isAdmin} profile={profile} />
    </>
  );
}

/** Header-shaped placeholder so the sticky chrome keeps its height while the
    real header (which needs session data) streams in. */
function AppHeaderSkeleton() {
  return (
    <header className="sticky top-0 z-30 border-b border-ink-200/70 bg-washi-100/85 backdrop-blur dark:border-ink-800/70 dark:bg-ink-950">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-2 px-4">
        <span className="mr-3 font-serif text-lg font-bold tracking-tight text-ink-900 dark:text-washi-50">Kotomichi</span>
        <span className="hidden h-6 w-8 animate-pulse rounded bg-ink-200/70 dark:bg-ink-800 md:inline-block" />
        <div className="hidden flex-1 items-center gap-1 md:flex">
          <div className="h-8 w-16 animate-pulse rounded-lg bg-ink-200/70 dark:bg-ink-800" />
          <div className="h-8 w-12 animate-pulse rounded-lg bg-ink-200/70 dark:bg-ink-800" />
          <div className="h-8 w-14 animate-pulse rounded-lg bg-ink-200/70 dark:bg-ink-800" />
          <div className="h-8 w-12 animate-pulse rounded-lg bg-ink-200/70 dark:bg-ink-800" />
        </div>
        <span className="ml-auto hidden h-8 w-16 animate-pulse rounded-lg bg-ink-200/70 dark:bg-ink-800 md:inline-block" />
      </div>
    </header>
  );
}