/**
 * Drizzle schema — mirrors kotomichi_schema.sql.
 * Used with a plain Postgres connection string (`postgres` driver).
 */

import { relations } from 'drizzle-orm';
import {
  bigint,
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import type { Direction } from '@/lib/srs/directions';
import type { Role, ThemeMode } from '@/lib/domain';

export const userProfile = pgTable('user_profile', {
  id: uuid('id').primaryKey(),
  displayName: text('display_name').notNull().default(''),
  role: text('role').$type<Role>().notNull().default('user'),
  preferredLocale: text('preferred_locale').notNull().default('en'),
  theme: text('theme').$type<ThemeMode>().notNull().default('system'),
  level: integer('level').notNull().default(1),
  exp: integer('exp').notNull().default(0),
  lastReviewDate: date_('last_review_date'),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
  currentStreak: integer('current_streak').notNull().default(0),
  longestStreak: integer('longest_streak').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

function date_(name: string) {
  // Our Postgres column is DATE; treat stored value as plain ISO string.
  return text(name).$type<string | null>();
}

export const vocabulary = pgTable(
  'vocabulary',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    kanji: text('kanji'),
    hiragana: text('hiragana').notNull(),
    romaji: text('romaji'),
    jlptLevel: text('jlpt_level').$type<'N5' | 'N4' | 'N3' | 'N2' | 'N1' | null>(),
    jftBasic: boolean('jft_basic').notNull().default(false),
    partOfSpeech: text('part_of_speech').$type<
      'noun' | 'verb' | 'adverb' | 'adjective' | 'conjunction' | 'demonstrative' | null
    >(),
    godanVerb: boolean('godan_verb').notNull().default(false),
    ichidanVerb: boolean('ichidan_verb').notNull().default(false),
    fukisoku: boolean('fukisoku').notNull().default(false),
    iAdjective: boolean('i_adjective').notNull().default(false),
    naAdjective: boolean('na_adjective').notNull().default(false),
    jidoushi: boolean('jidoushi').notNull().default(false),
    tadoushi: boolean('tadoushi').notNull().default(false),
    verbCollocation: boolean('verb_collocation').notNull().default(false),
    isActive: boolean('is_active').notNull().default(true),
    createdBy: uuid('created_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('uq_vocab_reading').on(t.kanji, t.hiragana).nullsNotDistinct(),
  ],
);

export const vocabularyTranslations = pgTable(
  'vocabulary_translations',
  {
    vocabularyId: bigint('vocabulary_id', { mode: 'number' })
      .notNull().references(() => vocabulary.id, { onDelete: 'cascade' }),
    locale: text('locale').notNull(),
    meaning: text('meaning').notNull(),
  },
  (t) => [primaryKey({ columns: [t.vocabularyId, t.locale] })],
);

export const exampleSentences = pgTable(
  'example_sentences',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    vocabularyId: bigint('vocabulary_id', { mode: 'number' })
      .notNull().references(() => vocabulary.id, { onDelete: 'cascade' }),
    japanese: text('japanese').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('idx_example_vocab').on(t.vocabularyId)],
);

export const exampleSentenceTranslations = pgTable(
  'example_sentence_translations',
  {
    exampleSentenceId: bigint('example_sentence_id', { mode: 'number' })
      .notNull().references(() => exampleSentences.id, { onDelete: 'cascade' }),
    locale: text('locale').notNull(),
    translation: text('translation').notNull(),
  },
  (t) => [primaryKey({ columns: [t.exampleSentenceId, t.locale] })],
);

export const verbCollocations = pgTable(
  'verb_collocations',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    vocabularyId: bigint('vocabulary_id', { mode: 'number' })
      .notNull().references(() => vocabulary.id, { onDelete: 'cascade' }),
    collocation: text('collocation').notNull(),
    meaning: text('meaning'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('idx_colloc_vocab').on(t.vocabularyId)],
);

export const audioAssets = pgTable(
  'audio_assets',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    vocabularyId: bigint('vocabulary_id', { mode: 'number' })
      .notNull().references(() => vocabulary.id, { onDelete: 'cascade' }),
    storageKey: text('storage_key').notNull(),
    lang: text('lang').notNull().default('ja'),
    filename: text('filename'),
  },
  (t) => [
    uniqueIndex('uq_audio_vocab_lang').on(t.vocabularyId, t.lang),
  ],
);

export const decks = pgTable(
  'decks',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    title: text('title').notNull(),
    subtitle: text('subtitle'),
    jlptLevel: text('jlpt_level').$type<'N5' | 'N4' | 'N3' | 'N2' | 'N1' | null>(),
    jftBasic: boolean('jft_basic').notNull().default(false),
    orderIndex: integer('order_index').notNull().default(0),
    isPublished: boolean('is_published').notNull().default(false),
    createdBy: uuid('created_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('idx_decks_order').on(t.orderIndex, t.isPublished)],
);

export const deckVocabulary = pgTable(
  'deck_vocabulary',
  {
    deckId: bigint('deck_id', { mode: 'number' })
      .notNull().references(() => decks.id, { onDelete: 'cascade' }),
    vocabularyId: bigint('vocabulary_id', { mode: 'number' })
      .notNull().references(() => vocabulary.id, { onDelete: 'cascade' }),
    orderInDeck: integer('order_in_deck'),
  },
  (t) => [
    primaryKey({ columns: [t.deckId, t.vocabularyId] }),
    index('idx_dv_deck').on(t.deckId),
  ],
);

export const srsProgress = pgTable(
  'srs_progress',
  {
    userId: uuid('user_id')
      .notNull().references(() => userProfile.id, { onDelete: 'cascade' }),
    vocabularyId: bigint('vocabulary_id', { mode: 'number' })
      .notNull().references(() => vocabulary.id, { onDelete: 'cascade' }),
    direction: smallint('direction').$type<Direction>().notNull(),
    stability: doublePrecision('stability').notNull().default(0),
    difficulty: doublePrecision('difficulty').notNull().default(0),
    retrievability: doublePrecision('retrievability'),
    dueAt: timestamp('due_at', { withTimezone: true }).notNull().defaultNow(),
    lastReviewAt: timestamp('last_review_at', { withTimezone: true }),
    reviewCount: integer('review_count').notNull().default(0),
    lapses: integer('lapses').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.vocabularyId, t.direction] }),
    index('idx_srs_due').on(t.userId, t.dueAt),
  ],
);

