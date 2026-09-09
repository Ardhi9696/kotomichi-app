/**
 * Pure helpers for bulk vocabulary import (CSV/Excel).
 * Shared by the client (preview/validation) and the server action (audit).
 * No vendor or server-only dependencies.
 */

import type { JlptLevel, PartOfSpeech } from '@/lib/domain';
import type { TagWithVocabInput } from '@/lib/ports/db-port';
import { toBracketFurigana } from '@/lib/furigana';

export const BULK_COLUMNS = [
  'kanji',
  'hiragana',
  'romaji',
  'furigana',
  'jlptLevel',
  'jftBasic',
  'partOfSpeech',
  'godanVerb',
  'ichidanVerb',
  'fukisoku',
  'iAdjective',
  'naAdjective',
  'jidoushi',
  'tadoushi',
  'verbCollocation',
  'meaning_id',
  'meaning_en',
  'example_jp',
  'example_id',
  'example_en',
  'collocation',
  'collocation_meaning',
] as const;

const JLPT: readonly string[] = ['N1', 'N2', 'N3', 'N4', 'N5'];
const PARTS_OF_SPEECH: readonly string[] = [
  'noun',
  'verb',
  'adverb',
  'adjective',
  'conjunction',
  'demonstrative',
];

function cell(row: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    for (const [rawKey, value] of Object.entries(row)) {
      if (rawKey.trim().toLowerCase() === key) {
        const v =
          value === null || value === undefined
            ? ''
            : typeof value === 'number'
              ? String(value)
              : String(value).trim();
        return v;
      }
    }
  }
  return '';
}

function truthy(v: string): boolean {
  return ['true', '1', 'yes', 'ya', 'y'].includes(v.toLowerCase());
}

export function convertFuriganaToBracketFormat(
  kanji: string,
  furiganaInput: string,
): string | null {
  if (!furiganaInput) return null;
  const furiganas = furiganaInput
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (furiganas.length === 0) return null;
  return toBracketFurigana('mono', kanji, furiganas);
}

export interface BulkRowResult {
  line: number;
  input?: TagWithVocabInput;
  errors: string[];
}

export function buildBulkRow(row: Record<string, unknown>, line: number): BulkRowResult {
  const errors: string[] = [];

  const hiragana = cell(row, 'hiragana');
  if (!hiragana) errors.push('hiragana wajib diisi');

  const jlptRaw = cell(row, 'jlptlevel', 'jlpt');
  const jlptOk = !jlptRaw || JLPT.includes(jlptRaw.toUpperCase());
  if (jlptRaw && !jlptOk) errors.push(`jlptLevel tidak valid: "${jlptRaw}" (N1–N5)`);

  const posRaw = cell(row, 'partofspeech', 'pos');
  const posOk = !posRaw || PARTS_OF_SPEECH.includes(posRaw.toLowerCase());
  if (posRaw && !posOk) errors.push(`partOfSpeech tidak valid: "${posRaw}"`);

  const meaningId = cell(row, 'meaning_id', 'meaningid');
  const meaningEn = cell(row, 'meaning_en', 'meaningen');

  const exampleJp = cell(row, 'example_jp', 'examplejp');
  const exampleId = cell(row, 'example_id', 'exampleid');
  const exampleEn = cell(row, 'example_en', 'exampleen');
  if ((exampleId || exampleEn) && !exampleJp) {
    errors.push('example_Jp wajib ada jika ada translation example');
  }

  const collocation = cell(row, 'collocation');
  const collocationMeaning = cell(row, 'collocation_meaning', 'collocationmeaning');

  if (errors.length > 0) return { line, errors };

  const jftBasic = truthy(cell(row, 'jftbasic'));
  const translations: TagWithVocabInput['translations'] = [];
  if (meaningId) translations.push({ locale: 'id', meaning: meaningId });
  if (meaningEn) translations.push({ locale: 'en', meaning: meaningEn });

  const examples: TagWithVocabInput['examples'] = [];
  if (exampleJp) {
    const t: NonNullable<TagWithVocabInput['examples']>[number]['translations'] = [];
    if (exampleId) t.push({ locale: 'id', translation: exampleId });
    if (exampleEn) t.push({ locale: 'en', translation: exampleEn });
    examples.push({ japanese: exampleJp, translations: t });
  }

  const collocations: TagWithVocabInput['collocations'] = collocation
    ? [{ collocation, meaning: collocationMeaning || null }]
    : [];

  return {
    line,
    errors,
    input: {
      kanji: cell(row, 'kanji') || null,
      hiragana,
      romaji: cell(row, 'romaji') || null,
      furigana: convertFuriganaToBracketFormat(
        cell(row, 'kanji') || '',
        cell(row, 'furigana') || '',
      ) || null,
      jlptLevel: jftBasic ? 'N4' : (jlptRaw?.toUpperCase() as JlptLevel) || null,
      jftBasic,
      partOfSpeech: (posRaw?.toLowerCase() as PartOfSpeech) || null,
      godanVerb: truthy(cell(row, 'godanverb')),
      ichidanVerb: truthy(cell(row, 'ichidanverb')),
      fukisoku: truthy(cell(row, 'fukisoku')),
      iAdjective: truthy(cell(row, 'iadjective')),
      naAdjective: truthy(cell(row, 'naadjective')),
      jidoushi: truthy(cell(row, 'jidoushi')),
      tadoushi: truthy(cell(row, 'tadoushi')),
      verbCollocation: truthy(cell(row, 'verbcollocation')),
      translations,
      examples,
      collocations,
    },
  };
}

export function isValidRow(row: BulkRowResult): row is BulkRowResult & { input: TagWithVocabInput } {
  return row.errors.length === 0 && !!row.input;
}

export function buildTemplateCsv(): string {
  const header = BULK_COLUMNS.join(',');
  const sample = [
    '学校,がっこう,gakkou,N5,,noun,,,,,,,,,,sekolah,school,学校に行きます。,Saya pergi ke sekolah.,I go to school.,,',
    '食べる,たべる,taberu,N4,,verb,godan,,,,,,,true,,eat,to eat,食べ物を食べる。,,,たべるものを選ぶ,choose what to eat',
  ].join('\n');
  return `${header}\n${sample}`;
}
