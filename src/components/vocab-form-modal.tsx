'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';

import { createVocabularyAction } from '@/app/actions/admin';

const JLPT: Array<'' | 'N5' | 'N4' | 'N3' | 'N2' | 'N1'> = ['', 'N5', 'N4', 'N3', 'N2', 'N1'];

export function VocabFormModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [examples, setExamples] = useState<{ jp: string; id: string; en: string }[]>([
    { jp: '', id: '', en: '' },
  ]);
  const [collocations, setCollocations] = useState<{ text: string; meaning: string }[]>([
    { text: '', meaning: '' },
  ]);

  if (!open || typeof document === 'undefined') return null;

  const submit = async (formData: FormData) => {
    await createVocabularyAction(formData);
    onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="New vocabulary"
    >
      <div className="absolute inset-0 bg-ink-950/60" onClick={onClose} />
      <div className="relative max-h-[90dvh] w-full max-w-2xl overflow-hidden rounded-2xl border border-ink-200 bg-washi-50 shadow-card animate-modal-in dark:border-ink-800 dark:bg-ink-900">
        <form action={submit} className="flex max-h-[90dvh] flex-col">
          <div className="flex items-center justify-between border-b border-ink-200 px-6 py-4 dark:border-ink-800">
            <h2 className="font-serif text-lg font-bold text-ink-900 dark:text-washi-50">New vocabulary</h2>
            <button type="button" className="btn-ghost" onClick={onClose}>✕</button>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <input name="kanji" placeholder="Kanji 漢字" className="field" />
              <input name="hiragana" placeholder="Hiragana ひらがな (required)" required className="field" />
              <input name="romaji" placeholder="Romaji" className="field" />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <select name="jlptLevel" className="field">
                {JLPT.map((l) => <option key={l} value={l}>{l || 'JLPT level'}</option>)}
              </select>
              <input name="partOfSpeech" placeholder="Part of speech" className="field" />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input name="meaning_id" placeholder="Meaning (Indonesian)" className="field" />
              <input name="meaning_en" placeholder="Meaning (English)" className="field" />
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-ink-700 dark:text-ink-200">Example sentences</h3>
              {examples.map((e, i) => (
                <div key={i} className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <input
                    name={`exampleJp[${i}]`}
                    placeholder="Japanese sentence"
                    className="field"
                    value={e.jp}
                    onChange={(ev) => {
                      const next = [...examples];
                      next[i] = { ...next[i], jp: ev.target.value };
                      setExamples(next);
                    }}
                  />
                  <input
                    name={`exampleTr_${i}_id`}
                    placeholder="Translation (ID)"
                    className="field"
                    value={e.id}
                    onChange={(ev) => {
                      const next = [...examples];
                      next[i] = { ...next[i], id: ev.target.value };
                      setExamples(next);
                    }}
                  />
                  <div className="flex gap-2">
                    <input
                      name={`exampleTr_${i}_en`}
                      placeholder="Translation (EN)"
                      className="field"
                      value={e.en}
                      onChange={(ev) => {
                        const next = [...examples];
                        next[i] = { ...next[i], en: ev.target.value };
                        setExamples(next);
                      }}
                    />
                    <button
                      type="button"
                      className="shrink-0 self-center text-ink-400 hover:text-shu-500"
                      aria-label="Remove example"
                      onClick={() => setExamples(examples.filter((_, x) => x !== i))}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
              <button
                type="button"
                className="text-sm text-shu-500 hover:underline"
                onClick={() => setExamples([...examples, { jp: '', id: '', en: '' }])}
              >
                + Add example
              </button>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-ink-700 dark:text-ink-200">Verb collocations</h3>
              {collocations.map((c, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    name={`collocation[${i}]`}
                    placeholder="Collocation"
                    className="field"
                    value={c.text}
                    onChange={(ev) => {
                      const next = [...collocations];
                      next[i] = { ...next[i], text: ev.target.value };
                      setCollocations(next);
                    }}
                  />
                  <input
                    name={`collocationMeaning[${i}]`}
                    placeholder="Meaning"
                    className="field"
                    value={c.meaning}
                    onChange={(ev) => {
                      const next = [...collocations];
                      next[i] = { ...next[i], meaning: ev.target.value };
                      setCollocations(next);
                    }}
                  />
                  <button
                    type="button"
                    className="shrink-0 self-center text-ink-400 hover:text-shu-500"
                    aria-label="Remove collocation"
                    onClick={() => setCollocations(collocations.filter((_, x) => x !== i))}
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="text-sm text-shu-500 hover:underline"
                onClick={() => setCollocations([...collocations, { text: '', meaning: '' }])}
              >
                + Add collocation
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-ink-200 px-6 py-4 dark:border-ink-800">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary">Add vocabulary</button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}