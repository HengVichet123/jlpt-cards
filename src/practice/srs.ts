/* Practice review logic (spaced repetition): card progress, ratings, due times, undo.
   Pure data: no DOM. Same rules and storage as the single-file app (v153). */
import { store, K } from "../data/store";

export type Level = string;                       // "N1" | "N2"
export type CardType = "words" | "kanji" | "grammar";
export type CardRef = [Level, CardType, number];  // [level, type, card number]

export type Profile = { familiarity: number; reviews: number; correct: number; incorrect: number; dueAt: number };

/** Rating buttons: minutes until the card comes back. */
export const AGAIN = 3, HARD = 10, EASY = 1440;

/* Progress is read for thousands of cards when Practice lists the plan; keep what was read (only rate/undo change it). */
const CACHE = new Map<string, Profile>();
export function profile(lvl: Level, t: string, no: number): Profile {
  const key = K.profile(lvl, t, no), hit = CACHE.get(key);
  if (hit) return { ...hit };
  const oldDue = store.get<number | null>(K.due(lvl, t, no), null);
  const p = store.get<Profile>(key, { familiarity: 0, reviews: 0, correct: 0, incorrect: 0, dueAt: oldDue || 0 });
  CACHE.set(key, p); return { ...p };
}

/** Apply a rating (minutes: AGAIN / HARD / EASY) and save it. Returns the new profile. */
export function rate(lvl: Level, t: string, no: number, minutes: number, now = Date.now()): Profile {
  const p = profile(lvl, t, no);
  p.reviews += 1;
  if (minutes === AGAIN) { p.incorrect += 1; p.familiarity = Math.max(0, p.familiarity - 1); }
  else { p.correct += 1; p.familiarity = Math.min(5, p.familiarity + (minutes === EASY ? 2 : 1)); }
  p.dueAt = now + minutes * 60000;
  store.set(K.profile(lvl, t, no), p);
  store.set(K.due(lvl, t, no), p.dueAt);
  CACHE.set(K.profile(lvl, t, no), { ...p });
  return p;
}

/* ---- due cards ---- */
function dueTimes(): [string, number][] {
  return store.keys("jc:due:").map(k => [k, +(store.raw(k) ?? 0)]);
}
/** Cards whose review time has come (at most `max`). */
export function dueIds(max = 50, now = Date.now()): CardRef[] {
  const ids: CardRef[] = [];
  for (const [k, t] of dueTimes()) if (t <= now) { const [, , lvl, type, no] = k.split(":"); ids.push([lvl, type as CardType, +no]); }
  return ids.slice(0, max);
}
/** How many cards are due now and how many come back later. */
export function dueCounts(now = Date.now()): { due: number; later: number } {
  let due = 0, later = 0;
  for (const [, t] of dueTimes()) if (t <= now) due++; else later++;
  return { due, later };
}
/** Minutes until the next card comes back (Infinity when none). */
export function minutesToNext(now = Date.now()): number {
  let min = Infinity;
  for (const [, t] of dueTimes()) if (t > now && t < min) min = t;
  return isFinite(min) ? Math.round((min - now) / 60000) : Infinity;
}

/* ---- undo: each rating remembers what it changed (progress, due time, sessions) ---- */
type Snap = { sid: string | undefined; v: Record<string, string | null> };
const UNDO: Snap[] = [];
export function snapshot(lvl: Level, t: string, no: number, sid: string | undefined): void {
  const snap: Snap = { sid, v: {} };
  for (const k of [K.profile(lvl, t, no), K.due(lvl, t, no), K.sessions]) snap.v[k] = store.raw(k);
  UNDO.push(snap); if (UNDO.length > 30) UNDO.shift();
}
export const canUndo = (sid: string | undefined) => UNDO.length > 0 && UNDO[UNDO.length - 1].sid === sid;
/** Put back the last rating of this session. False when there is nothing to undo. */
export function undo(sid: string | undefined): boolean {
  if (!canUndo(sid)) return false;
  for (const [k, v] of Object.entries(UNDO.pop()!.v)) store.setRaw(k, v);
  CACHE.clear();
  return true;
}
