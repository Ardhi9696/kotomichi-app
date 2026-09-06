import type { PartOfSpeech, StudyCard } from '@/lib/domain';

/** Snapshot rendered by the /review page and revalidated by SWR. */
export interface ReviewPageData {
  dueCount: number;
  /** Full session queue (due + new cards) preloaded so review runs client-side. */
  queue: StudyCard[];
}

export interface LearnWordRow {
  id: number;
  main: string;
  hiragana: string;
  romaji: string | null;
  meaning: string;
  partOfSpeech: PartOfSpeech | null;
  example: string | null;
  exampleMeaning: string | null;
}

export interface LearnDeckOption {
  id: number;
  title: string;
  isLocked: boolean;
}

/** Snapshot rendered by the /learn page and revalidated by SWR. */
export interface LearnPageData {
  decks: LearnDeckOption[];
  activeDeckId: number;
  deckTitle: string;
  wordCount: number;
  words: LearnWordRow[];
  cards: StudyCard[];
}