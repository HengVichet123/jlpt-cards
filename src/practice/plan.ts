/* Learning plan: the order to learn cards in (data/order.json: words by theme, kanji by frequency, grammar by list)
   and how it is cut into days. Card numbers never change; only the order does. */
import type { CardRef, CardType } from "./srs";

export type Level = "N1" | "N2";
export type Order = Record<Level, Record<CardType, number[]>>;
/** Words per day. Kanji and grammar are spread over the same number of days. N2 is review (mostly known), so bigger days. */
export const WORDS_PER_DAY: Record<Level, number> = { N1: 50, N2: 150 };
const TYPES: CardType[] = ["words", "kanji", "grammar"];

let ORDER: Order | null = null, loading: Promise<Order> | null = null;
export function loadOrder(): Promise<Order> {
  if (ORDER) return Promise.resolve(ORDER);
  return loading ||= fetch("data/order.json", { cache: "no-cache" }).then(r => r.json()).then(o => (ORDER = o));
}

/** Cards of one level in learning order (cards missing from the order keep their place at the end). */
export function inOrder<C extends { no: number }>(cards: C[], nos: number[]): C[] {
  const rank = new Map(nos.map((n, i) => [n, i]));
  return [...cards].sort((a, b) => (rank.get(a.no) ?? 1e9 + a.no) - (rank.get(b.no) ?? 1e9 + b.no));
}

/** The days of a level: each day = its words, kanji and grammar, in order. */
export function days(o: Order, lv: Level): CardRef[][] {
  const n = Math.ceil(o[lv].words.length / WORDS_PER_DAY[lv]), out: CardRef[][] = [];
  for (let d = 0; d < n; d++) {
    const day: CardRef[] = [];
    for (const t of TYPES) {
      const list = o[lv][t], per = Math.ceil(list.length / n);
      for (const no of list.slice(d * per, (d + 1) * per)) day.push([lv, t, no]);
    }
    out.push(day);
  }
  return out;
}
