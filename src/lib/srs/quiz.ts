/**
 * Quiz generation with 6 directional drills (§ learn/quiz).
 *
 * Directions:
 *   Normal (1-3, unlocked from the start):
 *     1. Kanji → Arti
 *     2. Kanji → Hiragana
 *     3. Hiragana → Arti
 *   Hard (4-6, unlocked last):
 *     4. Arti → Hiragana
 *     5. Hiragana → Kanji
 *     6. Arti → Kanji (most difficult)
 *
 * A session picks 5 words from the deck and drills each in 3 directions
 * (one mode per session), giving 15 multiple-choice questions total.
 */

import type { WordCard } from '@/lib/domain';
import { pickMeaning } from '@/lib/srs/meaning';

export const QUIZ_SESSION_SIZE = 5;
export const QUIZ_OPTIONS = 4;

// ------------------------------------------------------------------
// Direction definitions
// ------------------------------------------------------------------

export type QuizMode = 'normal' | 'hard';

export interface QuizDirectionDef {
  id: number;
  /** What to show the learner (the "question"). Might be null when the word has no kanji. */
  front: (word: WordCard, locale: string) => string | null;
  /** The correct answer text. */
  back: (word: WordCard, locale: string) => string | null;
  /** Label key used in i18n for the "source → target" label. */
  labelKey: string;
}

function kanji(w: WordCard): string | null {
  return w.vocabulary.kanji;
}
function hiragana(w: WordCard): string {
  return w.vocabulary.hiragana;
}
function meaning(w: WordCard, locale: string): string {
  return pickMeaning(w, locale);
}

const QUIZ_DIRECTIONS: QuizDirectionDef[] = [
  // Normal (1-3)
  { id: 1, front: kanji, back: meaning, labelKey: 'dir.kanjiToMeaning' },
  { id: 2, front: kanji, back: hiragana, labelKey: 'dir.kanjiToHiragana' },
  { id: 3, front: hiragana, back: meaning, labelKey: 'dir.hiraganaToMeaning' },
  // Hard (4-6)
  { id: 4, front: meaning, back: hiragana, labelKey: 'dir.meaningToHiragana' },
  { id: 5, front: hiragana, back: kanji, labelKey: 'dir.hiraganaToKanji' },
  { id: 6, front: meaning, back: kanji, labelKey: 'dir.meaningToKanji' },
];

export const NORMAL_DIRECTIONS = QUIZ_DIRECTIONS.slice(0, 3);
export const HARD_DIRECTIONS = QUIZ_DIRECTIONS.slice(3, 6);

export function directionsForMode(mode: QuizMode): QuizDirectionDef[] {
  return mode === 'hard' ? HARD_DIRECTIONS : NORMAL_DIRECTIONS;
}

// ------------------------------------------------------------------
// Question / session types
// ------------------------------------------------------------------

export interface QuizOption {
  text: string;
  correct: boolean;
}

export interface QuizDirectionLabel {
  source: string;
  target: string;
}

export interface QuizQuestion {
  vocabularyId: number;
  /** Front text shown to the learner. */
  front: string;
  /** The 4 MC options (1 correct + 3 distractors). */
  options: QuizOption[];
  /** Which direction is being tested. */
  directionId: number;
  /** Human-readable label for the direction. */
  directionLabel: QuizDirectionLabel;
  /** Optional hint for the question (e.g., hiragana reading for kanji). */
  hint?: string;
}

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function directionLabel(dir: QuizDirectionDef): QuizDirectionLabel {
  const labels: Record<string, QuizDirectionLabel> = {
    'dir.kanjiToMeaning': { source: '漢字', target: 'Arti' },
    'dir.kanjiToHiragana': { source: '漢字', target: 'ひらがな' },
    'dir.hiraganaToMeaning': { source: 'ひらがな', target: 'Arti' },
    'dir.meaningToHiragana': { source: 'Arti', target: 'ひらがな' },
    'dir.hiraganaToKanji': { source: 'ひらがな', target: '漢字' },
    'dir.meaningToKanji': { source: 'Arti', target: '漢字' },
  };
  return labels[dir.labelKey] ?? { source: '?', target: '?' };
}

