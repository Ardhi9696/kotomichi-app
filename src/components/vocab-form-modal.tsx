'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';

import { useRouter } from 'next/navigation';

import { createVocabularyAction } from '@/app/actions/admin';
import type { Deck } from '@/lib/domain';

const JLPT: Array<'' | 'N5' | 'N4' | 'N3' | 'N2' | 'N1'> = ['', 'N5', 'N4', 'N3', 'N2', 'N1'];

export function VocabFormModal({
  open,
  onClose,
  decks,
}: {
  open: boolean;
  onClose: () => void;
  decks: Deck[];
}) {
  const router = useRouter();
  const [examples, setExamples] = useState<{ jp: string; id: string; en: string }[]>([
    { jp: '', id: '', en: '' },
  ]);
  const [collocations, setCollocations] = useState<{ text: string; meaning: string }[]>([
    { text: '', meaning: '' },
  ]);
  const [jftBasic, setJftBasic] = useState(false);
  const [partOfSpeech, setPartOfSpeech] = useState('');
  const [verbCollocation, setVerbCollocation] = useState(false);

  if (!open || typeof document === 'undefined') return null;

  const submit = async (formData: FormData) => {
    await createVocabularyAction(formData);
    onClose();
    router.refresh();
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
            <p className="text-xs text-ink-500 dark:text-ink-400">
              <span className="font-semibold text-shu-500">*</span> = wajib diisi · bidang lain boleh dikosongkan (null) dulu.
            </p>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <input name="kanji" placeholder="Kanji 漢字 (opsional)" className="field" />
              <input name="hiragana" placeholder="Hiragana ひらがな * (wajib)" required className="field" />
              <input name="romaji" placeholder="Romaji (opsional)" className="field" />
            </div>

            <label className="flex items-center gap-2 text-sm text-ink-700 dark:text-ink-200">
              <input
                type="checkbox"
                name="jftBasic"
                checked={jftBasic}
                onChange={(ev) => setJftBasic(ev.target.checked)}
                className="accent-shu-500"
              />
              JFT Basic
              {jftBasic && <span className="text-xs text-shu-500">— setara JLPT N4</span>}
            </label>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {jftBasic ? (
                <input type="hidden" name="jlptLevel" value="N4" />
              ) : (
                <select name="jlptLevel" defaultValue="N4" className="field">
                  {JLPT.map((l) => <option key={l} value={l}>{l || 'JLPT level'}</option>)}
                </select>
              )}
              <select
                name="partOfSpeech"
                value={partOfSpeech}
                onChange={(ev) => {
                  setPartOfSpeech(ev.target.value);
                  if (ev.target.value !== 'verb') setVerbCollocation(false);
                }}
                className="field"
              >
                <option value="">Part of speech</option>
                <option value="noun">Noun (Kata Benda)</option>
                <option value="verb">Verb (Kata Kerja)</option>
                <option value="adverb">Adverb (Kata Keterangan)</option>
                <option value="adjective">Adjective (Kata Sifat)</option>
                <option value="conjunction">Conjunction (Kata Sambung)</option>
                <option value="demonstrative">Demonstrative (Kata Tunjuk)</option>
              </select>
            </div>

            {partOfSpeech === 'verb' && (
              <div className="rounded-xl border border-ink-200 p-4 dark:border-ink-800">
                <h3 className="mb-2 text-sm font-semibold text-ink-700 dark:text-ink-200">
                  Detail verb (opsional — boleh kosong dulu)
                </h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <select name="verbType" className="field" defaultValue="">
                    <option value="">Konjugasi (Godan/Ichidan/Fukisoku)</option>
                    <option value="godan">Godan (五段動詞)</option>
                    <option value="ichidan">Ichidan (一段動詞)</option>
                    <option value="fukisoku">Fukisoku (不規則動詞: する/来る)</option>
                  </select>
                  <select name="transitivity" className="field" defaultValue="">
                    <option value="">Transitivitas (Jidoushi/Tadoushi)</option>
                    <option value="jidoushi">Jidoushi (自動詞) — intransitif</option>
                    <option value="tadoushi">Tadoushi (他動詞) — transitif</option>
                    <option value="both">Keduanya (Jidoushi &amp; Tadoushi)</option>
                  </select>
                </div>
                <label className="mt-3 flex items-center gap-2 text-sm text-ink-700 dark:text-ink-200">
                  <input
                    type="checkbox"
                    name="verbCollocation"
                    checked={verbCollocation}
                    onChange={(ev) => setVerbCollocation(ev.target.checked)}
                    className="accent-shu-500"
                  />
                  Punya kolokasi kata kerja (isi blok Verb collocations di bawah)
                </label>
              </div>
            )}

            {partOfSpeech === 'adjective' && (
              <div className="rounded-xl border border-ink-200 p-4 dark:border-ink-800">
                <h3 className="mb-2 text-sm font-semibold text-ink-700 dark:text-ink-200">
                  Jenis adjektiva (opsional — boleh kosong dulu)
                </h3>
                <select name="adjectiveType" className="field" defaultValue="">
                  <option value="">Jenis adjektiva</option>
                  <option value="i">I-Adjective (い形容詞)</option>
                  <option value="na">Na-Adjective (な形容詞)</option>
                </select>
              </div>
            )}

            <div className="rounded-xl border border-ink-200 p-4 dark:border-ink-800">
              <h3 className="mb-2 text-sm font-semibold text-ink-700 dark:text-ink-200">
                Tambahkan ke deck (opsional — bisa kosong dulu)
              </h3>
              {decks.length === 0 ? (
                <p className="text-xs text-ink-500">Belum ada deck. Buat deck dulu lalu kembali ke sini.</p>
              ) : (
                <div className="flex flex-wrap gap-x-4 gap-y-2">
                  {decks.map((d) => (
                    <label key={d.id} className="flex items-center gap-2 text-sm text-ink-700 dark:text-ink-200">
                      <input type="checkbox" name="deckIds" value={d.id} className="accent-shu-500" />
                      {d.title}
                      {d.jftBasic && <span className="text-xs text-shu-500">(JFT Basic)</span>}
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input name="meaning_id" placeholder="Meaning (Indonesian) — opsional" className="field" />
              <input name="meaning_en" placeholder="Meaning (English) — opsional" className="field" />
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-ink-700 dark:text-ink-200">Example sentences (opsional)</h3>
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

            {verbCollocation && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-ink-700 dark:text-ink-200">Verb collocations (opsional)</h3>
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
            )}
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