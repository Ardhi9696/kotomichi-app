import type { PartOfSpeech, StudyCard } from '@/lib/domain';
import type { QuizMode, QuizQuestion } from '@/lib/srs/quiz';

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

export interface QuizPageData {
  deckId: number;
  deckTitle: string;
  mode: QuizMode;
  /** 0-based session index, clamped to a valid range by the loader. */
  sessionIndex: number;
  totalSessions: number;
  /** total words in the deck (for the progress header) */
  wordCount: number;
  sessionId: number;
  questions: QuizQuestion[];
}