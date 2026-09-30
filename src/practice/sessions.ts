/* Saved Practice sessions ("decks"): every started session is kept until all its cards are done. */
import { store, K } from "../data/store";
import { profile, type CardRef } from "./srs";

export type Session = {
  id: string; name: string; label: string; start: number; at: number;
  level: string; from: string; section?: string; reading?: string;
  ids: CardRef[]; done?: string[];
};
export type PracticeState = { level: string; n: { words: number; kanji: number; grammar: number }; ids: CardRef[];
  from?: string; section?: string; reading?: string; sid?: string };

const MAX = 30;
const key = ([lvl, t, no]: CardRef) => `${lvl}:${t}:${no}`;

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
export const drop = (id: string) => store.set(K.sessions, list().filter(x => x.id !== id));

/** Mark a card done in the running session (after Easy). */
export function markDone(ref: CardRef): void {
  const sid = state().sid, se = sid && list().find(x => x.id === sid);
  if (se) { se.done = [...new Set([...(se.done || []), key(ref)])]; se.at = Date.now(); save(se); }
}

/** Anki-style counts: New = never reviewed, Learn = seen but coming back soon, Due = review time has come. */
export function counts(se: Session, now = Date.now()): { n: number; l: number; d: number } {
  const done = new Set(se.done || []); let n = 0, l = 0, d = 0;
  for (const r of se.ids) { if (done.has(key(r))) continue;
    const p = profile(r[0], r[1], r[2]); if (!p.reviews) n++; else if ((p.dueAt || 0) > now) l++; else d++; }
  return { n, l, d };
}
