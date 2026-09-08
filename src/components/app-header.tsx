'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';

import { signOutAction } from '@/app/actions/auth';
import { ConfirmModal } from '@/components/confirm-modal';
import { SettingsDialog, type ProfileSettings } from '@/components/settings-dialog';

export function AppHeader({
  signedIn,
  isAdmin,
  profile,
}: {
  signedIn: boolean;
  isAdmin: boolean;
  profile: ProfileSettings | null;
}) {
  const t = useTranslations();
  const pathname = usePathname();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [menuOpenPath, setMenuOpenPath] = useState<string | null>(null);

  const menuOpen = menuOpenPath !== null && menuOpenPath === pathname;
  const toggleMenu = () => setMenuOpenPath((v) => (v === pathname ? null : pathname));

  const navLinks = signedIn
    ? isAdmin
      ? [
          { href: '/dashboard', label: t('nav.home') },
          { href: '/admin/content', label: t('nav.admin') },
          { href: '/admin/users', label: t('nav.users') },
          { href: '/admin/settings', label: t('nav.appConfig') },
        ]
      : [
          { href: '/dashboard', label: t('nav.home') },
          { href: '/learn', label: t('nav.learn') },
          { href: '/review', label: t('nav.review') },
          { href: '/words', label: t('nav.words') },
        ]
    : [];

  const navLinkClass = (href: string) => {
    const active = pathname === href || pathname.startsWith(href + '/');
    return active
      ? 'bg-shu-500/10 font-semibold text-shu-500 dark:text-shu-300'
      : 'text-ink-600 hover:text-ink-800 dark:text-ink-300 dark:hover:text-ink-100';
  };

  const onLogoutConfirm = () => {
    setLogoutOpen(false);
    setLoggingOut(true);
    startTransition(() => {
      void signOutAction().finally(() => setLoggingOut(false));
    });
  };

  const logoutBusy = loggingOut || isPending;

  return (
    <header className="sticky top-0 z-30 border-b border-ink-200/70 bg-washi-100/85 backdrop-blur dark:border-ink-800/70 dark:bg-ink-950">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-2 px-4">
        <Link href="/" className="mr-3 flex items-baseline gap-1.5">
          <span className="font-serif text-lg font-bold tracking-tight text-ink-900 dark:text-washi-50">Kotomichi</span>
          <span className="hidden text-[10px] uppercase tracking-[0.2em] text-shu-500 sm:inline">言道</span>
        </Link>

        <nav className="hidden flex-1 items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              prefetch
              className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${navLinkClass(link.href)}`}
            >
              {link.label}
            </Link>
          ))}
          {signedIn && profile && <SettingsDialog profile={profile} />}
        </nav>

        <div className="ml-auto hidden items-center gap-1 md:flex">
          <div>
            {signedIn ? (
              <button type="button" className="btn-ghost" disabled={logoutBusy} onClick={() => setLogoutOpen(true)}>
                {logoutBusy ? t('nav.loggingOut') : t('nav.logout')}
              </button>
            ) : (
              <Link href="/login" className="btn-ghost">
                {t('nav.login')}
              </Link>
            )}
          </div>
        </div>

        <div className="ml-auto md:hidden">
          <button
            type="button"
            className="btn-ghost p-2 md:hidden"
            onClick={toggleMenu}
            aria-expanded={menuOpen}
            aria-label={t('nav.menu')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              {menuOpen ? (
                <>
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </>
              ) : (
                <>
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="border-t border-ink-200/70 md:hidden dark:border-ink-800/70">
          <nav className="mx-auto flex max-w-5xl flex-col gap-1 px-4 py-3">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                prefetch
                className={`rounded-lg px-3 py-2.5 text-sm transition-colors ${navLinkClass(link.href)}`}
              >
                {link.label}
              </Link>
            ))}
            {signedIn && profile && <SettingsDialog profile={profile} />}
            <div className="mt-1 border-t border-ink-200/70 pt-2 dark:border-ink-800/70">
              {signedIn ? (
                <button type="button" className="btn-ghost w-full justify-start" disabled={logoutBusy} onClick={() => setLogoutOpen(true)}>
                  {logoutBusy ? t('nav.loggingOut') : t('nav.logout')}
                </button>
              ) : (
                <Link href="/login" className="btn-ghost w-full justify-start">
                  {t('nav.login')}
                </Link>
              )}
            </div>
          </nav>
        </div>
      )}

      <ConfirmModal
        open={logoutOpen}
        title={t('confirm.logoutTitle')}
        description={t('confirm.logoutDescription')}
        confirmLabel={t('confirm.confirm')}
        cancelLabel={t('common.cancel')}
        danger
        onConfirm={onLogoutConfirm}
        onCancel={() => setLogoutOpen(false)}
      />
    </header>
  );
}