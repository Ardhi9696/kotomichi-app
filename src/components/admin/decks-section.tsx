'use client';

import { useState } from 'react';

import { deleteDeckAction, togglePublishAction } from '@/app/actions/admin';
import { DeckDialog } from '@/components/admin/deck-dialog';
import { ConfirmModal } from '@/components/confirm-modal';
import type { Deck } from '@/lib/domain';

function DeckBadges({ deck }: { deck: Deck }) {
  return (
    <span className="flex flex-wrap gap-1.5">
      {deck.jftBasic && (
        <span className="rounded-full border border-amber-400/50 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-amber-600 dark:text-amber-300">
          JFT-Basic
        </span>
      )}
      {deck.jlptLevel && (
        <span className="rounded-full border border-sky-400/50 bg-sky-400/10 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-sky-600 dark:text-sky-300">
          {deck.jlptLevel}
        </span>
      )}
    </span>
  );
}

export function DecksSection({ decks }: { decks: Deck[] }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editDeck, setEditDeck] = useState<Deck | null>(null);
  const [deleteDeck, setDeleteDeck] = useState<Deck | null>(null);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-serif text-lg font-bold text-ink-800 dark:text-ink-100">
          Decks ({decks.length})
        </h3>
        <button type="button" className="btn-primary" onClick={() => setCreateOpen(true)}>
          + New deck
        </button>
      </div>
      <p className="mb-3 text-sm text-ink-500">
        JFT Basic otomatis diset setara JLPT N4 — pilihan level akan disembunyikan.
      </p>

      <div className="flex flex-col gap-2">
        {decks.map((d) => (
          <div key={d.id} className="card flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 text-sm">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-ink-800 dark:text-ink-100">{d.title}</span>
                <DeckBadges deck={d} />
              </div>
              {d.subtitle && <div className="text-ink-500 dark:text-ink-400">{d.subtitle}</div>}
            </div>
            <span
              className={`text-xs font-medium ${
                d.isPublished ? 'text-emerald-600 dark:text-emerald-400' : 'text-ink-400'
              }`}
            >
              {d.isPublished ? 'Published' : 'Draft'}
            </span>
            <div className="flex items-center gap-2">
              <button type="button" className="btn-ghost px-2 text-xs" onClick={() => setEditDeck(d)}>
                Edit
              </button>
              <form action={togglePublishAction}>
                <input type="hidden" name="id" value={d.id} />
                <input type="hidden" name="published" value={d.isPublished ? '' : 'on'} />
                <button type="submit" className="btn-ghost px-2 text-xs">
                  {d.isPublished ? 'Unpublish' : 'Publish'}
                </button>
              </form>
              <button
                type="button"
                className="btn-ghost px-2 text-xs text-shu-600"
                onClick={() => setDeleteDeck(d)}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      <DeckDialog
        key={editDeck ? `edit-${editDeck.id}` : 'create'}
        open={createOpen || Boolean(editDeck)}
        onClose={() => {
          setCreateOpen(false);
          setEditDeck(null);
        }}
        initial={editDeck}
      />

      <ConfirmModal
        open={Boolean(deleteDeck)}
        title="Delete deck?"
        description={
          deleteDeck
            ? `This removes "${deleteDeck.title}" and its word links. This cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        danger
        onConfirm={() => {
          if (!deleteDeck) return;
          const fd = new FormData();
          fd.set('id', String(deleteDeck.id));
          void deleteDeckAction(fd);
          setDeleteDeck(null);
        }}
        onCancel={() => setDeleteDeck(null)}
      />
    </div>
  );
}