export type ActivityLabel =
  | { kind: 'online' }
  | { kind: 'minutesAgo'; count: number }
  | { kind: 'date'; date: string };

/** Users seen within this window are considered "online". */
export const ONLINE_WINDOW_MS = 2 * 60_000;
/** After an hour we stop showing "N minutes ago". */
const MINUTES_WINDOW = 60;

const toDate = (iso: string | Date): string => {
  if (typeof iso === 'string') return iso.slice(0, 16).replace('T', ' ');
  return iso.toISOString().slice(0, 16).replace('T', ' ');
};

export function formatLastActive(iso?: string | null, now: number = Date.now()): ActivityLabel | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return { kind: 'date', date: toDate(iso) };
  const diffMin = Math.floor((now - t) / 60_000);
  if (diffMin < 2) return { kind: 'online' };
  if (diffMin < MINUTES_WINDOW) return { kind: 'minutesAgo', count: diffMin };
  return { kind: 'date', date: toDate(iso) };
}