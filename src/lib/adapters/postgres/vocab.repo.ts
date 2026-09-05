/**
 * VocabRepository — Postgres adapter (Drizzle).
 * Implements the db-port contract. Business logic never touches SQL here.
 */

import { and, desc, eq, inArray, or, sql } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';

import type { ApplyReviewInput, DueEntry, TagWithVocabInput, VocabRepository } from '@/lib/ports/db-port';
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
  ThemeMode,
  UserProfile,
  Vocabulary,
  WordCard,
} from '@/lib/domain';
import {
  appConfig as appConfigTable,
  audioAssets,
  deckVocabulary,
  decks,
  directionThresholds,
  exampleSentenceTranslations,
  exampleSentences,
  reviewLog,
  roleChangeLog,
  srsProgress,
  userProfile,
  verbCollocations,
  vocabulary,
  vocabularyTranslations,
} from '@/lib/db/schema';
import { assembleAppConfig, flattenAppConfig } from '@/lib/config/defaults';
import type { Direction } from '@/lib/srs/directions';
import { getDb } from '@/lib/adapters/postgres/db';

type Db = ReturnType<typeof getDb>;

const iso = (d: Date): string => d.toISOString();
const isoOrNull = (d: Date | null): string | null => (d ? iso(d) : null);
const dayKey = (s: string | null): string | null => (s ? s.slice(0, 10) : null);

function toDeck(r: typeof decks.$inferSelect): Deck {
  return {
    id: r.id,
    title: r.title,
    subtitle: r.subtitle,
    jlptLevel: r.jlptLevel as JlptLevel | null,
    jftBasic: r.jftBasic,
    orderIndex: r.orderIndex,
    isPublished: r.isPublished,
    createdBy: r.createdBy,
    createdAt: iso(r.createdAt),
    updatedAt: iso(r.updatedAt),
  };
}

const PARTS_OF_SPEECH = ['noun', 'verb', 'adverb', 'adjective', 'conjunction', 'demonstrative'] as const;

function toPartOfSpeech(s: string | null): PartOfSpeech | null {
  return s && (PARTS_OF_SPEECH as readonly string[]).includes(s) ? (s as PartOfSpeech) : null;
}

type VocabRow = typeof vocabulary.$inferSelect;
type VocabGrammarFlags = Pick<
  VocabRow,
  | 'godanVerb' | 'ichidanVerb' | 'fukisoku'
  | 'iAdjective' | 'naAdjective'
  | 'jidoushi' | 'tadoushi' | 'verbCollocation'
>;

function vocabGrammar(r: VocabGrammarFlags) {
  return {
    godanVerb: r.godanVerb,
    ichidanVerb: r.ichidanVerb,
    fukisoku: r.fukisoku,
    iAdjective: r.iAdjective,
    naAdjective: r.naAdjective,
    jidoushi: r.jidoushi,
    tadoushi: r.tadoushi,
    verbCollocation: r.verbCollocation,
  };
}

function toProfile(r: typeof userProfile.$inferSelect): UserProfile {
  return {
    id: r.id,
    displayName: r.displayName,
    role: r.role as Role,
    preferredLocale: r.preferredLocale,
    theme: r.theme as ThemeMode,
    level: r.level,
    exp: r.exp,
    lastReviewDate: dayKey(r.lastReviewDate),
    currentStreak: r.currentStreak,
    longestStreak: r.longestStreak,
    createdAt: iso(r.createdAt),
  };
}

