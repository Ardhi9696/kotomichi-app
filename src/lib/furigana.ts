/**
 * Furigana bracket-format helpers.
 *
 * Supported bracket conventions
 * ─────────────────────────────
 *  Mono ruby   : [大[おお]][雨[あめ]]       — one reading per kanji char
 *  Group ruby  : [大人[おとな]]              — one reading for the group
 *  Mixed kana  : [知[し]]り[合[あ]]い        — kana chars are left as-is
 *
 * Storage is always bracket text.  The helpers here convert between that
 * representation and the compact arrays the UI uses for editing.
 */

export type FuriganaMode = 'mono' | 'group';

/* ────────────────────────── parse ────────────────────────── */

interface ParsedFurigana {
  kanji: string[];
  furigana: string[];
}

/** Regex that matches a bracket pair `[char[reading]]` (greedy). */
const BRACKET_RE = /\[([^\]]*?)\[([^\]]*?)\]\]/g;

/**
 * Parse a stored bracket-format string back into separate kanji / furigana
 * arrays.  Kana characters that appear between brackets are included in
 * neither array — they are reconstructed during `toBracketFurigana`.
 *
 * Example: `"[知[し]]り[合[あ]]い"` → `{ kanji: ["知","合"], furigana: ["し","あ"] }`
 */
export function parseFuriganaBracket(bracket: string): ParsedFurigana {
  const kanji: string[] = [];
  const furigana: string[] = [];

  let m: RegExpExecArray | null;
  while ((m = BRACKET_RE.exec(bracket)) !== null) {
    kanji.push(m[1]);
    furigana.push(m[2]);
  }
  return { kanji, furigana };
}

/**
 * Auto-detect whether a parsed furigana set is mono or group.
 *
 * - mono  → every kanji character has its own reading
 * - group → all kanji share one reading
 */
export function detectFuriganaMode(
  kanjiCount: number,
  furiganaCount: number,
): FuriganaMode {
  return furiganaCount === 1 || furiganaCount < kanjiCount ? 'group' : 'mono';
}

/* ────────────────────────── build ────────────────────────── */

const CJK_RE = /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/;

/** Return only the kanji characters from a word (strip kana). */
export function kanjiOnly(word: string): string {
  return [...word].filter((ch) => CJK_RE.test(ch)).join('');
}

/**
 * Reconstruct the full visible word (including kana) from a bracket string by
 * dropping the bracket pairs and keeping every base character and inserted
 * kana in order.
 *
 * Example: `"お[土[み]][産[やげ]]"` → `"お土産"`
 *          `"[知[し]]り[合[あ]]い"` → `"知り合い"`
 */
export function extractBracketWord(bracket: string): string {
  return bracket.replace(BRACKET_RE, (_m, kanji: string) => kanji);
}

/**
 * Convert form-level data into the bracket storage format.
 *
 * @param mode     mono or group
 * @param word     the full word (may contain kana)
 * @param furigana array of readings — length must match kanji count (mono)
 *                  or be exactly 1 (group)
 * @returns        bracket-format string, or `null` when no readings supplied
 */
export function toBracketFurigana(
  mode: FuriganaMode,
  word: string,
  furigana: string[],
): string | null {
  const trimmed = furigana.map((s) => s.trim()).filter((s) => s.length > 0);
  if (trimmed.length === 0) return null;

  const chars = [...word];
  const kanjiChars = chars.filter((ch) => CJK_RE.test(ch));
  if (kanjiChars.length === 0) return null;

  if (mode === 'group') {
    const reading = trimmed[0];
    const group = kanjiChars.join('');
    let result = '';
    let ki = 0;
    for (const ch of chars) {
      if (CJK_RE.test(ch)) {
        if (ki === 0) result += `[${group}[${reading}]]`;
        ki++;
      } else {
        result += ch;
      }
    }
    return result;
  }

  /* mono */
  let ki = 0;
  let result = '';
  for (const ch of chars) {
    if (CJK_RE.test(ch)) {
      const r = trimmed[ki] ?? '';
      result += `[${ch}[${r}]]`;
      ki++;
    } else {
      result += ch;
    }
  }
  return result;
}
