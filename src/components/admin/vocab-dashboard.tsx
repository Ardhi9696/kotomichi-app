'use client';

import { useState } from 'react';

import { removeVocabularyAction } from '@/app/actions/admin';
import { ConfirmModal } from '@/components/confirm-modal';
import { VocabFormModal } from '@/components/vocab-form-modal';
import type { Deck, WordCard } from '@/lib/domain';

function LevelBadges({ word }: { word: WordCard }) {
  return (
    <span className="flex flex-wrap gap-1.5">
      {word.vocabulary.jftBasic && (
        <span className="rounded-full border border-amber-400/50 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-amber-600 dark:text-amber-300">
          JFT-Basic
        </span>
      )}
      {word.vocabulary.jlptLevel && (
        <span className="rounded-full border border-sky-400/50 bg-sky-400/10 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-sky-600 dark:text-sky-300">
          {word.vocabulary.jlptLevel}
        </span>
      )}
    </span>
  );
}

export function VocabDashboard({ words, decks }: { words: WordCard[]; decks: Deck[] }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editWord, setEditWord] = useState<WordCard | null>(null);
  const [deleteWord, setDeleteWord] = useState<WordCard | null>(null);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-serif text-lg font-bold text-ink-800 dark:text-ink-100">
          Vocabulary ({words.length} words)
        </h3>
        <button type="button" className="btn-primary" onClick={() => setCreateOpen(true)}>
          + Add vocabulary
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {words.map((w) => (
          <div
            key={w.vocabulary.id}
            className="card flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 text-sm"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-ink-800 dark:text-ink-100">
                  {w.vocabulary.kanji ?? w.vocabulary.hiragana}
                </span>
                {w.vocabulary.kanji && (
                  <span className="text-ink-400">{w.vocabulary.hiragana}</span>
                )}
                <LevelBadges word={w} />
              </div>
              <div className="text-ink-500 dark:text-ink-400">
                {[w.translations['id'], w.translations['en']].filter(Boolean).join(' · ')}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" className="btn-ghost px-2 text-xs" onClick={() => setEditWord(w)}>
                Edit
              </button>
              <button
                type="button"
                className="btn-ghost px-2 text-xs text-shu-600"
                onClick={() => setDeleteWord(w)}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      <VocabFormModal
        key={editWord ? `edit-${editWord.vocabulary.id}` : 'create'}
        open={createOpen || Boolean(editWord)}
        onClose={() => {
          setCreateOpen(false);
          setEditWord(null);
        }}
        decks={decks}
        initial={editWord}
      />

      <ConfirmModal
        open={Boolean(deleteWord)}
        title="Delete vocabulary?"
        description={
          deleteWord
            ? `This removes "${deleteWord.vocabulary.hiragana}" and its translations, examples and collocations. This cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        danger
        onConfirm={() => {
          if (!deleteWord) return;
          const fd = new FormData();
          fd.set('id', String(deleteWord.vocabulary.id));
          void removeVocabularyAction(fd);
          setDeleteWord(null);
        }}
        onCancel={() => setDeleteWord(null)}
      />
    </div>
  );
}