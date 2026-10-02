/* Saved Practice sessions ("decks"): every started session is kept until all its cards are done. */
import { store, K } from "../data/store";
import { profile, type CardRef } from "./srs";

export type Session = {
  id: string; name: string; label: string; start: number; at: number;
  level: string; from: string; section?: string; reading?: string;
  ids: CardRef[]; done?: string[];
};
export type PracticeState = { level: string; n: { words: number; kanji: number; grammar: number }; ids: CardRef[];
  from?: string; section?: string; reading?: string; sid?: string; ahead?: string[] };

const MAX = 30;
export const key = ([lvl, t, no]: CardRef) => `${lvl}:${t}:${no}`;

export const state = (): PracticeState => store.get(K.pg, { level: "ALL", n: { words: 10, kanji: 5, grammar: 2 }, ids: [] });
export const setState = (st: PracticeState) => store.set(K.pg, st);

export const list = (): Session[] => store.get(K.sessions, []);
export const todo = (se: Session) => se.ids.filter(r => !(se.done || []).includes(key(r)));   // Easy = done for this session
export const left = (se: Session) => todo(se).length;
export const open = () => list().filter(se => left(se) > 0);
export const name = (se: Session) => se.name || se.label;

export function save(se: Session): void {
  const all = list(), i = all.findIndex(x => x.id === se.id);
  if (i >= 0) all[i] = se; else all.unshift(se);
  all.sort((a, b) => (b.at || 0) - (a.at || 0));
  store.set(K.sessions, all.slice(0, MAX));
}
/** Write the whole list as is (rename / undo delete keep the current order). */
export const saveAll = (all: Session[]) => store.set(K.sessions, all);
export const drop = (id: string) => store.set(K.sessions, list().filter(x => x.id !== id));

/** Mark a card done in the running session (after Easy). */
export function markDone(ref: CardRef): void {
  const sid = state().sid, se = sid && list().find(x => x.id === sid);
  if (se) { se.done = [...new Set([...(se.done || []), key(ref)])]; se.at = Date.now(); save(se); }
}

/* Anki's queues for one session, used by both the session row and the run, so the numbers always match.
   New = never studied. Learn = in learning steps today (counted even while it waits). Due = review cards whose day has come.
   Order (Anki): learning cards whose time has come, then reviews, then new. When none is ready, Anki "learns ahead":
   the soonest waiting learning card is shown now instead of ending the session.
   `ahead` = Review ahead (Anki Custom study): review cards scheduled for later days are pulled in as Due. */
export type Queue = { n: CardRef[]; learn: CardRef[]; wait: CardRef[]; d: CardRef[] };
export function queue(ids: CardRef[], done: string[] = [], now = Date.now(), ahead: string[] = []): Queue {
  const skip = new Set(done), early = new Set(ahead), q: Queue = { n: [], learn: [], wait: [], d: [] };
  const at = new Map<CardRef, number>();
  for (const r of ids) { const k = key(r), p = profile(r[0], r[1], r[2]), due = p.dueAt || 0;
    if (skip.has(k) && !early.has(k) && p.state === "review") continue;   // graduated in this session (a lapse brings it back)
    if (!p.reviews || p.state === "new") q.n.push(r);
    else if (p.state === "learning" || p.state === "relearning") { if (due - now < 86400000) { at.set(r, due); (due <= now ? q.learn : q.wait).push(r); } }
    else if (due <= now || early.has(k)) q.d.push(r); }
  const soon = (a: CardRef, b: CardRef) => at.get(a)! - at.get(b)!;
  q.learn.sort(soon); q.wait.sort(soon);
  return q;
}
/** The card to show now: due learning → due review → new → (learn ahead) the soonest waiting learning card. */
export const next = (q: Queue): CardRef | undefined => q.learn[0] || q.d[0] || q.n[0] || q.wait[0];
/** Review cards of these ids scheduled for later days (soonest first), for Review ahead. */
export function later(ids: CardRef[], now = Date.now()): CardRef[] {
  return ids.map(r => [r, profile(r[0], r[1], r[2])] as const).filter(([, p]) => p.reviews && p.state === "review" && (p.dueAt || 0) > now)
    .sort((a, b) => (a[1].dueAt || 0) - (b[1].dueAt || 0)).map(([r]) => r);
}

/** Anki-style counts: New / Learn / Due (the same queues the run uses). */
export function counts(se: Session, now = Date.now()): { n: number; l: number; d: number } {
  const q = queue(se.ids, se.done, now);
  return { n: q.n.length, l: q.learn.length + q.wait.length, d: q.d.length };
}
