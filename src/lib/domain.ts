/**
 * Shared domain types used across ports, services and UI.
 * These are plain data contracts — no vendor dependencies.
 */

import type { Direction } from '@/lib/srs/directions';

export type Role = 'super_admin' | 'admin' | 'user';

export type ThemeMode = 'light' | 'dark' | 'system';

export type JlptLevel = 'N5' | 'N4' | 'N3' | 'N2' | 'N1';

/** An audit record of a role change performed by a super admin. */
export interface RoleChange {
  id: number;
  userId: string;
  byUserId: string;
  fromRole: Role;
  toRole: Role;
  createdAt: string;
}

export interface UserProfile {
  id: string;
  displayName: string;
  role: Role;
  preferredLocale: string;
  theme: ThemeMode;
  level: number;
  exp: number;
  lastReviewDate: string | null;
  currentStreak: number;
  longestStreak: number;
  createdAt: string;
}

export type PartOfSpeech =
  | 'noun'
  | 'verb'
  | 'adverb'
  | 'adjective'
  | 'conjunction'
  | 'demonstrative';

export interface Vocabulary {
  id: number;
  kanji: string | null;
  hiragana: string;
  romaji?: string | null;
  jlptLevel?: JlptLevel | null;
  jftBasic: boolean;
  partOfSpeech?: PartOfSpeech | null;
  isActive: boolean;
  /** verb conjugation family (V) */
  godanVerb: boolean;
  ichidanVerb: boolean;
  fukisoku: boolean;
  /** adjective family (Adj) */
  iAdjective: boolean;
  naAdjective: boolean;
  /** transitivity (V) */
  jidoushi: boolean;
  tadoushi: boolean;
  /** whether this word carries verb collocations */
  verbCollocation: boolean;
}

export interface VocabularyTranslation {
  vocabularyId: number;
  locale: string;
  meaning: string;
}

export interface ExampleSentence {
  id: number;
  vocabularyId: number;
  japanese: string;
  translations: { locale: string; translation: string }[];
}

export interface VerbCollocation {
  id: number;
  vocabularyId: number;
  collocation: string;
  meaning: string | null;
}

/** A word enriched with everything the study UI needs. */
export interface WordCard {
  vocabulary: Vocabulary;
  translations: Record<string, string>; // locale -> meaning
  examples: ExampleSentence[];
  collocations: VerbCollocation[];
  audioKey: string | null;
}

export interface Deck {
  id: number;
  title: string;
  subtitle: string | null;
  jlptLevel: JlptLevel | null;
  jftBasic: boolean;
  orderIndex: number;
  isPublished: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DeckWithProgress extends Deck {
  wordCount: number;
  reviewedCount: number;
  /** average retrievability over reviewed directions (0..1), null if none */
  mastery: number | null;
  /** whether the previous deck has been mastered (gating §4.9) */
  isLocked: boolean;
  newCount: number;
  dueCount: number;
  /** true for decks published and at the front of the ordering */
  isAvailable: boolean;
}

export interface SrsProgress {
  userId: string;
  vocabularyId: number;
  direction: Direction;
  stability: number;
  difficulty: number;
  retrievability: number | null;
  dueAt: string;
  lastReviewAt: string | null;
  reviewCount: number;
  lapses: number;
}

export interface ReviewLog {
  id: number;
  userId: string;
  vocabularyId: number;
  direction: Direction;
  isNew: boolean;
  correctness: boolean;
  elapsedMs: number;
  rating: 1 | 2 | 3 | 4;
  stabilityBefore: number | null;
  stabilityAfter: number | null;
  difficultyBefore: number | null;
  difficultyAfter: number | null;
  retrievabilityBefore: number | null;
  reviewedAt: string;
}

export interface DirectionThreshold {
  direction: Direction;
  fastThresholdMs: number;
  goodThresholdMs: number;
}

export interface AppConfig {
  exp: {
    base: number;
    newCard: number;
    reviewSuccess: number;
    streakBonusEvery: number;
    streakBonusAmount: number;
  };
  srs: {
    desiredRetention: number;
    directionStabilityThreshold: number;
    dailyNewCap: number;
    maxIntervalDays: number;
  };
  deck: {
    masteryThreshold: number;
  };
  fsrs: {
    weights: number[];
  };
  signup: {
    enabled: boolean;
    resetPassword: boolean;
  };
}

/** A single study card for Learn or Review sessions (server-computed). */
export interface StudyCard {
  id: string; // `${vocabId}:${direction}:${uuidish}`
  vocabularyId: number;
  direction: Direction;
  from: string;   // front text
  to: string;     // back text (answer)
  kanji: string | null;
  hiragana: string;
  romaji: string | null;
  meanings: string[]; // preferred-locale meanings, fallback to any
  exampleJapanese: string | null;
  exampleMeaning: string | null;
  isNew: boolean;
  /** current retrievability for review cards */
  retrievability?: number;
  timeThreshold: { fastMs: number; goodMs: number };
}

export interface ReviewSubmission {
  cardId: string;
  vocabularyId: number;
  direction: Direction;
  /** milliseconds between card shown and answer submitted */
  elapsedMs: number;
  correct: boolean;
  /** the answer the user picked/gave (for logging & validation) */
  answer: string;
}

export interface ReviewOutcome {
  vocabularyId: number;
  direction: Direction;
  correct: boolean;
  elapsedMs: number;
  rating: 1 | 2 | 3 | 4;
  stability: number;
  difficulty: number;
  intervalDays: number;
  expGained: number;
  nextStreak: number;
  streakMilestone: boolean;
  dueCountRemaining: number;
  newCountRemaining: number;
}

export interface ActivityDay {
  date: string;
  reviews: number;
  seconds: number;
}