/** Build full WordCards for a set of vocabulary ids (bulk). */
async function buildWords(db: Db, ids: number[]): Promise<WordCard[]> {
  if (ids.length === 0) return [];
  const vocabRows = await db.select().from(vocabulary).where(inArray(vocabulary.id, ids));
  const translations = await db
    .select()
    .from(vocabularyTranslations)
    .where(inArray(vocabularyTranslations.vocabularyId, ids));
  const examples = await db
    .select()
    .from(exampleSentences)
    .where(inArray(exampleSentences.vocabularyId, ids))
    .orderBy(exampleSentences.id);
  const exIds = examples.map((e) => e.id);
  const exTrans = exIds.length
    ? await db
        .select()
        .from(exampleSentenceTranslations)
        .where(inArray(exampleSentenceTranslations.exampleSentenceId, exIds))
    : [];
  const collocs = await db
    .select()
    .from(verbCollocations)
    .where(inArray(verbCollocations.vocabularyId, ids));
  const audio = await db
    .select()
    .from(audioAssets)
    .where(inArray(audioAssets.vocabularyId, ids));

  const transByVocab = new Map<number, Record<string, string>>();
  for (const t of translations) {
    const m = transByVocab.get(t.vocabularyId) ?? {};
    m[t.locale] = t.meaning;
    transByVocab.set(t.vocabularyId, m);
  }
  const exByVocab = new Map<number, WordCard['examples']>();
  for (const e of examples) {
    const list = exByVocab.get(e.vocabularyId) ?? [];
    list.push({
      id: e.id,
      vocabularyId: e.vocabularyId,
      japanese: e.japanese,
      translations: exTrans
        .filter((t) => t.exampleSentenceId === e.id)
        .map((t) => ({ locale: t.locale, translation: t.translation })),
    });
    exByVocab.set(e.vocabularyId, list);
  }
  const collocByVocab = new Map<number, WordCard['collocations']>();
  for (const c of collocs) {
    const list = collocByVocab.get(c.vocabularyId) ?? [];
    list.push({ id: c.id, vocabularyId: c.vocabularyId, collocation: c.collocation, meaning: c.meaning });
    collocByVocab.set(c.vocabularyId, list);
  }
  const audioByVocab = new Map<number, string>();
  for (const a of audio.filter((a) => a.lang === 'ja')) audioByVocab.set(a.vocabularyId, a.storageKey);

  return vocabRows.map((v) => ({
    vocabulary: {
      id: v.id,
      kanji: v.kanji,
      hiragana: v.hiragana,
      romaji: v.romaji,
      jlptLevel: v.jlptLevel as JlptLevel | null,
      jftBasic: v.jftBasic,
      partOfSpeech: toPartOfSpeech(v.partOfSpeech),
      ...vocabGrammar(v),
      isActive: v.isActive,
    },
    translations: transByVocab.get(v.id) ?? {},
    examples: exByVocab.get(v.id) ?? [],
    collocations: collocByVocab.get(v.id) ?? [],
    audioKey: audioByVocab.get(v.id) ?? null,
  }));
}

function toSrs(r: typeof srsProgress.$inferSelect): SrsProgress {
  return {
    userId: r.userId,
    vocabularyId: r.vocabularyId,
    direction: r.direction as Direction,
    stability: r.stability,
    difficulty: r.difficulty,
    retrievability: r.retrievability,
    dueAt: iso(r.dueAt),
    lastReviewAt: isoOrNull(r.lastReviewAt),
    reviewCount: r.reviewCount,
    lapses: r.lapses,
  };
}

function toReviewLog(r: typeof reviewLog.$inferSelect): ReviewLog {
  return {
    id: r.id,
    userId: r.userId,
    vocabularyId: r.vocabularyId,
    direction: r.direction as Direction,
    isNew: r.isNew,
    correctness: r.correctness,
    elapsedMs: r.elapsedMs,
    rating: r.rating as 1 | 2 | 3 | 4,
    stabilityBefore: r.stabilityBefore,
    stabilityAfter: r.stabilityAfter,
    difficultyBefore: r.difficultyBefore,
    difficultyAfter: r.difficultyAfter,
    retrievabilityBefore: r.retrievabilityBefore,
    reviewedAt: iso(r.reviewedAt),
  };
}

function toRoleChange(r: typeof roleChangeLog.$inferSelect): RoleChange {
  return {
    id: r.id,
    userId: r.userId,
    byUserId: r.byUserId,
    fromRole: r.fromRole,
    toRole: r.toRole,
    createdAt: iso(r.createdAt),
  };
}

