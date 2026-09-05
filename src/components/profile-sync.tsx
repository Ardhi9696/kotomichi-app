'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { applyTheme } from '@/components/theme-toggle';
import type { ThemeMode } from '@/lib/domain';

function getLocaleCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.split('; ').find((c) => c.indexOf('NEXT_LOCALE=') === 0);
  return match ? match.split('=')[1] : null;
}

/**
 * Applies the user's persisted preferences (theme + language) as soon as the
 * authenticated layout mounts — i.e. right after login.
 */
export function ProfileSync({ theme, preferredLocale }: { theme: ThemeMode; preferredLocale: string }) {
  const router = useRouter();

  useEffect(() => {
    applyTheme(theme);
    if (preferredLocale && getLocaleCookie() !== preferredLocale) {
      document.cookie = `NEXT_LOCALE=${preferredLocale}; path=/; max-age=31536000; samesite=lax`;
      router.refresh();
    }
    }, [theme, preferredLocale, router]);

  return null;
}