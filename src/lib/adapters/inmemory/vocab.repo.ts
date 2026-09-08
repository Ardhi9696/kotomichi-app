/**
 * InMemoryVocabRepo — dev-only adapter (§3.1). Implements the same
 * VocabRepository contract as the Postgres adapter so the app can run
 * without DATABASE_URL. State is process-local and seeded on construction.
 */

import type {
  ActivityDay,
  AppConfig,
  DayDetail,
  Deck,
  DirectionThreshold,
  JlptLevel,
  QuizAnswerInput,
  QuizMode,
  QuizSession,
  QuizSessionAnswer,
  QuizSessionVocabDetail,
  ReviewLog,
  Role,
  RoleChange,
  SrsProgress,
  UserProfile,
  Vocabulary,
  WordCard,
} from '@/lib/domain';
import type { Direction } from '@/lib/srs/directions';
import type {
  ApplyReviewInput,
  DeckInput,
  DueEntry,
  TagWithVocabInput,
  VocabRepository,
} from '@/lib/ports/db-port';
import { DEFAULTS, DEFAULT_THRESHOLDS } from '@/lib/config/defaults';
import { buildSeedDocs } from '@/lib/adapters/inmemory/seed';
import { computeDayDetail, type DayStatsRow } from '@/lib/stats/overview';

const key = (userId: string, vocabularyId: number, direction: Direction) =>
  `${userId}:${vocabularyId}:${direction}`;

export class InMemoryVocabRepo implements VocabRepository {
  private profiles = new Map<string, UserProfile>();
  private words = new Map<number, WordCard>();
  private decks = new Map<number, Deck>();
  private deckMembership = new Map<number, number[]>();
  private progress = new Map<string, SrsProgress>();
  private logs = new Map<string, ReviewLog[]>();
  private lastSeen = new Map<string, string>();
  private roleChanges: RoleChange[] = [];
  private nextRoleChangeId = 1;
  private config: AppConfig = structuredClone(DEFAULTS);
  private thresholds: Record<Direction, DirectionThreshold> = structuredClone(
    DEFAULT_THRESHOLDS,
  ) as Record<Direction, DirectionThreshold>;
  private nextVocabId: number;
  private nextExampleId: number;
  private nextCollocId: number;
  private nextLogId: number;
  private nextDeckId: number;
  private quizSessions = new Map<number, QuizSession>();
  private quizSessionAnswers = new Map<number, QuizSessionAnswer[]>();
  private quizSessionVocabDetails = new Map<number, QuizSessionVocabDetail[]>();
  private nextQuizSessionId = 1;

  constructor() {
    const { words, decks, deckMembership } = buildSeedDocs();
    for (const w of words) this.words.set(w.vocabulary.id, w);
    for (const d of decks) this.decks.set(d.id, d);
    for (const [deckId, ids] of deckMembership) this.deckMembership.set(deckId, ids);
    this.nextVocabId = Math.max(...this.words.keys(), 0) + 1;
    this.nextExampleId = Math.max(...[...this.words.values()].flatMap((w) => w.examples.map((e) => e.id)), 0) + 1;
    this.nextCollocId = Math.max(...[...this.words.values()].flatMap((w) => w.collocations.map((c) => c.id)), 0) + 1;
    this.nextDeckId = Math.max(...this.decks.keys(), 100) + 1;
    this.nextLogId = 1;
  }

