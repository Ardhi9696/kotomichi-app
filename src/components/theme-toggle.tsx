'use client';

import { useSyncExternalStore } from 'react';

type ThemeMode = 'dark' | 'light' | 'system';

const listeners = new Set<() => void>();
const DARK_QUERY = '(prefers-color-scheme: dark)';

function getModeFromCookie(): ThemeMode {
  if (typeof document === 'undefined') return 'system';
  const match = document.cookie.split('; ').find((c) => c.indexOf('theme=') === 0);
  const mode = match ? match.split('=')[1] : 'system';
  return mode === 'dark' || mode === 'light' || mode === 'system' ? mode : 'system';
}

function getSystemDark() {
  return typeof window !== 'undefined' && window.matchMedia(DARK_QUERY).matches;
}

function getSnapshot(): ThemeMode {
  return getModeFromCookie();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const mql = window.matchMedia(DARK_QUERY);
  const onChange = () => listeners.forEach((l) => l());
  mql.addEventListener('change', onChange);
  return () => {
    listeners.delete(listener);
    mql.removeEventListener('change', onChange);
  };
}

export function applyTheme(mode: ThemeMode) {
  document.cookie = `theme=${mode}; path=/; max-age=31536000; samesite=lax`;
  const dark = mode === 'dark' || (mode === 'system' && getSystemDark());
  document.documentElement.classList.toggle('dark', dark);
  listeners.forEach((l) => l());
}

const SunIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
  </svg>
);

const MoonIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

const MonitorIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="2" y="3" width="20" height="14" rx="2" />
    <path d="M8 21h8M12 17v4" />
  </svg>
);

const MODES: { mode: ThemeMode; icon: React.ReactNode; label: string }[] = [
  { mode: 'light', icon: <SunIcon />, label: 'Use light theme' },
  { mode: 'dark', icon: <MoonIcon />, label: 'Use dark theme' },
  { mode: 'system', icon: <MonitorIcon />, label: 'Use system theme' },
];

export function ThemeToggle() {
  const mode = useSyncExternalStore(subscribe, getSnapshot, () => 'system');

  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-ink-200 p-0.5 dark:border-ink-700">
      {MODES.map(({ mode: m, icon, label }) => (
        <button
          key={m}
          type="button"
          onClick={() => applyTheme(m)}
          className={`flex h-7 w-8 items-center justify-center rounded-md transition-colors ${
            mode === m
              ? 'bg-shu-500 text-washi-50'
              : 'text-ink-500 hover:bg-ink-200/60 hover:text-ink-800 dark:text-ink-400 dark:hover:bg-ink-800 dark:hover:text-ink-100'
          }`}
          aria-label={label}
          aria-pressed={mode === m}
        >
          {icon}
        </button>
      ))}
    </div>
  );
}