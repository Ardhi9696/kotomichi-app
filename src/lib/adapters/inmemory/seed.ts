/**
 * Dev seed data — a small curated N5/N4 vocabulary set so the app runs
 * without a real database. Mirrors what an admin would enter via the
 * management UI. Japanese meanings are Indonesian + English.
 */

import type { Deck, WordCard } from '@/lib/domain';
import type { TagWithVocabInput } from '@/lib/ports/db-port';

export interface SeedWord {
  input: TagWithVocabInput;
}

const w = (
  kanji: string | null,
  hiragana: string,
  romaji: string | null,
  jlptLevel: 'N5' | 'N4',
  partOfSpeech: string,
  meanings: { id: string; en: string }[],
  examples: { japanese: string; id: string; en: string }[],
): SeedWord => ({
  input: {
    kanji,
    hiragana,
    romaji,
    jlptLevel,
    partOfSpeech,
    translations: [
      { locale: 'id', meaning: meanings[0].id },
      { locale: 'en', meaning: meanings[0].en },
    ],
    examples: examples.map((e) => ({
      japanese: e.japanese,
      translations: [
        { locale: 'id', translation: e.id },
        { locale: 'en', translation: e.en },
      ],
    })),
  },
});

export const SEED_WORDS: readonly SeedWord[] = [
  w('水', 'みず', 'mizu', 'N5', 'noun', [{ id: 'air', en: 'water' }], [{ japanese: '水を飲みます。', id: 'Saya minum air.', en: 'I drink water.' }]),
  w('食べる', 'たべる', 'taberu', 'N5', 'verb', [{ id: 'makan', en: 'to eat' }], [{ japanese: 'ご飯を食べます。', id: 'Saya makan nasi.', en: 'I eat rice.' }]),
  w('行く', 'いく', 'iku', 'N5', 'verb', [{ id: 'pergi', en: 'to go' }], [{ japanese: '学校へ行きます。', id: 'Saya pergi ke sekolah.', en: 'I go to school.' }]),
  w('見る', 'みる', 'miru', 'N5', 'verb', [{ id: 'melihat', en: 'to look/see' }], [{ japanese: '映画を見ます。', id: 'Saya menonton film.', en: 'I watch a movie.' }]),
  w('大きい', 'おおきい', 'ookii', 'N5', 'adjective', [{ id: 'besar', en: 'big' }], [{ japanese: '大きい犬ですね。', id: 'Anjing yang besar ya.', en: 'What a big dog.' }]),
  w('小さい', 'ちいさい', 'chiisai', 'N5', 'adjective', [{ id: 'kecil', en: 'small' }], [{ japanese: '小さい箱です。', id: 'Ini kotak kecil.', en: 'It is a small box.' }]),
  w('新しい', 'あたらしい', 'atarashii', 'N5', 'adjective', [{ id: 'baru', en: 'new' }], [{ japanese: '新しい車を買いました。', id: 'Saya membeli mobil baru.', en: 'I bought a new car.' }]),
  w('先生', 'せんせい', 'sensei', 'N5', 'noun', [{ id: 'guru', en: 'teacher' }], [{ japanese: '田中先生は親切です。', id: 'Guru Tanaka ramah.', en: 'Teacher Tanaka is kind.' }]),
  w('学生', 'がくせい', 'gakusei', 'N5', 'noun', [{ id: 'murid', en: 'student' }], [{ japanese: '私は学生です。', id: 'Saya murid.', en: 'I am a student.' }]),
  w('学校', 'がっこう', 'gakkō', 'N5', 'noun', [{ id: 'sekolah', en: 'school' }], [{ japanese: '学校に通っています。', id: 'Saya bersekolah.', en: 'I attend school.' }]),
  w('友達', 'ともだち', 'tomodachi', 'N5', 'noun', [{ id: 'teman', en: 'friend' }], [{ japanese: '友達と遊びます。', id: 'Saya bermain dengan teman.', en: 'I play with friends.' }]),
  w('家族', 'かぞく', 'kazoku', 'N5', 'noun', [{ id: 'keluarga', en: 'family' }], [{ japanese: '家族は四人です。', id: 'Keluarga saya berempat.', en: 'My family is four people.' }]),
  w('家', 'いえ', 'ie', 'N5', 'noun', [{ id: 'rumah', en: 'house/home' }], [{ japanese: '家に帰ります。', id: 'Saya pulang ke rumah.', en: 'I go home.' }]),
  w('犬', 'いぬ', 'inu', 'N5', 'noun', [{ id: 'anjing', en: 'dog' }], [{ japanese: '犬が好きです。', id: 'Saya suka anjing.', en: 'I like dogs.' }]),
  w('猫', 'ねこ', 'neko', 'N5', 'noun', [{ id: 'kucing', en: 'cat' }], [{ japanese: '猫を飼っています。', id: 'Saya memelihara kucing.', en: 'I keep a cat.' }]),
  w('本', 'ほん', 'hon', 'N5', 'noun', [{ id: 'buku', en: 'book' }], [{ japanese: '本を読みます。', id: 'Saya membaca buku.', en: 'I read a book.' }]),
  w('日本語', 'にほんご', 'nihongo', 'N5', 'noun', [{ id: 'bahasa Jepang', en: 'Japanese (language)' }], [{ japanese: '日本語を勉強しています。', id: 'Saya belajar bahasa Jepang.', en: 'I study Japanese.' }]),
  w('漢字', 'かんじ', 'kanji', 'N5', 'noun', [{ id: 'kanji', en: 'kanji characters' }], [{ japanese: '漢字を書きます。', id: 'Saya menulis kanji.', en: 'I write kanji.' }]),
  w('書く', 'かく', 'kaku', 'N5', 'verb', [{ id: 'menulis', en: 'to write' }], [{ japanese: '名前を書いてください。', id: 'Tolong tulis nama.', en: 'Please write your name.' }]),
  w('読む', 'よむ', 'yomu', 'N5', 'verb', [{ id: 'membaca', en: 'to read' }], [{ japanese: '新聞を読みます。', id: 'Saya membaca koran.', en: 'I read the newspaper.' }]),
  w('聞く', 'きく', 'kiku', 'N5', 'verb', [{ id: 'mendengar/menanyakan', en: 'to listen/ask' }], [{ japanese: '音楽を聞きます。', id: 'Saya mendengarkan musik.', en: 'I listen to music.' }]),
  w('話す', 'はなす', 'hanasu', 'N5', 'verb', [{ id: 'berbicara', en: 'to speak' }], [{ japanese: '日本語を話します。', id: 'Saya berbicara bahasa Jepang.', en: 'I speak Japanese.' }]),
  w('作る', 'つくる', 'tsukuru', 'N5', 'verb', [{ id: 'membuat', en: 'to make' }], [{ japanese: '料理を作ります。', id: 'Saya memasak.', en: 'I cook (make a meal).' }]),
  w('買う', 'かう', 'kau', 'N5', 'verb', [{ id: 'membeli', en: 'to buy' }], [{ japanese: 'パンを買います。', id: 'Saya membeli roti.', en: 'I buy bread.' }]),
  w('電車', 'でんしゃ', 'densha', 'N5', 'noun', [{ id: 'kereta listrik', en: 'train' }], [{ japanese: '電車で行きます。', id: 'Saya pergi naik kereta.', en: 'I go by train.' }]),
  w('駅', 'えき', 'eki', 'N5', 'noun', [{ id: 'stasiun', en: 'station' }], [{ japanese: '駅まで歩きます。', id: 'Saya berjalan ke stasiun.', en: 'I walk to the station.' }]),
  w('時間', 'じかん', 'jikan', 'N5', 'noun', [{ id: 'waktu', en: 'time' }], [{ japanese: '時間がありません。', id: 'Saya tidak punya waktu.', en: 'I have no time.' }]),
  w('今日', 'きょう', 'kyō', 'N5', 'noun', [{ id: 'hari ini', en: 'today' }], [{ japanese: '今日は暑いです。', id: 'Hari ini panas.', en: 'It is hot today.' }]),
  w('明日', 'あした', 'ashita', 'N5', 'noun', [{ id: 'besok', en: 'tomorrow' }], [{ japanese: '明日は休みます。', id: 'Besok saya libur.', en: 'Tomorrow I rest.' }]),
  w('働く', 'はたらく', 'hataraku', 'N5', 'verb', [{ id: 'bekerja', en: 'to work' }], [{ japanese: '会社で働きます。', id: 'Saya bekerja di kantor.', en: 'I work at a company.' }]),
];