export const reviewLog = pgTable(
  'review_log',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    userId: uuid('user_id')
      .notNull().references(() => userProfile.id, { onDelete: 'cascade' }),
    vocabularyId: bigint('vocabulary_id', { mode: 'number' })
      .notNull().references(() => vocabulary.id, { onDelete: 'cascade' }),
    direction: smallint('direction').$type<Direction>().notNull(),
    isNew: boolean('is_new').notNull().default(false),
    correctness: boolean('correctness').notNull(),
    elapsedMs: integer('elapsed_ms').notNull(),
    rating: smallint('rating').$type<1 | 2 | 3 | 4>().notNull(),
    stabilityBefore: doublePrecision('stability_before'),
    stabilityAfter: doublePrecision('stability_after'),
    difficultyBefore: doublePrecision('difficulty_before'),
    difficultyAfter: doublePrecision('difficulty_after'),
    retrievabilityBefore: doublePrecision('retrievability_before'),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('idx_review_log_user_time').on(t.userId, t.reviewedAt)],
);

export const roleChangeLog = pgTable(
  'role_change_log',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    userId: uuid('user_id')
      .notNull().references(() => userProfile.id, { onDelete: 'cascade' }),
    byUserId: uuid('by_user_id')
      .notNull().references(() => userProfile.id, { onDelete: 'cascade' }),
    fromRole: text('from_role').$type<Role>().notNull(),
    toRole: text('to_role').$type<Role>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('idx_role_change_user_time').on(t.userId, t.createdAt)],
);

