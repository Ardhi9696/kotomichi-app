'use client';

import { useState } from 'react';

import {
  kanjiOnly,
  toBracketFurigana,
  detectFuriganaMode,
  extractBracketWord,
  parseFuriganaBracket,
} from '@/lib/furigana';
import type { FuriganaMode } from '@/lib/furigana';

const MODE_OPTIONS: { value: FuriganaMode; label: string; hint: string }[] = [
  { value: 'mono', label: 'Mono', hint: 'tiap huruf ada bacaannya' },
  { value: 'group', label: 'Group', hint: 'satu bacaan untuk semua kanji' },
];

/**
 * Editable furigana input supporting mono and group ruby, emitting the
 * bracket-format string (or empty) via `onChange`.
 */
export function FuriganaInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (bracket: string) => void;
}) {
  const parsed = parseFuriganaBracket(value);
  const initialMode = detectFuriganaMode(
    parsed.kanji.join('').length,
    parsed.furigana.length,
  );

  const [mode, setMode] = useState<FuriganaMode>(initialMode);
  const [kanjiInput, setKanjiInput] = useState(() => extractBracketWord(value));
  const [readings, setReadings] = useState<string[]>(
    parsed.furigana.length ? parsed.furigana : [''],
  );

  const kanjiChars = kanjiOnly(kanjiInput);
  const kanjiCount = [...kanjiChars].length;
  const isGroup = mode === 'group';

  function emit(
    m: FuriganaMode,
    kanji: string,
    rs: string[],
  ) {
    const bracket = toBracketFurigana(m, kanji, rs);
    onChange(bracket ?? '');
  }

  function setReading(index: number, text: string) {
    const next = [...readings];
    next[index] = text;
    setReadings(next);
    emit(mode, kanjiInput, next);
  }

  function handleMode(nextMode: FuriganaMode) {
    setMode(nextMode);
    if (nextMode === 'group') {
      const next = ['']; 
      setReadings(next);
      emit(nextMode, kanjiInput, next);
    } else {
      const count = kanjiCount;
      let next = readings.filter((r) => r.trim() !== '');
      while (next.length < count) next.push('');
      next = next.slice(0, count);
      setReadings(next);
      emit(nextMode, kanjiInput, next);
    }
  }

  return (
    <div className="space-y-2 rounded-xl border border-ink-200 p-3 dark:border-ink-800">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-ink-700 dark:text-ink-200">Furigana</span>
        <div className="inline-flex overflow-hidden rounded-lg border border-ink-200 dark:border-ink-800">
          {MODE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              title={opt.hint}
              onClick={() => handleMode(opt.value)}
              className={`px-3 py-1 text-xs font-medium transition-colors ${
                mode === opt.value
                  ? 'bg-shu-500 text-washi-50'
                  : 'bg-transparent text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-[11px] text-ink-500 dark:text-ink-400">
            Kata (boleh campur kana + kanji)
          </label>
          <input
            value={kanjiInput}
            onChange={(ev) => {
              setKanjiInput(ev.target.value);
              const chars = kanjiOnly(ev.target.value);
              if (mode === 'mono') {
                const count = [...chars].length;
                setReadings((prev) => {
                  const next = prev.slice(0, count);
                  while (next.length < count) next.push('');
                  return next;
                });
                const next = readings.slice(0, count);
                while (next.length < count) next.push('');
                emit(mode, ev.target.value, next);
              } else {
                emit(mode, ev.target.value, readings);
              }
            }}
            placeholder="mis. 大雨 / 知り合い / お土産"
            className="field"
          />
        </div>

        <div>
          <label className="mb-1 block text-[11px] text-ink-500 dark:text-ink-400">
            {isGroup ? 'Satu bacaan' : `Bacaan (${kanjiCount || ''} — satu per kanji)`}
          </label>
          {isGroup ? (
            <input
              value={readings[0] ?? ''}
              onChange={(ev) => setReading(0, ev.target.value)}
              placeholder="mis. おとな"
              className="field"
            />
          ) : (
            <div className="space-y-1.5">
              {[...kanjiChars].map((ch, i) => (
                <input
                  key={i}
                  value={readings[i] ?? ''}
                  onChange={(ev) => setReading(i, ev.target.value)}
                  placeholder={`bacaan ${ch}`}
                  className="field"
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-ink-500 dark:text-ink-400">
        {isGroup ? 'Satu furigana untuk seluruh kanji.' : 'Setiap kanji punya satu furigana.'}
      </p>
    </div>
  );
}
