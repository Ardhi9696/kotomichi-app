export default function LocaleLoading() {
  return (
    <div className="flex min-h-dvh items-center justify-center" role="status" aria-label="Loading">
      <div className="flex flex-col items-center gap-3">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-ink-300 border-t-shu-500 dark:border-ink-700 dark:border-t-shu-400" />
        <span className="text-sm text-ink-500 dark:text-ink-400">Loading — 読込中…</span>
      </div>
    </div>
  );
}
