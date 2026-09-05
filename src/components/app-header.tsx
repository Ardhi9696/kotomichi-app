'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { FormEvent } from 'react';

import { signOutAction } from '@/app/actions/auth';
import { LocaleSwitcher } from '@/components/locale-switcher';
import { ThemeToggle } from '@/components/theme-toggle';

export function AppHeader({ signedIn, isAdmin }: { signedIn: boolean; isAdmin: boolean }) {
  const t = useTranslations();
  const pathname = usePathname();

  const navLink = (href: string, label: string) => {
    const active = pathname === href || pathname.startsWith(href + '/');
    return (
      <Link
        href={href}
        className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
          active
            ? 'bg-shu-500/10 font-semibold text-shu-500 dark:text-shu-300'
            : 'text-ink-600 hover:text-ink-800 dark:text-ink-300 dark:hover:text-ink-100'
        }`}
      >
        {label}
      </Link>
    );
  };

  const onLogout = (e: FormEvent) => {
    e.preventDefault();
    void signOutAction();
  };

  return (
    <header className="sticky top-0 z-20 border-b border-ink-200/70 bg-washi-100/85 backdrop-blur dark:border-ink-800/70 dark:bg-ink-950/85">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-2 px-4">
        <Link href="/" className="mr-3 flex items-baseline gap-1.5">
          <span className="font-serif text-lg font-bold tracking-tight text-ink-900 dark:text-washi-50">Kotomichi</span>
          <span className="hidden text-[10px] uppercase tracking-[0.2em] text-shu-500 sm:inline">言道</span>
        </Link>

        <nav className="flex flex-1 items-center gap-1">
          {signedIn && (
            <>
              {navLink('/dashboard', t('nav.home'))}
              {navLink('/learn', t('nav.learn'))}
              {navLink('/review', t('nav.review'))}
              {isAdmin && navLink('/admin', t('nav.admin'))}
            </>
          )}
        </nav>

        <div className="flex items-center gap-1">
          <LocaleSwitcher />
          <ThemeToggle />

          {signedIn ? (
            <form onSubmit={onLogout}>
              <button className="btn-ghost" type="submit">
                {t('nav.logout')}
              </button>
            </form>
          ) : (
            <Link href="/login" className="btn-ghost">
              {t('nav.login')}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}