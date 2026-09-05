import type { WordCard } from '@/lib/domain';

/** Preferred meaning for a word in the given locale, falling back en → id → first. */
export function pickMeaning(word: WordCard, locale: string): string {
  const t = word.translations;
  for (const l of [locale, 'en', 'id']) {
    const m = t[l];
    if (m) return m;
  }
  const all = Object.values(t);
  return all.length > 0 ? all[0] : word.vocabulary.hiragana;
}