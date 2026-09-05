import { AppHeader } from '@/components/app-header';
import { FlashProvider } from '@/components/flash-provider';
import { ProfileSync } from '@/components/profile-sync';
import { getCurrentUser } from '@/lib/server/dal';
import type { ThemeMode } from '@/lib/domain';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
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
    <FlashProvider>
      <div className="flex min-h-dvh flex-col">
        {profile && <ProfileSync theme={profile.theme} preferredLocale={profile.preferredLocale} />}
        <AppHeader signedIn={Boolean(current)} isAdmin={isAdmin} profile={profile} />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
      </div>
    </FlashProvider>
  );
}