export interface SeedDeck {
  deck: Deck;
  wordIndexes: number[]; // indexes into SEED_WORDS
}

export const SEED_DECKS: readonly SeedDeck[] = [
  {
    deck: {
      id: 101,
      title: 'Kata Kerja Dasar',
      subtitle: 'Verba harian N5',
      jlptLevel: 'N5',
      orderIndex: 0,
      isPublished: true,
      createdBy: '00000000-0000-0000-0000-000000000001',
      createdAt: new Date(0).toISOString(),
      updatedAt: new Date(0).toISOString(),
    },
    wordIndexes: [1, 2, 3, 4, 18, 19, 20, 21, 22, 23, 29],
  },
  {
    deck: {
      id: 102,
      title: 'Kata Benda Sehari-hari',
      subtitle: 'Nomina sekitar kita',
      jlptLevel: 'N5',
      orderIndex: 1,
      isPublished: true,
      createdBy: '00000000-0000-0000-0000-000000000001',
      createdAt: new Date(0).toISOString(),
      updatedAt: new Date(0).toISOString(),
    },
    wordIndexes: [0, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 24, 25, 26, 27, 28],
  },
  {
    deck: {
      id: 103,
      title: 'Kata Sifat N5',
      subtitle: 'Adjektiva dasar',
      jlptLevel: 'N5',
      orderIndex: 2,
      isPublished: true,
      createdBy: '00000000-0000-0000-0000-000000000001',
      createdAt: new Date(0).toISOString(),
      updatedAt: new Date(0).toISOString(),
    },
    wordIndexes: [4, 5, 6],
  },
];