  // ================= profiles =================
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    return this.profiles.get(userId) ?? null;
  }

  async createUserProfile(p: UserProfile): Promise<void> {
    this.profiles.set(p.id, { ...p });
  }

  async updateUserProfile(userId: string, patch: Partial<UserProfile>): Promise<UserProfile | null> {
    const cur = this.profiles.get(userId);
    if (!cur) return null;
    const next = { ...cur, ...patch };
    this.profiles.set(userId, next);
    return { ...next };
  }

  async listUserProfiles(opts?: { q?: string }): Promise<UserProfile[]> {
    const q = opts?.q?.toLowerCase();
    return [...this.profiles.values()]
      .filter((p) => (q ? p.displayName.toLowerCase().includes(q) : true))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async setUserRole(userId: string, role: Role): Promise<void> {
    const cur = this.profiles.get(userId);
    if (cur) this.profiles.set(userId, { ...cur, role });
  }

  async deleteUser(userId: string): Promise<void> {
    this.profiles.delete(userId);
    this.logs.delete(userId);
    for (const k of this.progress.keys()) {
      if (k.startsWith(`${userId}:`)) this.progress.delete(k);
    }
  }

  async logRoleChange(input: { userId: string; byUserId: string; fromRole: Role; toRole: Role }): Promise<void> {
    this.roleChanges.push({
      id: this.nextRoleChangeId++,
      userId: input.userId,
      byUserId: input.byUserId,
      fromRole: input.fromRole,
      toRole: input.toRole,
      createdAt: new Date().toISOString(),
    });
  }

  async listRoleChanges(limit = 20): Promise<RoleChange[]> {
    return [...this.roleChanges].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);
  }

  async getLastActivityForUsers(userIds: string[]): Promise<Record<string, string>> {
    const wanted = new Set(userIds);
    const map: Record<string, string> = {};
    for (const [uid, logs] of this.logs) {
      if (!wanted.has(uid) || logs.length === 0) continue;
      map[uid] = logs.reduce((max, l) => (l.reviewedAt > max ? l.reviewedAt : max), logs[0].reviewedAt);
    }
    for (const [uid, seen] of this.lastSeen) {
      if (!wanted.has(uid)) continue;
      if (!map[uid] || seen > map[uid]) map[uid] = seen;
    }
    return map;
  }

  async touchLastActivity(userId: string): Promise<void> {
    this.lastSeen.set(userId, new Date().toISOString());
  }

  // ================= vocabulary content =================
  async searchVocabulary(q: string, opts?: { limit?: number }): Promise<WordCard[]> {
    const needle = q.trim().toLowerCase();
    const limit = opts?.limit ?? 20;
    const hits: WordCard[] = [];
    for (const w of this.words.values()) {
      const text = [
        w.vocabulary.kanji,
        w.vocabulary.hiragana,
        w.vocabulary.romaji,
        ...Object.values(w.translations),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (text.includes(needle)) hits.push(w);
      if (hits.length >= limit) break;
    }
    return [...hits]
      .sort((a, b) => a.vocabulary.id - b.vocabulary.id)
      .slice(0, limit);
  }

  async getVocabularyByReading(kanji: string | null, hiragana: string): Promise<Vocabulary | null> {
    for (const w of this.words.values()) {
      if (w.vocabulary.hiragana === hiragana && (w.vocabulary.kanji ?? null) === kanji) {
        return { ...w.vocabulary };
      }
    }
    return null;
  }

  async getVocabularyById(id: number): Promise<WordCard | null> {
    const w = this.words.get(id);
    return w ? structuredClone(w) : null;
  }

  async getWordsByIds(ids: number[]): Promise<WordCard[]> {
    return ids.map((id) => this.words.get(id)).filter(Boolean).map((w) => structuredClone(w as WordCard));
  }

  async createVocabulary(input: TagWithVocabInput, _createdBy: string | null): Promise<Vocabulary> {
    const id = this.nextVocabId++;
    const vocab: Vocabulary = {
      id,
      kanji: input.kanji ?? null,
      hiragana: input.hiragana,
      romaji: input.romaji ?? null,
      furigana: input.furigana ?? null,
      jlptLevel: input.jlptLevel ?? null,
      jftBasic: input.jftBasic ?? false,
      partOfSpeech: input.partOfSpeech ?? null,
      godanVerb: input.godanVerb ?? false,
      ichidanVerb: input.ichidanVerb ?? false,
      fukisoku: input.fukisoku ?? false,
      iAdjective: input.iAdjective ?? false,
      naAdjective: input.naAdjective ?? false,
      jidoushi: input.jidoushi ?? false,
      tadoushi: input.tadoushi ?? false,
      verbCollocation: input.verbCollocation ?? false,
      isActive: true,
    };
    const translations: Record<string, string> = {};
    for (const t of input.translations) translations[t.locale] = t.meaning;
    const examples = (input.examples ?? []).map((e) => ({
      id: this.nextExampleId++,
      vocabularyId: id,
      japanese: e.japanese,
      translations: e.translations,
    }));
    const collocations = (input.collocations ?? []).map((c) => ({
      id: this.nextCollocId++,
      vocabularyId: id,
      collocation: c.collocation,
      meaning: c.meaning ?? null,
    }));
    this.words.set(id, {
      vocabulary: vocab,
      translations,
      examples,
      collocations,
      audioKey: null,
    });
    return { ...vocab };
  }

  async updateVocabulary(id: number, patch: Partial<TagWithVocabInput>): Promise<Vocabulary | null> {
    const w = this.words.get(id);
    if (!w) return null;
    if (patch.kanji !== undefined) w.vocabulary.kanji = patch.kanji ?? null;
    if (patch.hiragana !== undefined) w.vocabulary.hiragana = patch.hiragana;
    if (patch.romaji !== undefined) w.vocabulary.romaji = patch.romaji ?? null;
    if (patch.jlptLevel !== undefined) w.vocabulary.jlptLevel = (patch.jlptLevel as JlptLevel | null) ?? null;
    if (patch.jftBasic !== undefined) w.vocabulary.jftBasic = patch.jftBasic;
    if (patch.partOfSpeech !== undefined) w.vocabulary.partOfSpeech = patch.partOfSpeech ?? null;
    if (patch.godanVerb !== undefined) w.vocabulary.godanVerb = patch.godanVerb;
    if (patch.ichidanVerb !== undefined) w.vocabulary.ichidanVerb = patch.ichidanVerb;
    if (patch.fukisoku !== undefined) w.vocabulary.fukisoku = patch.fukisoku;
    if (patch.iAdjective !== undefined) w.vocabulary.iAdjective = patch.iAdjective;
    if (patch.naAdjective !== undefined) w.vocabulary.naAdjective = patch.naAdjective;
    if (patch.jidoushi !== undefined) w.vocabulary.jidoushi = patch.jidoushi;
    if (patch.tadoushi !== undefined) w.vocabulary.tadoushi = patch.tadoushi;
    if (patch.verbCollocation !== undefined) w.vocabulary.verbCollocation = patch.verbCollocation;
    if (patch.translations) {
      const t: Record<string, string> = {};
      for (const tr of patch.translations) t[tr.locale] = tr.meaning;
      w.translations = t;
    }
    if (patch.examples) {
      w.examples = patch.examples.map((e) => ({
        id: this.nextExampleId++,
        vocabularyId: id,
        japanese: e.japanese,
        translations: e.translations,
      }));
    }
    if (patch.collocations) {
      w.collocations = patch.collocations.map((c) => ({
        id: this.nextCollocId++,
        vocabularyId: id,
        collocation: c.collocation,
        meaning: c.meaning ?? null,
      }));
    }
    return { ...w.vocabulary };
  }

  async deleteVocabulary(id: number): Promise<void> {
    this.words.delete(id);
    for (const [, ids] of this.deckMembership) {
      const i = ids.indexOf(id);
      if (i !== -1) ids.splice(i, 1);
    }
  }

  // ================= decks =================
  async listDecks(opts?: { publishedOnly?: boolean; q?: string }): Promise<Deck[]> {
    const needle = opts?.q?.toLowerCase();
    return [...this.decks.values()]
      .filter((d) => (opts?.publishedOnly ? d.isPublished : true))
      .filter((d) => (needle ? d.title.toLowerCase().includes(needle) : true))
      .sort((a, b) => a.orderIndex - b.orderIndex || a.id - b.id);
  }

  async getDeck(id: number): Promise<Deck | null> {
    const d = this.decks.get(id);
    return d ? { ...d } : null;
  }

  async createDeck(input: DeckInput, createdBy: string | null): Promise<Deck> {
    const now = new Date().toISOString();
    const deck: Deck = {
      id: this.nextDeckId++,
      title: input.title,
      subtitle: input.subtitle ?? null,
      jlptLevel: (input.jlptLevel as JlptLevel | null) ?? null,
      jftBasic: input.jftBasic ?? false,
      orderIndex: input.orderIndex,
      isPublished: input.isPublished ?? false,
      createdBy,
      createdAt: now,
      updatedAt: now,
    };
    this.decks.set(deck.id, deck);
    this.deckMembership.set(deck.id, []);
    return { ...deck };
  }

  async updateDeck(id: number, patch: Partial<DeckInput>): Promise<Deck | null> {
    const d = this.decks.get(id);
    if (!d) return null;
    const next: Deck = {
      ...d,
      title: patch.title ?? d.title,
      subtitle: patch.subtitle === undefined ? d.subtitle : patch.subtitle,
      jlptLevel: patch.jlptLevel === undefined ? d.jlptLevel : (patch.jlptLevel ?? null),
      jftBasic: patch.jftBasic === undefined ? d.jftBasic : patch.jftBasic,
      orderIndex: patch.orderIndex ?? d.orderIndex,
      isPublished: patch.isPublished ?? d.isPublished,
      updatedAt: new Date().toISOString(),
    };
    this.decks.set(id, next);
    return { ...next };
  }

  async deleteDeck(id: number): Promise<void> {
    this.decks.delete(id);
    this.deckMembership.delete(id);
  }

  async getDeckWords(deckId: number): Promise<WordCard[]> {
    const ids = this.deckMembership.get(deckId) ?? [];
    const order = new Map(ids.map((id, i) => [id, i]));
    return ids
      .map((id) => this.words.get(id))
      .filter((w): w is WordCard => Boolean(w))
      .sort((a, b) => (order.get(a.vocabulary.id) ?? 0) - (order.get(b.vocabulary.id) ?? 0));
  }

  async getDeckWordIds(deckId: number): Promise<number[]> {
    return [...(this.deckMembership.get(deckId) ?? [])];
  }

  async getDeckWordCount(deckId: number): Promise<number> {
    return (this.deckMembership.get(deckId) ?? []).length;
  }

  async createVocabularyBatch(
    inputs: TagWithVocabInput[],
    createdBy: string | null,
    deckIds: number[],
  ): Promise<number> {
    for (const input of inputs) {
      const created = await this.createVocabulary(input, createdBy);
      for (const deckId of deckIds) await this.addVocabularyToDeck(deckId, created.id);
    }
    return inputs.length;
  }

  async addVocabularyToDeck(deckId: number, vocabularyId: number, orderInDeck?: number): Promise<void> {
    const list = this.deckMembership.get(deckId) ?? [];
    if (!list.includes(vocabularyId)) {
      const order = orderInDeck ?? list.length;
      list.splice(Math.min(order, list.length), 0, vocabularyId);
      this.deckMembership.set(deckId, list);
    }
  }

  async removeVocabularyFromDeck(deckId: number, vocabularyId: number): Promise<void> {
    const list = this.deckMembership.get(deckId) ?? [];
    this.deckMembership.set(deckId, list.filter((id) => id !== vocabularyId));
  }

  async deckContainsVocabulary(deckId: number, vocabularyId: number): Promise<boolean> {
    return (this.deckMembership.get(deckId) ?? []).includes(vocabularyId);
  }

  // ================= SRS =================
  async getWordsWithProgress(userId: string): Promise<number[]> {
    const ids = new Set<number>();
    for (const { userId: u, vocabularyId } of this.progress.values()) {
      if (u === userId) ids.add(vocabularyId);
    }
    return [...ids];
  }

  async getProgressForVocabulary(userId: string, vocabularyIds: number[]): Promise<SrsProgress[]> {
    const out: SrsProgress[] = [];
    for (const id of vocabularyIds) {
      for (const d of [1, 2, 3, 4, 5, 6] as Direction[]) {
        const p = this.progress.get(key(userId, id, d));
        if (p) out.push({ ...p });
      }
    }
    return out;
  }

  async getProgress(userId: string, vocabularyId: number, direction: Direction): Promise<SrsProgress | null> {
    const p = this.progress.get(key(userId, vocabularyId, direction));
    return p ? { ...p } : null;
  }

  async getDueEntries(userId: string, now: string, opts?: { limit?: number }): Promise<DueEntry[]> {
    const limit = opts?.limit ?? 60;
    const rows: DueEntry[] = [];
    for (const p of this.progress.values()) {
      if (p.userId !== userId) continue;
      if (p.dueAt > now) continue;
      const word = this.words.get(p.vocabularyId);
      if (!word) continue;
      rows.push({ progress: { ...p }, word: structuredClone(word) });
    }
    rows.sort((a, b) => a.progress.dueAt.localeCompare(b.progress.dueAt));
    return rows.slice(0, limit);
  }

  async countDue(userId: string, now: string): Promise<number> {
    let n = 0;
    for (const p of this.progress.values()) {
      if (p.userId === userId && p.dueAt <= now) n++;
    }
    return n;
  }

  async countNewReviews(userId: string, since: string): Promise<number> {
    let n = 0;
    for (const l of this.logs.get(userId) ?? []) {
      if (l.isNew && l.reviewedAt >= since) n++;
    }
    return n;
  }

  async applyReview(input: ApplyReviewInput): Promise<void> {
    const { userId, log, progress, userStats } = input;

    const logRow: ReviewLog = {
      id: this.nextLogId++,
      userId,
      vocabularyId: log.vocabularyId,
      direction: log.direction,
      isNew: log.isNew,
      correctness: log.correctness,
      elapsedMs: log.elapsedMs,
      rating: log.rating,
      stabilityBefore: log.stabilityBefore,
      stabilityAfter: log.stabilityAfter,
      difficultyBefore: log.difficultyBefore,
      difficultyAfter: log.difficultyAfter,
      retrievabilityBefore: log.retrievabilityBefore,
      reviewedAt: new Date().toISOString(),
    };
    const existing = this.logs.get(userId) ?? [];
    existing.push(logRow);
    this.logs.set(userId, existing);

    this.progress.set(key(userId, progress.vocabularyId, progress.direction), {
      userId,
      vocabularyId: progress.vocabularyId,
      direction: progress.direction,
      stability: progress.stability,
      difficulty: progress.difficulty,
      retrievability: progress.retrievability,
      dueAt: progress.dueAt,
      lastReviewAt: progress.lastReviewAt,
      reviewCount: progress.reviewCount,
      lapses: progress.lapses,
    });

    const cur = this.profiles.get(userId);
    if (cur) {
      this.profiles.set(userId, {
        ...cur,
        exp: userStats.exp,
        level: userStats.level,
        currentStreak: userStats.currentStreak,
        longestStreak: userStats.longestStreak,
        lastReviewDate: userStats.lastReviewDate,
      });
    }
  }

  // ================= config =================
  async getAppConfig(): Promise<AppConfig> {
    return structuredClone(this.config);
  }

  async setAppConfig(config: AppConfig): Promise<void> {
    this.config = structuredClone(config);
  }

  async getDirectionThresholds(): Promise<Record<Direction, DirectionThreshold>> {
    return structuredClone(this.thresholds);
  }

  async setDirectionThreshold(
    dir: Direction,
    t: Pick<DirectionThreshold, 'fastThresholdMs' | 'goodThresholdMs'>,
  ): Promise<void> {
    this.thresholds[dir] = { direction: dir, fastThresholdMs: t.fastThresholdMs, goodThresholdMs: t.goodThresholdMs };
  }

  // ================= stats =================
  async getActivity(userId: string, days: number): Promise<ActivityDay[]> {
    const since = Date.now() - days * 86400000;
    const byDay = new Map<string, { reviews: number; seconds: number }>();
    for (const l of this.logs.get(userId) ?? []) {
      const ts = new Date(l.reviewedAt).getTime();
      if (ts < since) continue;
      const date = l.reviewedAt.slice(0, 10);
      const cur = byDay.get(date) ?? { reviews: 0, seconds: 0 };
      cur.reviews += 1;
      cur.seconds += Math.min(l.elapsedMs, 30000) / 1000;
      byDay.set(date, cur);
    }
    return [...byDay.entries()].map(([date, v]) => ({ date, reviews: v.reviews, seconds: Math.round(v.seconds) }));
  }

  async getRecentLogs(userId: string, limit = 20): Promise<ReviewLog[]> {
    const logs = this.logs.get(userId) ?? [];
    return [...logs].sort((a, b) => b.reviewedAt.localeCompare(a.reviewedAt)).slice(0, limit);
  }

  async getStudySeconds(userId: string, sinceDays: number): Promise<number> {
    const since = Date.now() - sinceDays * 86400000;
    let total = 0;
    for (const l of this.logs.get(userId) ?? []) {
      if (new Date(l.reviewedAt).getTime() < since) continue;
      total += Math.min(l.elapsedMs, 30000) / 1000;
    }
    return Math.round(total);
  }

  async getDayDetails(userId: string, days: number): Promise<DayDetail[]> {
    const since = Date.now() - days * 86400000;
    const byDay = new Map<string, DayStatsRow>();
    for (const l of this.logs.get(userId) ?? []) {
      const ts = new Date(l.reviewedAt).getTime();
      if (ts < since) continue;
      const date = l.reviewedAt.slice(0, 10);
      const cur = byDay.get(date) ?? { date, seconds: 0, reviews: 0, isNewCount: 0, correctCount: 0, quizExp: 0 };
      cur.reviews += 1;
      cur.seconds += Math.min(l.elapsedMs, 30000) / 1000;
      if (l.isNew) cur.isNewCount += 1;
      if (l.correctness) cur.correctCount += 1;
      byDay.set(date, cur);
    }
    for (const [sessionId, answers] of this.quizSessionAnswers) {
      const session = this.quizSessions.get(sessionId);
      if (!session || session.userId !== userId) continue;
      for (const a of answers) {
        const ts = new Date(a.submittedAt).getTime();
        if (ts < since) continue;
        const date = a.submittedAt.slice(0, 10);
        const cur = byDay.get(date) ?? { date, seconds: 0, reviews: 0, isNewCount: 0, correctCount: 0, quizExp: 0 };
        cur.quizExp += a.expGained;
        byDay.set(date, cur);
      }
    }
    const config = await this.getAppConfig();
    return [...byDay.values()].map((row) => computeDayDetail(row, config.exp));
  }

  // ================= quiz sessions =================
  async createQuizSession(userId: string, deckId: number, mode: QuizMode, totalSessions: number, sessionIndex: number = 0): Promise<QuizSession> {
    // Check if session already exists for this sessionIndex
    for (const session of this.quizSessions.values()) {
      if (session.userId === userId && session.deckId === deckId && session.mode === mode && session.sessionIndex === sessionIndex) {
        return { ...session };
      }
    }
    const now = new Date().toISOString();
    const session: QuizSession = {
      id: this.nextQuizSessionId++,
      userId,
      deckId,
      mode,
      sessionIndex,
      totalSessions,
      status: 'in_progress',
      startedAt: now,
      completedAt: null,
      syncedAt: null,
      totalQuestions: 0,
      correctCount: 0,
      totalExp: 0,
      createdAt: now,
      updatedAt: now,
    };
    this.quizSessions.set(session.id, session);
    return { ...session };
  }

  async getQuizSession(userId: string, deckId: number, mode: QuizMode, sessionIndex: number): Promise<QuizSession | null> {
    for (const session of this.quizSessions.values()) {
      if (session.userId === userId && session.deckId === deckId && session.mode === mode && session.sessionIndex === sessionIndex) {
        return { ...session };
      }
    }
    return null;
  }

  async getQuizSessions(userId: string, deckId: number, mode: QuizMode): Promise<QuizSession[]> {
    return [...this.quizSessions.values()]
      .filter(s => s.userId === userId && s.deckId === deckId && s.mode === mode)
      .sort((a, b) => a.sessionIndex - b.sessionIndex)
      .map(s => ({ ...s }));
  }

  async addQuizSessionAnswers(sessionId: number, answers: QuizAnswerInput[]): Promise<QuizSessionAnswer[]> {
    const sessionAnswers = this.quizSessionAnswers.get(sessionId) ?? [];
    const newAnswers: QuizSessionAnswer[] = answers.map((a, i) => ({
      id: sessionAnswers.length + i + 1,
      sessionId,
      vocabularyId: a.vocabularyId,
      direction: a.direction,
      elapsedMs: a.elapsedMs,
      correct: a.correct,
      answerText: a.answer,
      speedCategory: this.getSpeedCategory(a.elapsedMs),
      expGained: a.correct ? 10 : 0, // simplified
      submittedAt: new Date().toISOString(),
      synced: false,
    }));
    this.quizSessionAnswers.set(sessionId, [...sessionAnswers, ...newAnswers]);
    return newAnswers;
  }

  private getSpeedCategory(elapsedMs: number): 'easy' | 'good' | 'hard' {
    if (elapsedMs <= 8000) return 'easy';
    if (elapsedMs <= 15000) return 'good';
    return 'hard';
  }

  async upsertQuizSessionVocabDetails(sessionId: number, details: Omit<QuizSessionVocabDetail, 'id' | 'sessionId' | 'createdAt' | 'updatedAt'>[]): Promise<void> {
    const existing = this.quizSessionVocabDetails.get(sessionId) ?? [];
    const detailMap = new Map(existing.map(d => [d.vocabularyId, d]));
    for (const detail of details) {
      detailMap.set(detail.vocabularyId, { ...detail, id: 0, sessionId, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as QuizSessionVocabDetail);
    }
    this.quizSessionVocabDetails.set(sessionId, [...detailMap.values()]);
  }

  async completeQuizSession(sessionId: number, correctCount: number, totalExp: number): Promise<void> {
    const session = this.quizSessions.get(sessionId);
    if (session) {
      this.quizSessions.set(sessionId, {
        ...session,
        status: 'completed',
        completedAt: new Date().toISOString(),
        correctCount,
        totalExp,
        updatedAt: new Date().toISOString(),
      });
    }
  }

  async markQuizSessionSynced(sessionId: number): Promise<void> {
    const session = this.quizSessions.get(sessionId);
    if (session) {
      this.quizSessions.set(sessionId, {
        ...session,
        status: 'synced',
        syncedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    // Also mark answers as synced
    const answers = this.quizSessionAnswers.get(sessionId);
    if (answers) {
      this.quizSessionAnswers.set(sessionId, answers.map(a => ({ ...a, synced: true })));
    }
  }

  async getQuizSessionVocabDetails(sessionId: number): Promise<QuizSessionVocabDetail[]> {
    return [...(this.quizSessionVocabDetails.get(sessionId) ?? [])];
  }

  async getLatestInProgressQuizSession(userId: string, deckId: number, mode: QuizMode): Promise<QuizSession | null> {
    const sessions = [...this.quizSessions.values()]
      .filter(s => s.userId === userId && s.deckId === deckId && s.mode === mode && s.status === 'in_progress')
      .sort((a, b) => b.sessionIndex - a.sessionIndex);
    return sessions[0] ? { ...sessions[0] } : null;
  }
}