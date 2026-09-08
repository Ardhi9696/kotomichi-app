export default function AppLoading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center" role="status" aria-label="Loading">
      <div className="flex flex-col items-center gap-3">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-ink-200 border-t-shu-500 dark:border-ink-700 dark:border-t-shu-400" />
        <span className="text-xs text-ink-400">Loading — 読込中…</span>
      </div>
    </div>
  );
}
