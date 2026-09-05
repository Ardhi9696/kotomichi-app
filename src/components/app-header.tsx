'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { FormEvent } from 'react';

import { signOutAction } from '@/app/actions/auth';

const LOCALES = ['en', 'id'] as const;

export function AppHeader({ signedIn, isAdmin }: { signedIn: boolean; isAdmin: boolean }) {
  const t = useTranslations();
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  const setLocale = (target: string) => {
    document.cookie = `NEXT_LOCALE=${target}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  };

  const setTheme = (target: 'light' | 'dark') => {
    document.cookie = `theme=${target}; path=/; max-age=31536000; samesite=lax`;
    if (target === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    router.refresh();
  };

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

  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

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
          <div className="flex overflow-hidden rounded-lg border border-ink-200 text-sm dark:border-ink-700">
            {LOCALES.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLocale(l)}
                className={`px-2 py-1 uppercase transition-colors ${
                  locale === l
                    ? 'bg-shu-500 text-washi-50'
                    : 'bg-washi-50 text-ink-500 hover:text-ink-800 dark:bg-ink-900 dark:text-ink-400 dark:hover:text-ink-100'
                }`}
                aria-label={`Switch language to ${l}`}
              >
                {l}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className="btn-ghost px-2 py-1 text-lg leading-none"
            aria-label="Toggle theme"
          >
            {isDark ? '☀' : '☾'}
          </button>

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