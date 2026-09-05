'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { createDeckAction } from '@/app/actions/admin';
import { DialogShell } from '@/components/dialog-shell';
import { FormSubmitButton } from '@/components/form-submit-button';
import { useFlash } from '@/components/flash-provider';

const JLPT: Array<'' | 'N5' | 'N4' | 'N3' | 'N2' | 'N1'> = ['', 'N5', 'N4', 'N3', 'N2', 'N1'];

export function DeckDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const { show } = useFlash();
  const [jftBasic, setJftBasic] = useState(false);

  const submit = async (formData: FormData) => {
    await createDeckAction(formData);
    setJftBasic(false);
    onClose();
    router.refresh();
    show('success', 'Deck created.');
  };

  return (
    <DialogShell open={open} onClose={onClose} title="New deck">
      <form action={submit} className="flex flex-col gap-3">
        <input name="title" placeholder="Deck title (required)" required className="field" />
        <input name="subtitle" placeholder="Subtitle" className="field" />

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
          <select name="jlptLevel" className="field">
            {JLPT.map((l) => <option key={l} value={l}>{l || 'JLPT level'}</option>)}
          </select>
        )}
        {jftBasic && <input type="hidden" name="jlptLevel" value="N4" />}

        <label className="flex items-center gap-2 text-sm text-ink-700 dark:text-ink-200">
          <input type="checkbox" name="published" className="accent-shu-500" /> Published
        </label>

        <div className="mt-1 flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <FormSubmitButton className="btn-primary" pendingLabel="Creating…">Create deck</FormSubmitButton>
        </div>
      </form>
    </DialogShell>
  );
}