import type { ActivityDay, DayDetail, PartOfSpeech, StudyCard } from '@/lib/domain';
import type { QuizMode, QuizQuestion } from '@/lib/srs/quiz';
import type { VocabularyPage, VocabularyQuery } from '@/lib/ports/db-port';

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

/** One row in the /words search results (shared with the learn list view). */
export type SearchWordRow = LearnWordRow;

/** Snapshot rendered by the /words page and revalidated by SWR. */
export interface WordsPageData {
  query: string;
  rows: SearchWordRow[];
}

export interface DashboardLogRow {
  id: number;
  direction: number;
  correctness: boolean;
  reviewedAt: string;
}

/** Learner dashboard snapshot rendered by /dashboard and revalidated by SWR. */
export interface DashboardPageData {
  displayName: string;
  level: number;
  exp: number;
  currentStreak: number;
  dueCount: number;
  /** reviews introduced since midnight (used for the daily new-card cap) */
  newToday: number;
  newDailyCap: number;
  studySeconds: number;
  recentLogs: DashboardLogRow[];
  activity: ActivityDay[];
  dayDetails: DayDetail[];
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

/** Snapshot for the admin vocabulary list (search/filter/pagination). */
export interface AdminVocabPageData {
  query: VocabularyQuery;
  page: VocabularyPage;
}