/* Answers in a JLPT-style test are kept until it is finished or started over;
   reopening lands on the first unanswered question. Scores: jc:<kind>:<id> = {best, last, at}. */
import { store, K } from "../data/store";

export type Kind = "lsn" | "rdt" | "voc";
export type Picked = number[] | number[][];   // 0 = not answered, else the chosen option (1-based)

/** Saved answers, only if they still fit the test (tests can be edited). */
export function load<T extends Picked>(kind: Kind, id: string, fresh: T): T {
  const v = store.get<unknown>(K.quiz(kind, id), null);
  const same = Array.isArray(v) && v.length === fresh.length &&
    v.every((x, k) => Array.isArray(fresh[k]) ? Array.isArray(x) && x.length === (fresh[k] as number[]).length : typeof x === "number");
  return (same ? v : fresh) as T;
}
export const save = (kind: Kind, id: string, picked: Picked) => store.set(K.quiz(kind, id), picked);
export const clear = (kind: Kind, id: string) => store.remove(K.quiz(kind, id));
/** First screen with an unanswered question (last screen when all are answered). */
export const firstOpen = (screens: number[][]) => { const k = screens.findIndex(a => a.some(x => !x)); return k < 0 ? Math.max(0, screens.length - 1) : k; };
export const anyAnswered = (picked: Picked) => (picked as (number | number[])[]).flat().some(Boolean);

export type Score = { best: number; last: number; at: number };
export const score = (kind: Kind, id: string) => store.get<Score | null>(K.best(kind, id), null);
export function saveScore(kind: Kind, id: string, right: number): void {
  const r = store.get<{ best?: number }>(K.best(kind, id), { best: 0 });
  store.set(K.best(kind, id), { best: Math.max(r.best || 0, right), last: right, at: Date.now() });
}
export const seen = (kind: Kind, id: string) => !!store.get(K.seen(kind, id), 0);
export const markSeen = (kind: Kind, id: string) => store.set(K.seen(kind, id), Date.now());

/* Exam mode (JLPT format, timed): results kept apart from practice. jc:exam:<kind>:<id> = {best, last (percent), at, time (s)} */
export type ExamResult = { best: number; last: number; at: number; time: number };
const examKey = (kind: Kind, id: string) => `jc:exam:${kind}:${id}`;
export const examScore = (kind: Kind, id: string) => store.get<ExamResult | null>(examKey(kind, id), null);
export function saveExam(kind: Kind, id: string, pct: number, time: number): void {
  const r = examScore(kind, id);
  store.set(examKey(kind, id), { best: Math.max(r?.best || 0, pct), last: pct, at: Date.now(), time });
}
/** Seconds allowed in exam mode (JLPT pace). Listening has no clock: each recording plays once. */
export const examLimit = (kind: Kind, questions: number) => kind === "voc" ? questions * 60 : kind === "rdt" ? questions * 150 : 0;
export const PASS = 55;   // JLPT N1 pass line ≈ 100 / 180