/** Seed WordCard objects (vocab 1..N) plus the demo deck list. */
export function buildSeedDocs(): {
  words: WordCard[];
  decks: Deck[];
  deckMembership: Map<number, number[]>;
} {
  const words: WordCard[] = SEED_WORDS.map((s, i) => {
    const id = i + 1;
    const vocab = {
      id,
      kanji: s.input.kanji ?? null,
      hiragana: s.input.hiragana,
      romaji: s.input.romaji ?? null,
      jlptLevel: s.input.jlptLevel ?? null,
      partOfSpeech: s.input.partOfSpeech ?? null,
      isActive: true,
    };
    const translations: Record<string, string> = {};
    for (const t of s.input.translations) translations[t.locale] = t.meaning;
    const examples = (s.input.examples ?? []).map((e, j) => ({
      id: id * 100 + j + 1,
      vocabularyId: id,
      japanese: e.japanese,
      translations: e.translations,
    }));
    const collocations = (s.input.collocations ?? []).map((c, j) => ({
      id: id * 1000 + j + 1,
      vocabularyId: id,
      collocation: c.collocation,
      meaning: c.meaning ?? null,
    }));
    return {
      vocabulary: vocab,
      translations,
      examples,
      collocations,
      audioKey: null,
    };
  });

  const decks = [...SEED_DECKS].map((d) => ({ ...d.deck }));
  const deckMembership = new Map<number, number[]>();
  for (const d of SEED_DECKS) deckMembership.set(d.deck.id, [...d.wordIndexes]);

  return { words, decks, deckMembership };
}