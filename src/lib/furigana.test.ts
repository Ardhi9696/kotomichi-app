import { describe, expect, it } from 'vitest';

import {
  kanjiOnly,
  detectFuriganaMode,
  extractBracketWord,
  parseFuriganaBracket,
  toBracketFurigana,
} from '@/lib/furigana';

/* ────────── kanjiOnly ────────── */

describe('kanjiOnly', () => {
  it('strips hiragana', () => {
    expect(kanjiOnly('知り合い')).toBe('知合');
  });

  it('strips katakana', () => {
    expect(kanjiOnly('東京タワー')).toBe('東京');
  });

  it('returns empty for kana-only', () => {
    expect(kanjiOnly('ひらがな')).toBe('');
  });

  it('keeps all-kanji unchanged', () => {
    expect(kanjiOnly('大人')).toBe('大人');
  });

  it('handles empty string', () => {
    expect(kanjiOnly('')).toBe('');
  });
});

/* ────────── extractBracketWord ────────── */

describe('extractBracketWord', () => {
  it('rebuilds group ruby', () => {
    expect(extractBracketWord('[大人[おとな]]')).toBe('大人');
  });

  it('rebuilds mono ruby', () => {
    expect(extractBracketWord('[大[おお]][雨[あめ]]')).toBe('大雨');
  });

  it('rebuilds mixed kanji + kana', () => {
    expect(extractBracketWord('[知[し]]り[合[あ]]い')).toBe('知り合い');
  });

  it('rebuilds leading kana', () => {
    expect(extractBracketWord('お[土[み]][産[やげ]]')).toBe('お土産');
  });

  it('returns empty for empty string', () => {
    expect(extractBracketWord('')).toBe('');
  });
});

/* ────────── detectFuriganaMode ────────── */

describe('detectFuriganaMode', () => {
  it('detects mono when counts match', () => {
    expect(detectFuriganaMode(2, 2)).toBe('mono');
  });

  it('detects group when furigana is 1', () => {
    expect(detectFuriganaMode(3, 1)).toBe('group');
  });

  it('detects group when fewer readings than kanji', () => {
    expect(detectFuriganaMode(4, 2)).toBe('group');
  });
});

/* ────────── parseFuriganaBracket ────────── */

describe('parseFuriganaBracket', () => {
  it('parses mono ruby', () => {
    const r = parseFuriganaBracket('[大[おお]][雨[あめ]]');
    expect(r.kanji).toEqual(['大', '雨']);
    expect(r.furigana).toEqual(['おお', 'あめ']);
  });

  it('parses group ruby', () => {
    const r = parseFuriganaBracket('[大人[おとな]]');
    expect(r.kanji).toEqual(['大人']);
    expect(r.furigana).toEqual(['おとな']);
  });

  it('parses mixed kanji + kana', () => {
    const r = parseFuriganaBracket('[知[し]]り[合[あ]]い');
    expect(r.kanji).toEqual(['知', '合']);
    expect(r.furigana).toEqual(['し', 'あ']);
  });

  it('parses leading kana', () => {
    const r = parseFuriganaBracket('お[土[み]][産[やげ]]');
    expect(r.kanji).toEqual(['土', '産']);
    expect(r.furigana).toEqual(['み', 'やげ']);
  });

  it('parses single kanji', () => {
    const r = parseFuriganaBracket('[働[はたら]]く');
    expect(r.kanji).toEqual(['働']);
    expect(r.furigana).toEqual(['はたら']);
  });

  it('returns empty arrays for empty string', () => {
    const r = parseFuriganaBracket('');
    expect(r.kanji).toEqual([]);
    expect(r.furigana).toEqual([]);
  });

  it('parses all-kanji group', () => {
    const r = parseFuriganaBracket('[学校[がっこう]]');
    expect(r.kanji).toEqual(['学校']);
    expect(r.furigana).toEqual(['がっこう']);
  });
});

/* ────────── toBracketFurigana ────────── */

