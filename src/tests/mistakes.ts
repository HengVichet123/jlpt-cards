/* Exam mistakes (v182): a 言語知識 question answered wrong comes back as the question itself, right/wrong only.
   To clear it: right 3 times in a row, on different days (1, 3, 7 days apart). A wrong answer starts it over.
   jc:examq = Miss[]. Pure data: no DOM. */
import { store } from "../data/store";

export type Miss = { test: string; part: number; item: number; level: string; q: string; step: number; due: number };
const KEY = "jc:examq";
export const GAPS = [1, 3, 7];   // days before each of the 3 right answers
const DAY = 86400000;

/** Midnight-ish day start (Anki rolls over at 4 am) + n days. */
function dayPlus(n: number, now = Date.now()): number {
  const d = new Date(now - 4 * 3600000); d.setHours(4, 0, 0, 0);
  return d.getTime() + n * DAY;
}
export const all = () => store.get<Miss[]>(KEY, []);
const save = (L: Miss[]) => (L.length ? store.set(KEY, L) : store.remove(KEY));
const same = (a: Miss, b: Pick<Miss, "test" | "part" | "item">) => a.test === b.test && a.part === b.part && a.item === b.item;

/** A wrong answer in an exam: add the question (or start it over), due tomorrow. */
export function add(m: Pick<Miss, "test" | "part" | "item" | "level" | "q">, now = Date.now()): void {
  save([...all().filter(x => !same(x, m)), { ...m, step: 0, due: dayPlus(GAPS[0], now) }]);
}
/** Answered in review. Returns true when the question is cleared (off the list). */
export function answer(m: Miss, right: boolean, now = Date.now()): boolean {
  const L = all(), x = L.find(y => same(y, m)); if (!x) return false;
  if (!right) { x.step = 0; x.due = dayPlus(GAPS[0], now); save(L); return false; }
  x.step++;
  if (x.step >= GAPS.length) { save(L.filter(y => y !== x)); return true; }
  x.due = dayPlus(GAPS[x.step], now); save(L); return false;
}
export function drop(m: Miss): void { save(all().filter(y => !same(y, m))); }
export const due = (now = Date.now()) => all().filter(x => x.due <= now);
/** Due now, waiting, and days until the next one comes back. */
export function counts(now = Date.now()) {
  const L = all(), d = L.filter(x => x.due <= now).length, later = L.filter(x => x.due > now);
  const next = later.length ? Math.ceil((Math.min(...later.map(x => x.due)) - now) / DAY) : 0;
  return { total: L.length, due: d, waiting: later.length, next };
}