export const directionThresholds = pgTable('direction_thresholds', {
  direction: smallint('direction').$type<Direction>().primaryKey(),
  fastThresholdMs: integer('fast_threshold_ms').notNull().default(8000),
  goodThresholdMs: integer('good_threshold_ms').notNull().default(15000),
  updatedBy: uuid('updated_by'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const appConfig = pgTable('app_config', {
  key: text('key').primaryKey(),
  valueJson: jsonb('value_json').notNull(),
  description: text('description'),
  updatedBy: uuid('updated_by'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Quiz Sessions - tracks quiz progress per session for async background sync
export const quizSessions = pgTable(
  'quiz_sessions',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    userId: uuid('user_id')
      .notNull().references(() => userProfile.id, { onDelete: 'cascade' }),
    deckId: bigint('deck_id', { mode: 'number' })
      .notNull().references(() => decks.id, { onDelete: 'cascade' }),
    mode: text('mode').$type<'normal' | 'hard'>().notNull(),
    sessionIndex: integer('session_index').notNull(),
    totalSessions: integer('total_sessions').notNull(),
    status: text('status').$type<'in_progress' | 'completed' | 'synced'>().notNull().default('in_progress'),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    syncedAt: timestamp('synced_at', { withTimezone: true }),
    totalQuestions: integer('total_questions').notNull().default(0),
    correctCount: integer('correct_count').notNull().default(0),
    totalExp: integer('total_exp').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('uq_quiz_session_user_deck_mode_idx').on(t.userId, t.deckId, t.mode, t.sessionIndex),
    index('idx_quiz_sessions_user_deck').on(t.userId, t.deckId, t.mode),
    index('idx_quiz_sessions_status').on(t.status),
  ],
);

export const quizSessionAnswers = pgTable(
  'quiz_session_answers',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    sessionId: bigint('session_id', { mode: 'number' })
      .notNull().references(() => quizSessions.id, { onDelete: 'cascade' }),
    vocabularyId: bigint('vocabulary_id', { mode: 'number' })
      .notNull().references(() => vocabulary.id, { onDelete: 'cascade' }),
    direction: smallint('direction').$type<Direction>().notNull(),
    elapsedMs: integer('elapsed_ms').notNull(),
    correct: boolean('correct').notNull(),
    answerText: text('answer_text'),
    speedCategory: text('speed_category').$type<'easy' | 'good' | 'hard'>(),
    expGained: integer('exp_gained').notNull().default(0),
    submittedAt: timestamp('submitted_at', { withTimezone: true }).notNull().defaultNow(),
    synced: boolean('synced').notNull().default(false),
  },
  (t) => [
    index('idx_quiz_answers_session').on(t.sessionId),
    index('idx_quiz_answers_synced').on(t.synced),
  ],
);

export const quizSessionVocabDetails = pgTable(
  'quiz_session_vocab_details',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    sessionId: bigint('session_id', { mode: 'number' })
      .notNull().references(() => quizSessions.id, { onDelete: 'cascade' }),
    vocabularyId: bigint('vocabulary_id', { mode: 'number' })
      .notNull().references(() => vocabulary.id, { onDelete: 'cascade' }),
    dir1ElapsedMs: integer('dir1_elapsed_ms'),
    dir1Correct: boolean('dir1_correct'),
    dir1Speed: text('dir1_speed').$type<'easy' | 'good' | 'hard'>(),
    dir1Exp: integer('dir1_exp').default(0),
    dir2ElapsedMs: integer('dir2_elapsed_ms'),
    dir2Correct: boolean('dir2_correct'),
    dir2Speed: text('dir2_speed').$type<'easy' | 'good' | 'hard'>(),
    dir2Exp: integer('dir2_exp').default(0),
    dir3ElapsedMs: integer('dir3_elapsed_ms'),
    dir3Correct: boolean('dir3_correct'),
    dir3Speed: text('dir3_speed').$type<'easy' | 'good' | 'hard'>(),
    dir3Exp: integer('dir3_exp').default(0),
    dir4ElapsedMs: integer('dir4_elapsed_ms'),
    dir4Correct: boolean('dir4_correct'),
    dir4Speed: text('dir4_speed').$type<'easy' | 'good' | 'hard'>(),
    dir4Exp: integer('dir4_exp').default(0),
    dir5ElapsedMs: integer('dir5_elapsed_ms'),
    dir5Correct: boolean('dir5_correct'),
    dir5Speed: text('dir5_speed').$type<'easy' | 'good' | 'hard'>(),
    dir5Exp: integer('dir5_exp').default(0),
    dir6ElapsedMs: integer('dir6_elapsed_ms'),
    dir6Correct: boolean('dir6_correct'),
    dir6Speed: text('dir6_speed').$type<'easy' | 'good' | 'hard'>(),
    dir6Exp: integer('dir6_exp').default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('uq_quiz_vocab_details_session_vocab').on(t.sessionId, t.vocabularyId),
    index('idx_quiz_vocab_details_session').on(t.sessionId),
  ],
);

// --------------------------------------------------------------
// Relations
// --------------------------------------------------------------
export const vocabularyRelations = relations(vocabulary, ({ many }) => ({
  translations: many(vocabularyTranslations),
  examples: many(exampleSentences),
  collocations: many(verbCollocations),
  audio: many(audioAssets),
}));

export const exampleSentencesRelations = relations(exampleSentences, ({ many, one }) => ({
  translations: many(exampleSentenceTranslations),
  vocabulary: one(vocabulary, { fields: [exampleSentences.vocabularyId], references: [vocabulary.id] }),
}));

export type VocabularyRow = typeof vocabulary.$inferSelect;
export type SrsProgressRow = typeof srsProgress.$inferSelect;
export type UserProfileRow = typeof userProfile.$inferSelect;