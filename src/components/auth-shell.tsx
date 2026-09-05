import Link from 'next/link';

import { LocaleSwitcher } from '@/components/locale-switcher';
import { ThemeToggle } from '@/components/theme-toggle';

/** Shared shell for the auth pages: brand + theme/locale controls + card. */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 border-b border-ink-200/70 bg-washi-100/85 backdrop-blur dark:border-ink-800/70 dark:bg-ink-950/85">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-baseline gap-1.5">
            <span className="font-serif text-lg font-bold tracking-tight text-ink-900 dark:text-washi-50">Kotomichi</span>
            <span className="hidden text-[10px] uppercase tracking-[0.2em] text-shu-500 sm:inline">言道</span>
          </Link>
          <div className="flex items-center gap-2">
            <LocaleSwitcher />
            <ThemeToggle />
          </div>
        </div>
      </header>
      <div className="flex flex-1 items-center justify-center px-4 py-20">{children}</div>
    </main>
  );
}