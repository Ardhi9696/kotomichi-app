'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { createDeckAction, updateDeckAction } from '@/app/actions/admin';
import { DialogShell } from '@/components/dialog-shell';
import { FormSubmitButton } from '@/components/form-submit-button';
import { useFlash } from '@/components/flash-provider';
import type { Deck } from '@/lib/domain';

const JLPT: Array<'' | 'N5' | 'N4' | 'N3' | 'N2' | 'N1'> = ['', 'N5', 'N4', 'N3', 'N2', 'N1'];

export function DeckDialog({
  open,
  onClose,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  initial?: Deck | null;
}) {
  const router = useRouter();
  const { show } = useFlash();
  const editing = Boolean(initial);
  const deckId = initial?.id ?? null;
  const [jftBasic, setJftBasic] = useState(Boolean(initial?.jftBasic));

  const submit = async (formData: FormData) => {
    if (editing) {
      await updateDeckAction(formData);
    } else {
      await createDeckAction(formData);
    }
    onClose();
    router.refresh();
    show('success', editing ? 'Deck updated.' : 'Deck created.');
  };

  return (
    <DialogShell open={open} onClose={onClose} title={editing ? 'Edit deck' : 'New deck'}>
      <form action={submit} className="flex flex-col gap-3">
        {editing && deckId != null && <input type="hidden" name="id" value={deckId} />}
        <input name="title" defaultValue={initial?.title ?? ''} placeholder="Deck title (required)" required className="field" />
        <input name="subtitle" defaultValue={initial?.subtitle ?? ''} placeholder="Subtitle" className="field" />

        <label className="flex items-center gap-2 text-sm text-ink-700 dark:text-ink-200">
          <input
            type="checkbox"
            name="jftBasic"
            checked={jftBasic}
            onChange={(ev) => setJftBasic(ev.target.checked)}
            className="accent-shu-500"
          />
          JFT Basic
        </label>

        {jftBasic ? (
          <p className="text-xs text-shu-500">JFT Basic — setara JLPT N4</p>
        ) : (
          <select name="jlptLevel" defaultValue={initial?.jlptLevel ?? ''} className="field">
            {JLPT.map((l) => <option key={l} value={l}>{l || 'JLPT level'}</option>)}
          </select>
        )}
        {jftBasic && <input type="hidden" name="jlptLevel" value="N4" />}

        {editing ? (
          <p className="text-xs text-ink-500 dark:text-ink-400">
            Publish status can be toggled from the deck list.
          </p>
        ) : (
          <label className="flex items-center gap-2 text-sm text-ink-700 dark:text-ink-200">
            <input type="checkbox" name="published" className="accent-shu-500" /> Published
          </label>
        )}

        <div className="mt-1 flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <FormSubmitButton className="btn-primary" pendingLabel="Saving…">
            {editing ? 'Save' : 'Create deck'}
          </FormSubmitButton>
        </div>
      </form>
    </DialogShell>
  );
}