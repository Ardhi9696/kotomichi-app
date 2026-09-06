import { getTranslations } from 'next-intl/server';

export default async function AppLoading() {
  const t = await getTranslations('common');
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label={t('loading')}>
      <section>
        <div className="h-8 w-2/5 animate-pulse rounded-lg bg-ink-200/70 dark:bg-ink-800" />
        <div className="mt-2 h-4 w-3/5 animate-pulse rounded bg-ink-200/50 dark:bg-ink-800/60" />
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="card p-4">
            <div className="h-3 w-3/4 animate-pulse rounded bg-ink-200/70 dark:bg-ink-800" />
            <div className="mt-3 h-6 w-1/2 animate-pulse rounded bg-ink-200/70 dark:bg-ink-800" />
            <div className="mt-2 h-3 w-2/5 animate-pulse rounded bg-ink-200/50 dark:bg-ink-800/60" />
          </div>
        ))}
      </section>

      <section className="card p-6">
        <div className="flex items-end justify-between">
          <div>
            <div className="h-5 w-36 animate-pulse rounded bg-ink-200/70 dark:bg-ink-800" />
            <div className="mt-2 h-3 w-48 animate-pulse rounded bg-ink-200/50 dark:bg-ink-800/60" />
          </div>
          <div className="flex gap-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-9 w-16 animate-pulse rounded-xl bg-ink-200/50 dark:bg-ink-800/60" />
            ))}
          </div>
        </div>
        <div className="mt-5 grid grid-cols-7 gap-1">
          {Array.from({ length: 28 }).map((_, i) => (
            <div key={i} className="aspect-square animate-pulse rounded-lg bg-ink-200/40 dark:bg-ink-800/50" />
          ))}
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="card p-6">
            <div className="h-5 w-32 animate-pulse rounded bg-ink-200/70 dark:bg-ink-800" />
            <div className="mt-4 space-y-3">
              {[0, 1, 2].map((j) => (
                <div key={j} className="h-4 animate-pulse rounded bg-ink-200/50 dark:bg-ink-800/60" />
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}