describe('toBracketFurigana', () => {
  it('builds mono ruby for 大雨', () => {
    const r = toBracketFurigana('mono', '大雨', ['おお', 'あめ']);
    expect(r).toBe('[大[おお]][雨[あめ]]');
  });

  it('builds group ruby for 大人', () => {
    const r = toBracketFurigana('group', '大人', ['おとな']);
    expect(r).toBe('[大人[おとな]]');
  });

  it('builds mono ruby for mixed kanji+kana: 知り合い', () => {
    const r = toBracketFurigana('mono', '知り合い', ['し', 'あ']);
    expect(r).toBe('[知[し]]り[合[あ]]い');
  });

  it('builds mono ruby with leading kana: お土産', () => {
    const r = toBracketFurigana('mono', 'お土産', ['み', 'やげ']);
    expect(r).toBe('お[土[み]][産[やげ]]');
  });

  it('builds mono ruby for single kanji: 働く', () => {
    const r = toBracketFurigana('mono', '働く', ['はたら']);
    expect(r).toBe('[働[はたら]]く');
  });

  it('builds group ruby for 学校', () => {
    const r = toBracketFurigana('group', '学校', ['がっこう']);
    expect(r).toBe('[学校[がっこう]]');
  });

  it('returns null when no readings', () => {
    expect(toBracketFurigana('mono', '大雨', [])).toBeNull();
    expect(toBracketFurigana('group', '大人', [''])).toBeNull();
  });

  it('returns null when word has no kanji', () => {
    expect(toBracketFurigana('mono', 'ひらがな', ['ひ', 'ら', 'が', 'な'])).toBeNull();
  });

  it('trims whitespace from readings', () => {
    const r = toBracketFurigana('mono', '大雨', [' おお ', ' あめ ']);
    expect(r).toBe('[大[おお]][雨[あめ]]');
  });

  it('truncates extra readings in mono mode', () => {
    const r = toBracketFurigana('mono', '大雨', ['おお', 'あめ', '余分']);
    expect(r).toBe('[大[おお]][雨[あめ]]');
  });
});

/* ────────── roundtrip ────────── */

describe('roundtrip parse → build', () => {
  it('mono: parse then rebuild', () => {
    const bracket = '[大[おお]][雨[あめ]]';
    const { kanji, furigana } = parseFuriganaBracket(bracket);
    expect(kanji.length).toBe(2);
    const mode = detectFuriganaMode(kanji.length, furigana.length);
    expect(mode).toBe('mono');
    const rebuilt = toBracketFurigana(mode, '大雨', furigana);
    expect(rebuilt).toBe(bracket);
  });

  it('group: parse then rebuild', () => {
    const bracket = '[大人[おとな]]';
    const { kanji, furigana } = parseFuriganaBracket(bracket);
    expect(kanji.length).toBe(1);
    const mode = detectFuriganaMode(kanji.length, furigana.length);
    expect(mode).toBe('group');
    const rebuilt = toBracketFurigana(mode, '大人', furigana);
    expect(rebuilt).toBe(bracket);
  });

  it('mixed: parse then rebuild', () => {
    const bracket = '[知[し]]り[合[あ]]い';
    const { kanji, furigana } = parseFuriganaBracket(bracket);
    expect(kanji).toEqual(['知', '合']);
    expect(furigana).toEqual(['し', 'あ']);
    const mode = detectFuriganaMode(kanji.length, furigana.length);
    expect(mode).toBe('mono');
    const rebuilt = toBracketFurigana(mode, '知り合い', furigana);
    expect(rebuilt).toBe(bracket);
  });

  it('leading kana: parse then rebuild', () => {
    const bracket = 'お[土[み]][産[やげ]]';
    const { kanji, furigana } = parseFuriganaBracket(bracket);
    expect(kanji).toEqual(['土', '産']);
    expect(furigana).toEqual(['み', 'やげ']);
    const mode = detectFuriganaMode(kanji.length, furigana.length);
    const rebuilt = toBracketFurigana(mode, 'お土産', furigana);
    expect(rebuilt).toBe(bracket);
  });
});
