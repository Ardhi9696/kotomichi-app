'use client';

import { useLayoutEffect } from 'react';

const DARK_QUERY = '(prefers-color-scheme: dark)';

function getModeFromCookie(): 'dark' | 'light' | 'system' {
  if (typeof document === 'undefined') return 'system';
  const match = document.cookie.split('; ').find((c) => c.indexOf('theme=') === 0);
  const mode = match ? match.split('=')[1] : 'system';
  return mode === 'dark' || mode === 'light' || mode === 'system' ? mode : 'system';
}

function applyTheme() {
  const mode = getModeFromCookie();
  const dark = mode === 'dark' || (mode === 'system' && window.matchMedia(DARK_QUERY).matches);
  document.documentElement.classList.toggle('dark', dark);
}

/** Re-applies the saved theme to <html> on the client. React (re)mounts clear
 *  attributes it doesn't manage (e.g. on locale switches), so we must re-apply
 *  since the inline script only runs on hard navigation. */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useLayoutEffect(() => {
    applyTheme();
    const mql = window.matchMedia(DARK_QUERY);
    const onChange = () => applyTheme();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return children;
}