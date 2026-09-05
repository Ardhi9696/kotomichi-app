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
import type { Role } from '@/lib/domain';

export const userProfile = pgTable('user_profile', {
  id: uuid('id').primaryKey(),
  displayName: text('display_name').notNull().default(''),
  role: text('role').$type<Role>().notNull().default('user'),
  preferredLocale: text('preferred_locale').notNull().default('en'),
  level: integer('level').notNull().default(1),
  exp: integer('exp').notNull().default(0),
  lastReviewDate: date_('last_review_date'),
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
    partOfSpeech: text('part_of_speech'),
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