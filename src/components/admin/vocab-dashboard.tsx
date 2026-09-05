'use client';

import { useState } from 'react';

import { VocabFormModal } from '@/components/vocab-form-modal';
import type { WordCard } from '@/lib/domain';

export function VocabDashboard({ words }: { words: WordCard[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-serif text-lg font-bold text-ink-800 dark:text-ink-100">
          Vocabulary ({words.length} words)
        </h3>
        <button type="button" className="btn-primary" onClick={() => setOpen(true)}>
          + Add vocabulary
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {words.map((w: WordCard) => (
          <div key={w.vocabulary.id} className="card flex items-center justify-between px-4 py-2.5 text-sm">
            <span className="text-ink-800 dark:text-ink-100">
              {w.vocabulary.kanji ?? w.vocabulary.hiragana}
              <span className="ml-2 text-ink-400">{w.vocabulary.hiragana}</span>
            </span>
            <span className="text-ink-500 dark:text-ink-400">{w.translations['en'] ?? ''}</span>
          </div>
        ))}
      </div>

      <VocabFormModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
}