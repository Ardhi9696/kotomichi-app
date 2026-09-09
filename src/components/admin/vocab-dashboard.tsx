'use client';

import { useMemo, useState } from 'react';

import useSWR from 'swr';

import { queryVocabularyAction, removeVocabularyAction } from '@/app/actions/admin';
import { ConfirmModal } from '@/components/confirm-modal';
import { VocabFormModal } from '@/components/vocab-form-modal';
import { VocabularyBulkModal } from '@/components/vocabulary-bulk-modal';
import type { AdminVocabPageData } from '@/lib/page-data/types';
import { useFlash } from '@/components/flash-provider';
import type { Deck, WordCard } from '@/lib/domain';

const JLPT_LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1'] as const;

const PART_OF_SPEECH_OPTIONS: { value: string; label: string }[] = [
  { value: 'noun', label: 'Noun' },
  { value: 'verb', label: 'Verb' },
  { value: 'adverb', label: 'Adverb' },
  { value: 'adjective', label: 'Adjective' },
  { value: 'conjunction', label: 'Conjunction' },
  { value: 'demonstrative', label: 'Demonstrative' },
];

const PAGE_SIZE = 20;

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

export function VocabDashboard({
  decks,
  initial,
}: {
  decks: Deck[];
  initial: AdminVocabPageData;
}) {
  const { show } = useFlash();
  const [createOpen, setCreateOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editWord, setEditWord] = useState<WordCard | null>(null);
  const [deleteWord, setDeleteWord] = useState<WordCard | null>(null);
  const [formKey, setFormKey] = useState(0);

  // Search / filter / pagination state
  const [qInput, setQInput] = useState(initial.query.q ?? '');
  const [q, setQ] = useState(initial.query.q ?? '');
  const [jlptLevel, setJlptLevel] = useState(initial.query.jlptLevel ?? '');
  const [partOfSpeech, setPartOfSpeech] = useState(initial.query.partOfSpeech ?? '');
  const [page, setPage] = useState(initial.page.page);

  const swrKey = useMemo(
    () =>
      [
        'admin-vocab',
        q,
        jlptLevel || 'all',
        partOfSpeech || 'all',
        page,
      ] as const,
    [q, jlptLevel, partOfSpeech, page],
  );

  const { data, isValidating } = useSWR(swrKey, () =>
    queryVocabularyAction({
      q: q || undefined,
      jlptLevel: jlptLevel || null,
      partOfSpeech: partOfSpeech || null,
      page,
      pageSize: PAGE_SIZE,
    }),
    {
      fallbackData: initial.page,
      revalidateOnMount: false,
      revalidateOnFocus: false,
      keepPreviousData: true,
    },
  );

  const current = data ?? initial.page;
  const total = current.total;
  const totalPages = current.totalPages;
  const words = current.words;

  const appliedFilters = Boolean(q || jlptLevel || partOfSpeech);

  function applyFilters() {
    setQ(qInput.trim());
    setPage(1);
  }

  function clearFilters() {
    setQInput('');
    setQ('');
    setJlptLevel('');
    setPartOfSpeech('');
    setPage(1);
  }

  function gotoPage(p: number) {
    if (p < 1 || p > totalPages) return;
    setPage(p);
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="font-serif text-lg font-bold text-ink-800 dark:text-ink-100">
          Vocabulary ({total} words)
        </h3>
        <div className="relative">
          <button
            type="button"
            className="btn-primary"
            onClick={() => setMenuOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            + Add vocabulary
            <span aria-hidden="true" className="ml-1 text-xs">▾</span>
          </button>
          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 z-30 mt-1 w-56 overflow-hidden rounded-xl border border-ink-200 bg-washi-50 shadow-card dark:border-ink-800 dark:bg-ink-900"
            >
              <button
                type="button"
                role="menuitem"
                className="block w-full px-4 py-2.5 text-left text-sm text-ink-700 hover:bg-ink-100 dark:text-ink-200 dark:hover:bg-ink-800"
                onClick={() => {
                  setMenuOpen(false);
                  setEditWord(null);
                  setFormKey((k) => k + 1);
                  setCreateOpen(true);
                }}
              >
                Add single
              </button>
              <button
                type="button"
                role="menuitem"
                className="block w-full border-t border-ink-100 px-4 py-2.5 text-left text-sm text-ink-700 hover:bg-ink-100 dark:border-ink-800 dark:text-ink-200 dark:hover:bg-ink-800"
                onClick={() => {
                  setMenuOpen(false);
                  setBulkOpen(true);
                }}
              >
                Import (CSV/Excel)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Search + filter bar */}
      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center">
        <form
          className="flex min-w-0 flex-1 gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            applyFilters();
          }}
        >
          <input
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            placeholder="Search kanji, hiragana, romaji, or meaning..."
            className="field min-w-0 flex-1"
            aria-label="Search vocabulary"
          />
          <button type="submit" className="btn-secondary shrink-0">Search</button>
        </form>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={partOfSpeech}
            onChange={(e) => {
              setPartOfSpeech(e.target.value);
              setPage(1);
            }}
            className="field"
            aria-label="Filter by part of speech"
          >
            <option value="">Part of speech</option>
            {PART_OF_SPEECH_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <select
            value={jlptLevel}
            onChange={(e) => {
              setJlptLevel(e.target.value);
              setPage(1);
            }}
            className="field"
            aria-label="Filter by JLPT level"
          >
            <option value="">JLPT level</option>
            {JLPT_LEVELS.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
          {appliedFilters && (
            <button type="button" className="btn-ghost px-2 text-xs" onClick={clearFilters}>
              Clear
            </button>
          )}
          {isValidating && <span className="text-xs text-ink-400">…</span>}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {words.length === 0 ? (
          <p className="text-sm text-ink-500 dark:text-ink-400">No vocabulary found.</p>
        ) : (
          words.map((w) => (
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
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2 text-sm">
          <button
            type="button"
            className="btn-ghost px-3 py-1"
            disabled={page <= 1}
            onClick={() => gotoPage(page - 1)}
          >
            ← Prev
          </button>
          <span className="text-ink-600 dark:text-ink-300">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            className="btn-ghost px-3 py-1"
            disabled={page >= totalPages}
            onClick={() => gotoPage(page + 1)}
          >
            Next →
          </button>
        </div>
      )}

      <VocabFormModal
        key={editWord ? `edit-${editWord.vocabulary.id}` : `create-${formKey}`}
        open={createOpen || Boolean(editWord)}
        onClose={() => {
          setCreateOpen(false);
          setEditWord(null);
        }}
        decks={decks}
        initial={editWord}
      />

      <VocabularyBulkModal
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        decks={decks}
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
          void removeVocabularyAction(fd).then(() => {
            show('success', 'Vocabulary deleted.');
          });
          setDeleteWord(null);
        }}
        onCancel={() => setDeleteWord(null)}
      />
    </div>
  );
}
