import { describe, expect, it } from 'vitest';
import { buildQuizSession, QUIZ_OPTIONS, speedForElapsed, type QuizQuestion } from './quiz';
import type { WordCard } from '@/lib/domain';

function word(id: number, hiragana: string, kanji: string | null, meanings: Record<string, string>): WordCard {
  return {
    vocabulary: {
      id,
      kanji,
      hiragana,
      romaji: null,
      partOfSpeech: 'noun',
      jlptLevel: null,
      jftBasic: false,
      isActive: true,
      godanVerb: false,
      ichidanVerb: false,
      fukisoku: false,
      iAdjective: false,
      naAdjective: false,
      jidoushi: false,
      tadoushi: false,
      verbCollocation: false,
    },
    translations: meanings,
    examples: [],
    collocations: [],
    audioKey: null,
  };
}

const words: WordCard[] = [
  word(1, 'みず', '水', { en: 'water', id: 'air' }),
  word(2, 'ひ', '火', { en: 'fire', id: 'api' }),
  word(3, 'やま', '山', { en: 'mountain', id: 'gunung' }),
  word(4, 'そら', '空', { en: 'sky', id: 'langit' }),
  word(5, 'うみ', '海', { en: 'sea', id: 'laut' }),
  word(6, 'かぜ', '風', { en: 'wind', id: 'angin' }),
  word(7, 'つき', '月', { en: 'moon', id: 'bulan' }),
  word(8, 'はな', '花', { en: 'flower', id: 'bunga' }),
];

describe('buildQuizSession (6-direction drills)', () => {
  it('normal mode = 5 words × 3 directions (1-3) = 15 questions', () => {
    const qs = buildQuizSession(words, 'id', 'normal');
    expect(qs).toHaveLength(15);
    // each of directions 1,2,3 appears exactly 5 times
    for (const dir of [1, 2, 3]) {
      expect(qs.filter((q) => q.directionId === dir)).toHaveLength(5);
    }
    expect(qs.some((q) => q.directionId > 3)).toBe(false);
  });

  it('hard mode = 5 words × 3 directions (4-6) = 15 questions', () => {
    const qs = buildQuizSession(words, 'id', 'hard');
    expect(qs).toHaveLength(15);
    for (const dir of [4, 5, 6]) {
      expect(qs.filter((q) => q.directionId === dir)).toHaveLength(5);
    }
    expect(qs.some((q) => q.directionId < 4)).toBe(false);
  });

  it('each word is drilled once per direction without repetition', () => {
    const qs = buildQuizSession(words, 'en', 'normal');
    const byWord = new Map<number, Set<number>>();
    for (const q of qs) {
      if (!byWord.has(q.vocabularyId)) byWord.set(q.vocabularyId, new Set());
      byWord.get(q.vocabularyId)!.add(q.directionId);
    }
    expect(byWord.size).toBe(5); // 5 words
    for (const dirs of byWord.values()) {
      expect(dirs.size).toBe(3); // each covered by all 3 normal directions
    }
  });

  it('front/correct values match each direction', () => {
    const qs = buildQuizSession(words, 'id', 'normal');
    const byDir = (dir: number) => qs.filter((q) => q.directionId === dir)[0];
    const w = words.find((x) => x.vocabulary.id === byDir(1).vocabularyId)!;

    const d1 = byDir(1); // Kanji → Arti
    expect(d1.front).toBe(w.vocabulary.kanji);
    expect(d1.options.find((o) => o.correct)!.text).toBe(w.translations.id);

    const d2 = byDir(2); // Kanji → Hiragana
    expect(d2.front).toBe(w.vocabulary.kanji);
    expect(d2.options.find((o) => o.correct)!.text).toBe(w.vocabulary.hiragana);

    const d3 = byDir(3); // Hiragana → Arti
    expect(d3.front).toBe(w.vocabulary.hiragana);
    expect(d3.options.find((o) => o.correct)!.text).toBe(w.translations.id);
  });

  it('front/correct values match each hard direction', () => {
    const qs = buildQuizSession(words, 'id', 'hard');
    const byDir = (dir: number) => qs.filter((q) => q.directionId === dir)[0];
    const w = words.find((x) => x.vocabulary.id === byDir(4).vocabularyId)!;

    const d4 = byDir(4); // Arti → Hiragana
    expect(d4.front).toBe(w.translations.id);
    expect(d4.options.find((o) => o.correct)!.text).toBe(w.vocabulary.hiragana);

    const d5 = byDir(5); // Hiragana → Kanji
    expect(d5.front).toBe(w.vocabulary.hiragana);
    expect(d5.options.find((o) => o.correct)!.text).toBe(w.vocabulary.kanji);

    const d6 = byDir(6); // Arti → Kanji
    expect(d6.front).toBe(w.translations.id);
    expect(d6.options.find((o) => o.correct)!.text).toBe(w.vocabulary.kanji);
  });

  it('each question has 4 options, exactly one correct, distractors from the same deck kind', () => {
    for (const q of buildQuizSession(words, 'en', 'normal')) {
      expect(q.options).toHaveLength(QUIZ_OPTIONS);
      expect(q.options.filter((o) => o.correct)).toHaveLength(1);
      const correct = q.options.find((o) => o.correct)!.text;
      for (const o of q.options) {
        if (!o.correct) {
          expect(o.text).not.toBe(correct);
          // distractors are kanji-only for Kanji-back, hiragana-only for Hiragana-back
          const poolValues =
            q.directionId === 2 || q.directionId === 4
              ? words.map((x) => x.vocabulary.hiragana)
              : q.directionId === 5 || q.directionId === 6
                ? words.map((x) => x.vocabulary.kanji)
                : words.map((x) => x.translations.en);
          expect(poolValues).toContain(o.text);
        }
      }
    }
  });

  it('hiragana-only words are excluded from kanji-back directions', () => {
    const deck = [...words, word(99, 'ことば', null, { en: 'word' })];
    const qs = buildQuizSession(deck, 'en', 'hard');
    const kanjiBack = qs.filter((q) => [5, 6].includes(q.directionId));
    expect(kanjiBack.every((q) => q.vocabularyId !== 99)).toBe(true);
  });

  it('reports a bit more session structure for the quiz header', () => {
    const qs: QuizQuestion[] = buildQuizSession(words, 'en', 'normal');
    expect(qs[0].directionLabel.source).toBeTypeOf('string');
    expect(qs[0].directionLabel.target).toBeTypeOf('string');
  });
});

describe('speedForElapsed', () => {
  it('bucketizes on the fast/good thresholds (8000/15000 ms)', () => {
    expect(speedForElapsed(0)).toBe('easy');
    expect(speedForElapsed(8000)).toBe('easy');
    expect(speedForElapsed(8001)).toBe('good');
    expect(speedForElapsed(15000)).toBe('good');
    expect(speedForElapsed(15001)).toBe('hard');
  });
});