// ------------------------------------------------------------------
// Session builder
// ------------------------------------------------------------------

/**
 * Determine the distractor-pool kind for a given direction.
 */
function distractorKind(dir: QuizDirectionDef): 'kanji' | 'hiragana' | 'meaning' {
  if (dir.labelKey.endsWith('ToKanji')) return 'kanji';
  if (dir.labelKey.endsWith('ToHiragana')) return 'hiragana';
  return 'meaning';
}

function frontKind(dir: QuizDirectionDef): 'kanji' | 'hiragana' | 'meaning' {
  if (dir.labelKey.startsWith('dir.kanji')) return 'kanji';
  if (dir.labelKey.startsWith('dir.hiragana')) return 'hiragana';
  return 'meaning';
}

/**
 * Build a 15-question quiz session: 5 words × 3 directions for the
 * given mode. Words without kanji are filtered out (since 4 of 6
 * directions involve kanji). The session is returned in a mixed
 * order: all 5 words for direction 1, then direction 2, then direction 3.
 */
export function buildQuizSession(
  words: WordCard[],
  locale: string,
  mode: QuizMode,
  size: number = QUIZ_SESSION_SIZE,
): QuizQuestion[] {
  const dirs = directionsForMode(mode);
  // Prefer words that have kanji (needed by most directions).
  const eligible = words.filter((w) => w.vocabulary.kanji != null);
  const chosen = shuffle(eligible.length >= size ? eligible : words).slice(0, size);
  if (chosen.length === 0) return [];

  // Pre-build the full pool per distractor kind for efficient sampling.
  const pools: Record<string, string[]> = {
    kanji: shuffle(eligible.map((w) => w.vocabulary.kanji).filter(Boolean) as string[]),
    hiragana: shuffle(words.map((w) => w.vocabulary.hiragana)),
    meaning: shuffle(words.map((w) => pickMeaning(w, locale))),
  };

  const questions: QuizQuestion[] = [];

  for (const dir of dirs) {
    const kind = distractorKind(dir);
    const pool = pools[kind];

    for (const word of chosen) {
      const frontValue = dir.front(word, locale);
      const backValue = dir.back(word, locale);
      if (!frontValue || !backValue) continue; // skip if word lacks kanji

      // Pick distractors: 3 unique values != correct, from the pool.
      const distractors: string[] = [];
      for (const candidate of pool) {
        if (distractors.length >= QUIZ_OPTIONS - 1) break;
        if (candidate === backValue) continue;
        if (distractors.includes(candidate)) continue;
        distractors.push(candidate);
      }

      // If we couldn't find enough distractors (small deck), pad with
      // anything unique that isn't the correct answer.
      if (distractors.length < QUIZ_OPTIONS - 1) {
        const allCandidates = kind === 'meaning'
          ? words.map((w) => pickMeaning(w, locale))
          : kind === 'kanji'
            ? words.map((w) => w.vocabulary.kanji).filter(Boolean) as string[]
            : words.map((w) => w.vocabulary.hiragana);
        for (const c of allCandidates) {
          if (distractors.length >= QUIZ_OPTIONS - 1) break;
          if (c === backValue || distractors.includes(c)) continue;
          distractors.push(c);
        }
      }

      const options = shuffle([
        { text: backValue, correct: true },
        ...distractors.map((text) => ({ text, correct: false })),
      ]);

      // Show hiragana hint when front is kanji; no hint otherwise.
      const hint = frontKind(dir) === 'kanji' ? word.vocabulary.hiragana : undefined;

      questions.push({
        vocabularyId: word.vocabulary.id,
        front: frontValue,
        hint,
        options,
        directionId: dir.id,
        directionLabel: directionLabel(dir),
      });
    }
  }

  return questions;
}

// ------------------------------------------------------------------
// Answer speed bucketizer
// ------------------------------------------------------------------

export type AnswerSpeed = 'easy' | 'good' | 'hard';

export function speedForElapsed(elapsedMs: number, fastMs = 8000, goodMs = 15000): AnswerSpeed {
  if (elapsedMs <= fastMs) return 'easy';
  if (elapsedMs <= goodMs) return 'good';
  return 'hard';
}