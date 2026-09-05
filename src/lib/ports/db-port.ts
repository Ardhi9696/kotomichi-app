/**
 * Database port (§3.1). Data access contracts for the app's Postgres
 * database. Implemented by a Drizzle/Postgres adapter and a dev-only
 * in-memory adapter. Nothing here knows about the concrete provider.
 */

import type { Direction } from '@/lib/srs/directions';
import type {
  ActivityDay,
  AppConfig,
  Deck,
  DirectionThreshold,
  JlptLevel,
  PartOfSpeech,
  ReviewLog,
  Role,
  RoleChange,
  SrsProgress,
  UserProfile,
  Vocabulary,
  WordCard,
} from '@/lib/domain';

export interface TagWithVocabInput {
  kanji?: string | null;
  hiragana: string;
  romaji?: string | null;
  jlptLevel?: JlptLevel | null;
  jftBasic?: boolean;
  partOfSpeech?: PartOfSpeech | null;
  godanVerb?: boolean;
  ichidanVerb?: boolean;
  fukisoku?: boolean;
  iAdjective?: boolean;
  naAdjective?: boolean;
  jidoushi?: boolean;
  tadoushi?: boolean;
  verbCollocation?: boolean;
  translations: { locale: string; meaning: string }[];
  examples?: { japanese: string; translations: { locale: string; translation: string }[] }[];
  collocations?: { collocation: string; meaning?: string | null }[];
}

export interface DeckInput {
  title: string;
  subtitle?: string | null;
  jlptLevel?: JlptLevel | null;
  jftBasic?: boolean;
  orderIndex: number;
  isPublished?: boolean;
}

/** One atomic review write: log + srs progress upsert + user stats. */
export interface ApplyReviewInput {
  userId: string;
  log: {
    vocabularyId: number;
    direction: Direction;
    isNew: boolean;
    correctness: boolean;
    elapsedMs: number;
    rating: 1 | 2 | 3 | 4;
    stabilityBefore: number | null;
    stabilityAfter: number;
    difficultyBefore: number | null;
    difficultyAfter: number;
    retrievabilityBefore: number | null;
  };
  progress: {
    vocabularyId: number;
    direction: Direction;
    stability: number;
    difficulty: number;
    retrievability: number;
    dueAt: string;
    lastReviewAt: string;
    reviewCount: number;
    lapses: number;
  };
  userStats: {
    exp: number;
    level: number;
    currentStreak: number;
    longestStreak: number;
    lastReviewDate: string;
  };
}

export interface DueEntry {
  progress: SrsProgress;
  word: WordCard;
}

export interface DeckWordOrderInput {
  vocabularyId: number;
  orderInDeck: number;
}

export interface VocabRepository {
  // ---------- profiles ----------
  getUserProfile(userId: string): Promise<UserProfile | null>;
  createUserProfile(p: UserProfile): Promise<void>;
  updateUserProfile(userId: string, patch: Partial<UserProfile>): Promise<UserProfile | null>;
  listUserProfiles(opts?: { q?: string }): Promise<UserProfile[]>;
  setUserRole(userId: string, role: Role): Promise<void>;
  deleteUser(userId: string): Promise<void>;
  /** Record an audit entry when a super admin changes someone's role. */
  logRoleChange(input: { userId: string; byUserId: string; fromRole: Role; toRole: Role }): Promise<void>;
  /** Most recent role-change audit entries, newest first. */
  listRoleChanges(limit?: number): Promise<RoleChange[]>;
  /** userId -> ISO timestamp of the user's last activity (heartbeat/review; absent users have no entry). */
  getLastActivityForUsers(userIds: string[]): Promise<Record<string, string>>;
  /** Record that the user was active just now (online presence heartbeat). */
  touchLastActivity(userId: string): Promise<void>;

  // ---------- vocabulary content ----------
  searchVocabulary(q: string, opts?: { limit?: number }): Promise<WordCard[]>;
  getVocabularyByReading(kanji: string | null, hiragana: string): Promise<Vocabulary | null>;
  getVocabularyById(id: number): Promise<WordCard | null>;
  getWordsByIds(ids: number[]): Promise<WordCard[]>;
  createVocabulary(input: TagWithVocabInput, createdBy: string | null): Promise<Vocabulary>;
  updateVocabulary(id: number, patch: Partial<TagWithVocabInput>): Promise<Vocabulary | null>;
  deleteVocabulary(id: number): Promise<void>;

  // ---------- decks ----------
  listDecks(opts?: { publishedOnly?: boolean; q?: string }): Promise<Deck[]>;
  getDeck(id: number): Promise<Deck | null>;
  createDeck(input: DeckInput, createdBy: string | null): Promise<Deck>;
  updateDeck(id: number, patch: Partial<DeckInput>): Promise<Deck | null>;
  deleteDeck(id: number): Promise<void>;
  getDeckWords(deckId: number): Promise<WordCard[]>;
  getDeckWordIds(deckId: number): Promise<number[]>;
  getDeckWordCount(deckId: number): Promise<number>;
  addVocabularyToDeck(deckId: number, vocabularyId: number, orderInDeck?: number): Promise<void>;
  removeVocabularyFromDeck(deckId: number, vocabularyId: number): Promise<void>;
  /**
   * True when `deckId` contains `vocabularyId`. Used by the admin flow to
   * avoid linking a word into the same deck twice.
   */
  deckContainsVocabulary(deckId: number, vocabularyId: number): Promise<boolean>;

  // ---------- SRS ----------
  /** ids of every vocabulary the user has any progress on (dedup §5.1). */
  getWordsWithProgress(userId: string): Promise<number[]>;
  getProgressForVocabulary(userId: string, vocabularyIds: number[]): Promise<SrsProgress[]>;
  getProgress(userId: string, vocabularyId: number, direction: Direction): Promise<SrsProgress | null>;
  /** Review queue: progress rows whose due_at <= now (or predicted R < retention). */
  getDueEntries(userId: string, now: string, opts?: { limit?: number }): Promise<DueEntry[]>;
  countDue(userId: string, now: string): Promise<number>;
  /** Number of first-time (is_new) reviews since `since` — used for dailyNewCap. */
  countNewReviews(userId: string, since: string): Promise<number>;
  applyReview(input: ApplyReviewInput): Promise<void>;

  // ---------- study helpers ----------
  // (StudyCard front/back assembly lives in the pure module
  //  `@/lib/srs/study-card` — no repo involvement needed.)

  // ---------- config ----------
  getAppConfig(): Promise<AppConfig>;
  setAppConfig(config: AppConfig): Promise<void>;
  getDirectionThresholds(): Promise<Record<Direction, DirectionThreshold>>;
  setDirectionThreshold(dir: Direction, t: Pick<DirectionThreshold, 'fastThresholdMs' | 'goodThresholdMs'>): Promise<void>;

  // ---------- stats / dashboard ----------
  getActivity(userId: string, days: number): Promise<ActivityDay[]>;
  getRecentLogs(userId: string, limit?: number): Promise<ReviewLog[]>;
  getStudySeconds(userId: string, sinceDays: number): Promise<number>;
}