export class PostgresVocabRepo implements VocabRepository {
  // ================= profiles =================
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const rows = await getDb().select().from(userProfile).where(eq(userProfile.id, userId)).limit(1);
    return rows[0] ? toProfile(rows[0]) : null;
  }

  async createUserProfile(p: UserProfile): Promise<void> {
    await getDb().insert(userProfile).values({
      id: p.id,
      displayName: p.displayName,
      role: p.role,
      preferredLocale: p.preferredLocale,
      theme: p.theme,
      level: p.level,
      exp: p.exp,
      lastReviewDate: p.lastReviewDate,
      currentStreak: p.currentStreak,
      longestStreak: p.longestStreak,
    });
  }

  async updateUserProfile(userId: string, patch: Partial<UserProfile>): Promise<UserProfile | null> {
    const { displayName, preferredLocale, theme, level, exp, lastReviewDate, currentStreak, longestStreak } = patch;
    const rows = await getDb()
      .update(userProfile)
      .set({
        ...(displayName !== undefined && { displayName }),
        ...(preferredLocale !== undefined && { preferredLocale }),
        ...(theme !== undefined && { theme }),
        ...(level !== undefined && { level }),
        ...(exp !== undefined && { exp }),
        ...(lastReviewDate !== undefined && { lastReviewDate: lastReviewDate ?? null }),
        ...(currentStreak !== undefined && { currentStreak }),
        ...(longestStreak !== undefined && { longestStreak }),
      })
      .where(eq(userProfile.id, userId))
      .returning();
    return rows[0] ? toProfile(rows[0]) : null;
  }

  async listUserProfiles(opts?: { q?: string }): Promise<UserProfile[]> {
    const rows = await getDb()
      .select()
      .from(userProfile)
      .where(opts?.q ? letLike(userProfile.displayName, opts.q) : undefined)
      .orderBy(userProfile.createdAt);
    return rows.map(toProfile);
  }

  async setUserRole(userId: string, role: Role): Promise<void> {
    await getDb().update(userProfile).set({ role }).where(eq(userProfile.id, userId));
  }

  async deleteUser(userId: string): Promise<void> {
    await getDb().delete(userProfile).where(eq(userProfile.id, userId));
  }

  async logRoleChange(input: { userId: string; byUserId: string; fromRole: Role; toRole: Role }): Promise<void> {
    await getDb()
      .insert(roleChangeLog)
      .values({ userId: input.userId, byUserId: input.byUserId, fromRole: input.fromRole, toRole: input.toRole });
  }

  async listRoleChanges(limit = 20): Promise<RoleChange[]> {
    const rows = await getDb()
      .select()
      .from(roleChangeLog)
      .orderBy(desc(roleChangeLog.createdAt), desc(roleChangeLog.id))
      .limit(limit);
    return rows.map(toRoleChange);
  }

  async getLastActivityForUsers(userIds: string[]): Promise<Record<string, string>> {
    if (userIds.length === 0) return {};
    const db = getDb();
    const reviewRows = await db
      .select({
        userId: reviewLog.userId,
        last: sql<Date>`max(${reviewLog.reviewedAt})`,
      })
      .from(reviewLog)
      .where(inArray(reviewLog.userId, userIds))
      .groupBy(reviewLog.userId);
    const seenRows = await db
      .select({ userId: userProfile.id, seen: userProfile.lastSeenAt })
      .from(userProfile)
      .where(inArray(userProfile.id, userIds));
    const map: Record<string, string> = {};
    for (const r of reviewRows) map[r.userId] = iso(r.last);
    for (const r of seenRows) {
      if (!r.seen) continue;
      const isoSeen = iso(r.seen);
      if (!map[r.userId] || isoSeen > map[r.userId]) map[r.userId] = isoSeen;
    }
    return map;
  }

  async touchLastActivity(userId: string): Promise<void> {
    await getDb()
      .update(userProfile)
      .set({ lastSeenAt: new Date() })
      .where(eq(userProfile.id, userId));
  }

  // ================= vocabulary content =================
  async searchVocabulary(q: string, opts?: { limit?: number }): Promise<WordCard[]> {
    const limit = opts?.limit ?? 20;
    const db = getDb();
    const rows = await db
      .select({ id: vocabulary.id })
      .from(vocabulary)
      .where(
        or(
          letLike(vocabulary.kanji, q),
          letLike(vocabulary.hiragana, q),
          sql`EXISTS (SELECT 1 FROM vocabulary_translations vt WHERE vt.vocabulary_id = vocabulary.id AND vt.meaning ILIKE ${'%' + q + '%'})`,
        ),
      )
      .orderBy(vocabulary.id)
      .limit(limit);
    return buildWords(db, rows.map((r) => r.id));
  }

  async getVocabularyByReading(kanji: string | null, hiragana: string): Promise<Vocabulary | null> {
    const rows = await getDb()
      .select()
      .from(vocabulary)
      .where(
        and(
          kanji ? eq(vocabulary.kanji, kanji) : sql`${vocabulary.kanji} IS NULL`,
          eq(vocabulary.hiragana, hiragana),
        ),
      )
      .limit(1);
    return rows[0]
      ? {
          id: rows[0].id, kanji: rows[0].kanji, hiragana: rows[0].hiragana,
          romaji: rows[0].romaji, jlptLevel: rows[0].jlptLevel as JlptLevel | null,
          jftBasic: rows[0].jftBasic, partOfSpeech: toPartOfSpeech(rows[0].partOfSpeech), ...vocabGrammar(rows[0]),
          isActive: rows[0].isActive,
        }
      : null;
  }

  async getVocabularyById(id: number): Promise<WordCard | null> {
    const words = await buildWords(getDb(), [id]);
    return words[0] ?? null;
  }

  async getWordsByIds(ids: number[]): Promise<WordCard[]> {
    return buildWords(getDb(), ids);
  }

  async createVocabulary(input: TagWithVocabInput, createdBy: string | null): Promise<Vocabulary> {
    const db = getDb();
    const inserted = await db
      .insert(vocabulary)
      .values({
        kanji: input.kanji ?? null,
        hiragana: input.hiragana,
        romaji: input.romaji ?? null,
        jlptLevel: (input.jlptLevel as JlptLevel | null) ?? null,
        jftBasic: input.jftBasic ?? false,
        partOfSpeech: (input.partOfSpeech as PartOfSpeech | null) ?? null,
        godanVerb: input.godanVerb ?? false,
        ichidanVerb: input.ichidanVerb ?? false,
        fukisoku: input.fukisoku ?? false,
        iAdjective: input.iAdjective ?? false,
        naAdjective: input.naAdjective ?? false,
        jidoushi: input.jidoushi ?? false,
        tadoushi: input.tadoushi ?? false,
        verbCollocation: input.verbCollocation ?? false,
        createdBy,
      })
      .returning();
    const v = inserted[0];
    if (input.translations.length) {
      await db.insert(vocabularyTranslations).values(
        input.translations.map((t) => ({ vocabularyId: v.id, locale: t.locale, meaning: t.meaning })),
      );
    }
    for (const ex of input.examples ?? []) {
      const exRow = await db
        .insert(exampleSentences)
        .values({ vocabularyId: v.id, japanese: ex.japanese })
        .returning();
      if (ex.translations.length) {
        await db.insert(exampleSentenceTranslations).values(
          ex.translations.map((t) => ({ exampleSentenceId: exRow[0].id, locale: t.locale, translation: t.translation })),
        );
      }
    }
    for (const c of input.collocations ?? []) {
      await db
        .insert(verbCollocations)
        .values({ vocabularyId: v.id, collocation: c.collocation, meaning: c.meaning ?? null });
    }
    return {
      id: v.id, kanji: v.kanji, hiragana: v.hiragana, romaji: v.romaji,
      jlptLevel: v.jlptLevel as JlptLevel | null, jftBasic: v.jftBasic, partOfSpeech: toPartOfSpeech(v.partOfSpeech), ...vocabGrammar(v), isActive: v.isActive,
    };
  }

  async updateVocabulary(id: number, patch: Partial<TagWithVocabInput>): Promise<Vocabulary | null> {
    const db = getDb();
    const set: Partial<typeof vocabulary.$inferInsert> = {};
    if (patch.kanji !== undefined) set.kanji = patch.kanji;
    if (patch.hiragana !== undefined) set.hiragana = patch.hiragana;
    if (patch.romaji !== undefined) set.romaji = patch.romaji ?? null;
    if (patch.jlptLevel !== undefined) set.jlptLevel = (patch.jlptLevel as JlptLevel | null) ?? null;
    if (patch.jftBasic !== undefined) set.jftBasic = patch.jftBasic;
    if (patch.partOfSpeech !== undefined) set.partOfSpeech = patch.partOfSpeech ?? null;
    if (patch.godanVerb !== undefined) set.godanVerb = patch.godanVerb;
    if (patch.ichidanVerb !== undefined) set.ichidanVerb = patch.ichidanVerb;
    if (patch.fukisoku !== undefined) set.fukisoku = patch.fukisoku;
    if (patch.iAdjective !== undefined) set.iAdjective = patch.iAdjective;
    if (patch.naAdjective !== undefined) set.naAdjective = patch.naAdjective;
    if (patch.jidoushi !== undefined) set.jidoushi = patch.jidoushi;
    if (patch.tadoushi !== undefined) set.tadoushi = patch.tadoushi;
    if (patch.verbCollocation !== undefined) set.verbCollocation = patch.verbCollocation;
    const rows = Object.keys(set).length > 0
      ? await db.update(vocabulary).set(set).where(eq(vocabulary.id, id)).returning()
      : await db.select().from(vocabulary).where(eq(vocabulary.id, id)).limit(1);
    if (patch.translations) {
      await db.delete(vocabularyTranslations).where(eq(vocabularyTranslations.vocabularyId, id));
      await db.insert(vocabularyTranslations).values(
        patch.translations.map((t) => ({ vocabularyId: id, locale: t.locale, meaning: t.meaning })),
      );
    }
    if (patch.examples) {
      await db.delete(exampleSentences).where(eq(exampleSentences.vocabularyId, id));
      for (const ex of patch.examples) {
        const exRow = await db
          .insert(exampleSentences)
          .values({ vocabularyId: id, japanese: ex.japanese })
          .returning();
        if (ex.translations.length) {
          await db.insert(exampleSentenceTranslations).values(
            ex.translations.map((t) => ({ exampleSentenceId: exRow[0].id, locale: t.locale, translation: t.translation })),
          );
        }
      }
    }
    if (patch.collocations) {
      await db.delete(verbCollocations).where(eq(verbCollocations.vocabularyId, id));
      await db.insert(verbCollocations).values(
        patch.collocations.map((c) => ({ vocabularyId: id, collocation: c.collocation, meaning: c.meaning ?? null })),
      );
    }
    return rows[0]
      ? {
          id: rows[0].id, kanji: rows[0].kanji, hiragana: rows[0].hiragana, romaji: rows[0].romaji,
          jlptLevel: rows[0].jlptLevel as JlptLevel | null, jftBasic: rows[0].jftBasic, partOfSpeech: toPartOfSpeech(rows[0].partOfSpeech), ...vocabGrammar(rows[0]), isActive: rows[0].isActive,
        }
      : null;
  }

  async deleteVocabulary(id: number): Promise<void> {
    await getDb().delete(vocabulary).where(eq(vocabulary.id, id));
  }

  // ================= decks =================
  async listDecks(opts?: { publishedOnly?: boolean; q?: string }): Promise<Deck[]> {
    const where = opts?.publishedOnly
      ? opts?.q
        ? and(eq(decks.isPublished, true), letLike(decks.title, opts.q))
        : eq(decks.isPublished, true)
      : opts?.q
        ? letLike(decks.title, opts.q)
        : undefined;
    const rows = await getDb().select().from(decks).where(where).orderBy(decks.orderIndex);
    return rows.map(toDeck);
  }

  async getDeck(id: number): Promise<Deck | null> {
    const rows = await getDb().select().from(decks).where(eq(decks.id, id)).limit(1);
    return rows[0] ? toDeck(rows[0]) : null;
  }

  async createDeck(input: { title: string; subtitle?: string | null; jlptLevel?: JlptLevel | null; jftBasic?: boolean; orderIndex: number; isPublished?: boolean }, createdBy: string | null): Promise<Deck> {
    const rows = await getDb()
      .insert(decks)
      .values({
        title: input.title,
        subtitle: input.subtitle ?? null,
        jlptLevel: (input.jlptLevel as JlptLevel | null) ?? null,
        jftBasic: input.jftBasic ?? false,
        orderIndex: input.orderIndex,
        isPublished: input.isPublished ?? false,
        createdBy,
      })
      .returning();
    return toDeck(rows[0]);
  }

  async updateDeck(id: number, patch: Partial<{ title: string; subtitle?: string | null; jlptLevel?: JlptLevel | null; jftBasic?: boolean; orderIndex: number; isPublished?: boolean }>): Promise<Deck | null> {
    const set: Partial<typeof decks.$inferInsert> = {};
    if (patch.title !== undefined) set.title = patch.title;
    if (patch.subtitle !== undefined) set.subtitle = patch.subtitle ?? null;
    if (patch.jlptLevel !== undefined) set.jlptLevel = (patch.jlptLevel as JlptLevel | null) ?? null;
    if (patch.jftBasic !== undefined) set.jftBasic = patch.jftBasic;
    if (patch.orderIndex !== undefined) set.orderIndex = patch.orderIndex;
    if (patch.isPublished !== undefined) set.isPublished = patch.isPublished;
    const rows = await getDb().update(decks).set(set).where(eq(decks.id, id)).returning();
    return rows[0] ? toDeck(rows[0]) : null;
  }

  async deleteDeck(id: number): Promise<void> {
    await getDb().delete(decks).where(eq(decks.id, id));
  }

  async getDeckWords(deckId: number): Promise<WordCard[]> {
    const db = getDb();
    const links = await db
      .select({ vocabularyId: deckVocabulary.vocabularyId })
      .from(deckVocabulary)
      .where(eq(deckVocabulary.deckId, deckId));
    const ids = links
      .map((l) => l.vocabularyId);
    const words = await buildWords(db, ids);
    const order = new Map(links.map((l, i) => [l.vocabularyId, i]));
    return words.sort((a, b) => (order.get(a.vocabulary.id) ?? 0) - (order.get(b.vocabulary.id) ?? 0));
  }

  async getDeckWordIds(deckId: number): Promise<number[]> {
    const rows = await getDb()
      .select({ vocabularyId: deckVocabulary.vocabularyId })
      .from(deckVocabulary)
      .where(eq(deckVocabulary.deckId, deckId));
    return rows.map((r) => r.vocabularyId);
  }

  async getDeckWordCount(deckId: number): Promise<number> {
    const rows = await getDb()
      .select({ count: sql<number>`count(*)::int` })
      .from(deckVocabulary)
      .where(eq(deckVocabulary.deckId, deckId));
    return rows[0]?.count ?? 0;
  }

  async addVocabularyToDeck(deckId: number, vocabularyId: number, orderInDeck?: number): Promise<void> {
    await getDb()
      .insert(deckVocabulary)
      .values({ deckId, vocabularyId, orderInDeck: orderInDeck ?? null })
      .onConflictDoNothing();
  }

  async removeVocabularyFromDeck(deckId: number, vocabularyId: number): Promise<void> {
    await getDb()
      .delete(deckVocabulary)
      .where(and(eq(deckVocabulary.deckId, deckId), eq(deckVocabulary.vocabularyId, vocabularyId)));
  }

  async deckContainsVocabulary(deckId: number, vocabularyId: number): Promise<boolean> {
    const rows = await getDb()
      .select({ id: deckVocabulary.vocabularyId })
      .from(deckVocabulary)
      .where(and(eq(deckVocabulary.deckId, deckId), eq(deckVocabulary.vocabularyId, vocabularyId)))
      .limit(1);
    return rows.length > 0;
  }

  // ================= SRS =================
  async getWordsWithProgress(userId: string): Promise<number[]> {
    const rows = await getDb()
      .selectDistinct({ vocabularyId: srsProgress.vocabularyId })
      .from(srsProgress)
      .where(eq(srsProgress.userId, userId));
    return rows.map((r) => r.vocabularyId);
  }

  async getProgressForVocabulary(userId: string, vocabularyIds: number[]): Promise<SrsProgress[]> {
    if (vocabularyIds.length === 0) return [];
    const rows = await getDb()
      .select()
      .from(srsProgress)
      .where(and(eq(srsProgress.userId, userId), inArray(srsProgress.vocabularyId, vocabularyIds)));
    return rows.map(toSrs);
  }

  async getProgress(userId: string, vocabularyId: number, direction: Direction): Promise<SrsProgress | null> {
    const rows = await getDb()
      .select()
      .from(srsProgress)
      .where(
        and(
          eq(srsProgress.userId, userId),
          eq(srsProgress.vocabularyId, vocabularyId),
          eq(srsProgress.direction, direction),
        ),
      )
      .limit(1);
    return rows[0] ? toSrs(rows[0]) : null;
  }

  async getDueEntries(userId: string, now: string, opts?: { limit?: number }): Promise<DueEntry[]> {
    const db = getDb();
    const rows = await db
      .select()
      .from(srsProgress)
      .where(and(eq(srsProgress.userId, userId), sql`${srsProgress.dueAt} <= ${now}`))
      .orderBy(ascDue())
      .limit(opts?.limit ?? 60);
    const ids = [...new Set(rows.map((r) => r.vocabularyId))];
    const words = await buildWords(db, ids);
    const wordById = new Map(words.map((w) => [w.vocabulary.id, w]));
    return rows
      .filter((r) => wordById.has(r.vocabularyId))
      .map((r) => ({ progress: toSrs(r), word: wordById.get(r.vocabularyId)! }));
  }

  async countDue(userId: string, now: string): Promise<number> {
    const rows = await getDb()
      .select({ count: sql<number>`count(*)::int` })
      .from(srsProgress)
      .where(and(eq(srsProgress.userId, userId), sql`${srsProgress.dueAt} <= ${now}`));
    return rows[0]?.count ?? 0;
  }

  async countNewReviews(userId: string, since: string): Promise<number> {
    const rows = await getDb()
      .select({ count: sql<number>`count(*)::int` })
      .from(reviewLog)
      .where(and(eq(reviewLog.userId, userId), eq(reviewLog.isNew, true), sql`${reviewLog.reviewedAt} >= ${since}`));
    return rows[0]?.count ?? 0;
  }

  async applyReview(input: ApplyReviewInput): Promise<void> {
    const dueAt = new Date(input.progress.dueAt);
    const lastReviewAt = input.progress.lastReviewAt ? new Date(input.progress.lastReviewAt) : null;
    await getDb().transaction(async (tx) => {
      await tx.insert(reviewLog).values({
        userId: input.userId,
        vocabularyId: input.log.vocabularyId,
        direction: input.log.direction,
        isNew: input.log.isNew,
        correctness: input.log.correctness,
        elapsedMs: input.log.elapsedMs,
        rating: input.log.rating,
        stabilityBefore: input.log.stabilityBefore,
        stabilityAfter: input.log.stabilityAfter,
        difficultyBefore: input.log.difficultyBefore,
        difficultyAfter: input.log.difficultyAfter,
        retrievabilityBefore: input.log.retrievabilityBefore,
      });

      await tx
        .insert(srsProgress)
        .values({
          userId: input.userId,
          vocabularyId: input.progress.vocabularyId,
          direction: input.progress.direction,
          stability: input.progress.stability,
          difficulty: input.progress.difficulty,
          retrievability: input.progress.retrievability,
          dueAt,
          lastReviewAt,
          reviewCount: input.progress.reviewCount,
          lapses: input.progress.lapses,
        })
        .onConflictDoUpdate({
          target: [srsProgress.userId, srsProgress.vocabularyId, srsProgress.direction],
          set: {
            stability: input.progress.stability,
            difficulty: input.progress.difficulty,
            retrievability: input.progress.retrievability,
            dueAt,
            lastReviewAt,
            reviewCount: input.progress.reviewCount,
            lapses: input.progress.lapses,
          },
        });

      await tx
        .update(userProfile)
        .set({
          exp: input.userStats.exp,
          level: input.userStats.level,
          currentStreak: input.userStats.currentStreak,
          longestStreak: input.userStats.longestStreak,
          lastReviewDate: input.userStats.lastReviewDate,
        })
        .where(eq(userProfile.id, input.userId));
    });
  }

  // ================= config =================
  async getAppConfig(): Promise<AppConfig> {
    const rows = await getDb().select().from(appConfigTable);
    return assembleAppConfig(rows.map((r) => ({ key: r.key, valueJson: r.valueJson })));
  }

  async setAppConfig(config: AppConfig): Promise<void> {
    const rows = flattenAppConfig(config);
    await getDb().transaction(async (tx) => {
      for (const r of rows) {
        await tx
          .insert(appConfigTable)
          .values({ key: r.key, valueJson: r.valueJson })
          .onConflictDoUpdate({ target: [appConfigTable.key], set: { valueJson: r.valueJson } });
      }
    });
  }

  async getDirectionThresholds(): Promise<Record<Direction, DirectionThreshold>> {
    const rows = await getDb().select().from(directionThresholds);
    const defaults = { fastThresholdMs: 8000, goodThresholdMs: 15000 };
    const out = {} as Record<Direction, DirectionThreshold>;
    for (const d of ([1, 2, 3, 4, 5, 6] as Direction[])) {
      const r = rows.find((x) => x.direction === d);
      out[d] = r
        ? { direction: d, fastThresholdMs: r.fastThresholdMs, goodThresholdMs: r.goodThresholdMs }
        : { direction: d, ...defaults };
    }
    return out;
  }

  async setDirectionThreshold(dir: Direction, t: Pick<DirectionThreshold, 'fastThresholdMs' | 'goodThresholdMs'>): Promise<void> {
    await getDb()
      .insert(directionThresholds)
      .values({ direction: dir, fastThresholdMs: t.fastThresholdMs, goodThresholdMs: t.goodThresholdMs })
      .onConflictDoUpdate({
        target: [directionThresholds.direction],
        set: { fastThresholdMs: t.fastThresholdMs, goodThresholdMs: t.goodThresholdMs },
      });
  }

  // ================= stats =================
  async getActivity(userId: string, days: number): Promise<ActivityDay[]> {
    const since = new Date(Date.now() - days * 86400000).toISOString();
    const rows = await getDb()
      .select({
        date: sql<string>`to_char(${reviewLog.reviewedAt}, 'YYYY-MM-DD')`,
        reviews: sql<number>`count(*)::int`,
        seconds: sql<number>`sum(least(${reviewLog.elapsedMs}, 30000))::int / 1000`,
      })
      .from(reviewLog)
      .where(and(eq(reviewLog.userId, userId), sql`${reviewLog.reviewedAt} >= ${since}`))
      .groupBy(sql`to_char(${reviewLog.reviewedAt}, 'YYYY-MM-DD')`);
    return rows.map((r) => ({ date: r.date.slice(0, 10), reviews: r.reviews ?? 0, seconds: r.seconds ?? 0 }));
  }

  async getRecentLogs(userId: string, limit = 20): Promise<ReviewLog[]> {
    const rows = await getDb()
      .select()
      .from(reviewLog)
      .where(eq(reviewLog.userId, userId))
      .orderBy(desc(reviewLog.reviewedAt))
      .limit(limit);
    return rows.map(toReviewLog);
  }

  async getStudySeconds(userId: string, sinceDays: number): Promise<number> {
    const since = new Date(Date.now() - sinceDays * 86400000).toISOString();
    const rows = await getDb()
      .select({ seconds: sql<number>`coalesce(sum(least(${reviewLog.elapsedMs}, 30000))::int/1000, 0)` })
      .from(reviewLog)
      .where(and(eq(reviewLog.userId, userId), sql`${reviewLog.reviewedAt} >= ${since}`));
    return rows[0]?.seconds ?? 0;
  }
}

// helper aliases to keep the code above readable
function letLike(col: AnyPgColumn, q: string) {
  return sql`${col} ILIKE ${'%' + q + '%'}`;
}
function ascDue() {
  return sql`due_at ASC`;
}