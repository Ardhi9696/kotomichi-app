import { AppHeader } from '@/components/app-header';
import { getCurrentUser } from '@/lib/server/dal';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const current = await getCurrentUser();
  const isAdmin = current?.profile.role === 'admin' || current?.profile.role === 'super_admin';

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader signedIn={Boolean(current)} isAdmin={isAdmin} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}