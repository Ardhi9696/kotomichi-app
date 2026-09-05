/**
 * StudyCard assembly — pure logic. Both the Postgres and in-memory adapters
 * delegate to this so front/back rendering is consistent everywhere.
 */

import type { DirectionThreshold, StudyCard, WordCard } from '@/lib/domain';
import type { SrsProgress } from '@/lib/domain';
import { directionById, type DirectionSide } from '@/lib/srs/directions';

function pickMeaning(word: WordCard, locale: string): string[] {
  const t = word.translations;
  const order = [locale, 'en'];
  for (const l of order) {
    if (t[l]) return [t[l]];
  }
  const all = Object.values(t);
  return all.length > 0 ? all : ['—'];
}

function sideOf(
  word: WordCard,
  side: DirectionSide,
  locale: string,
): string {
  switch (side) {
    case 'kanji':
      return word.vocabulary.kanji ?? word.vocabulary.hiragana;
    case 'hiragana':
      return word.vocabulary.hiragana;
    case 'meaning':
      return pickMeaning(word, locale).join(' / ');
    case 'romaji':
      return word.vocabulary.romaji ?? '';
  }
}

function pickExampleTranslation(
  example: WordCard['examples'][number] | undefined,
  locale: string,
): string | null {
  if (!example) return null;
  return (
    example.translations.find((t) => t.locale === locale)?.translation ??
    example.translations.find((t) => t.locale === 'en')?.translation ??
    null
  );
}

export function buildStudyCard(opts: {
  id: string;
  word: WordCard;
  direction: number;
  isNew: boolean;
  locale: string;
  thresholds: DirectionThreshold;
  progress?: SrsProgress | null;
  retrievability?: number | null;
}): StudyCard {
  const { word, direction, isNew, locale, thresholds } = opts;
  const def = directionById(direction);
  const examples = word.examples[0];

  return {
    id: opts.id,
    vocabularyId: word.vocabulary.id,
    direction: def.id,
    from: sideOf(word, def.from, locale),
    to: sideOf(word, def.to, locale),
    kanji: word.vocabulary.kanji,
    hiragana: word.vocabulary.hiragana,
    romaji: word.vocabulary.romaji ?? null,
    meanings: pickMeaning(word, locale),
    exampleJapanese: examples?.japanese ?? null,
    exampleMeaning: pickExampleTranslation(examples, locale),
    isNew,
    retrievability: opts.retrievability ?? undefined,
    timeThreshold: {
      fastMs: thresholds.fastThresholdMs,
      goodMs: thresholds.goodThresholdMs,
    },
  };
}