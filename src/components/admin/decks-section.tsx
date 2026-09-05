'use client';

import { useState } from 'react';

import { togglePublishAction, updateDeckAction } from '@/app/actions/admin';
import { DeckDialog } from '@/components/admin/deck-dialog';
import type { Deck } from '@/lib/domain';

const JLPT: Array<'' | 'N5' | 'N4' | 'N3' | 'N2' | 'N1'> = ['', 'N5', 'N4', 'N3', 'N2', 'N1'];

export function DecksSection({ decks }: { decks: Deck[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-lg font-bold text-ink-800 dark:text-ink-100">New deck</h3>
          <button type="button" className="btn-primary" onClick={() => setOpen(true)}>
            + New deck
          </button>
        </div>
        <p className="text-sm text-ink-500">
          JFT Basic otomatis diset setara JLPT N4 — pilihan level akan disembunyikan.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="font-serif text-lg font-bold text-ink-800 dark:text-ink-100">
          Existing decks ({decks.length})
        </h3>
        {decks.map((d: Deck) => (
          <div key={d.id} className="flex flex-col gap-2">
            <form action={updateDeckAction} className="card flex flex-col gap-2 p-4 text-sm">
              <input type="hidden" name="id" value={d.id} />
              <div className="flex items-center gap-2">
                <input name="title" defaultValue={d.title} className="field" />
                <button type="submit" className="btn-secondary">Save</button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select name="jlptLevel" className="field" defaultValue={d.jlptLevel ?? ''}>
                  {JLPT.map((l) => <option key={l} value={l}>{l || 'JLPT level'}</option>)}
                </select>
                <label className="flex items-center gap-2 text-sm text-ink-600 dark:text-ink-300">
                  <input
                    type="checkbox"
                    name="jftBasic"
                    defaultChecked={d.jftBasic}
                    className="accent-shu-500"
                  />
                  JFT Basic
                </label>
                <input name="subtitle" defaultValue={d.subtitle ?? ''} placeholder="Subtitle" className="field" />
              </div>
            </form>
            <form action={togglePublishAction}>
              <input type="hidden" name="id" value={d.id} />
              <input type="hidden" name="published" value={d.isPublished ? '' : 'on'} />
              <button type="submit" className="btn-ghost">{d.isPublished ? 'Unpublish' : 'Publish'}</button>
            </form>
          </div>
        ))}
      </div>

      <DeckDialog open={open} onClose={() => setOpen(false)} />
    </div>
  );
}