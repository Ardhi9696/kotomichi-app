'use client';

import { useState } from 'react';

import { DecksSection } from '@/components/admin/decks-section';
import { VocabDashboard } from '@/components/admin/vocab-dashboard';
import type { VocabularyPage } from '@/lib/ports/db-port';
import type { Deck } from '@/lib/domain';

type TabKey = 'vocab' | 'decks';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'vocab', label: 'Vocabulary' },
  { key: 'decks', label: 'Decks' },
];

export function ContentTabs({ initial, decks }: { initial: VocabularyPage; decks: Deck[] }) {
  const [tab, setTab] = useState<TabKey>('vocab');

  return (
    <div>
      <div role="tablist" className="mb-4 flex gap-1 border-b border-ink-200 dark:border-ink-800">
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={active}
              className={`-mb-px border-b-2 px-3 py-2 text-sm transition-colors ${
                active
                  ? 'border-shu-500 font-semibold text-shu-500 dark:text-shu-300'
                  : 'border-transparent text-ink-500 hover:text-ink-800 dark:text-ink-300 dark:hover:text-ink-100'
              }`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'vocab' ? (
        <VocabDashboard
          decks={decks}
          initial={{
            query: { page: initial.page, pageSize: initial.pageSize },
            page: initial,
          }}
        />
      ) : (
        <DecksSection decks={decks} />
      )}
    </div>
  );
}