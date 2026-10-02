/* Practice scheduling, Anki style (SM-2): New → Learning steps → Review with a growing interval (× ease).
   Again on a review card = a lapse (relearning, ease −20); enough lapses = a leech ("struggling").
   Every number is editable (Practice → Edit, saved in jc:srs). Pure data: no DOM. */
import { store, K } from "../data/store";

export type Level = string;                       // "N1" | "N2"
export type CardType = "words" | "kanji" | "grammar";
export type CardRef = [Level, CardType, number];  // [level, type, card number]
export type State = "new" | "learning" | "review" | "relearning";
export type Profile = {
  familiarity: number; reviews: number; correct: number; incorrect: number; dueAt: number;   // (kept for older screens)
  state?: State; step?: number; ivl?: number; ease?: number; lapses?: number;                // Anki fields (ivl in days)
};

/** Buttons. */
export const AGAIN = 1, HARD = 2, GOOD = 3, EASY = 4;
export const BUTTONS: [number, string][] = [[AGAIN, "Again"], [HARD, "Hard"], [GOOD, "Good"], [EASY, "Easy"]];

/** Anki's default deck options. */
export type Settings = { steps: number[]; gradIvl: number; easyIvl: number; relearn: number[]; ease0: number; easyBonus: number; hardIvl: number; leech: number; mature: number };
export const DEFAULTS: Settings = { steps: [1, 10], gradIvl: 1, easyIvl: 4, relearn: [10], ease0: 2.5, easyBonus: 1.3, hardIvl: 1.2, leech: 8, mature: 21 };
export const settings = (): Settings => ({ ...DEFAULTS, ...store.get<Partial<Settings>>("jc:srs", {}) });
export const saveSettings = (s: Partial<Settings>) => store.set("jc:srs", { ...settings(), ...s });
export const resetSettings = () => store.remove("jc:srs");

const MIN = 60000, DAY = 1440 * MIN;

/* Progress is read for thousands of cards when Practice lists the plan; keep what was read (only rate/undo change it). */
const CACHE = new Map<string, Profile>();
function raw(lvl: Level, t: string, no: number): Profile {
  const key = K.profile(lvl, t, no), hit = CACHE.get(key);
  if (hit) return hit;
  const oldDue = store.get<number | null>(K.due(lvl, t, no), null);
  const p = store.get<Profile>(key, { familiarity: 0, reviews: 0, correct: 0, incorrect: 0, dueAt: oldDue || 0 });
  CACHE.set(key, p); return p;
}
/** A card's progress, with the Anki fields filled in (older progress becomes Review with a 1-day interval). */
export function profile(lvl: Level, t: string, no: number): Profile {
  const p = { ...raw(lvl, t, no) };
  if (!p.state) {
    if (!p.reviews) Object.assign(p, { state: "new", step: 0, ivl: 0, ease: settings().ease0, lapses: 0 });
    else Object.assign(p, { state: "review", step: 0, ivl: 1, ease: settings().ease0, lapses: 0 });
  }
  return p;
}

/** Where the card goes for each button (pure: returns the new progress). */
export function schedule(p0: Profile, btn: number, now = Date.now(), s = settings()): Profile {
  const p: Profile = { ...p0 }, steps = p.state === "relearning" ? s.relearn : s.steps;
  const at = (mins: number) => now + Math.round(mins * MIN);
  const toReview = (ivl: number) => { p.state = "review"; p.step = 0; p.ivl = Math.max(1, Math.round(ivl)); p.dueAt = now + p.ivl * DAY; };
  p.reviews = (p.reviews || 0) + 1;
  if (btn === AGAIN) p.incorrect = (p.incorrect || 0) + 1; else p.correct = (p.correct || 0) + 1;
  if (p.state === "new" || p.state === "learning" || p.state === "relearning") {
    const relearn = p.state === "relearning";
    if (p.state === "new") p.state = "learning";
    const step = p.step || 0;
    if (btn === AGAIN) { p.step = 0; p.dueAt = at(steps[0] ?? 1); }
    else if (btn === HARD) { p.dueAt = at(step === 0 && steps.length > 1 ? (steps[0] + steps[1]) / 2 : steps[step] ?? steps[0] ?? 1); }
    else if (btn === GOOD) { if (step + 1 < steps.length) { p.step = step + 1; p.dueAt = at(steps[step + 1]); } else toReview(relearn ? Math.max(1, p.ivl || 1) : s.gradIvl); }
    else toReview(relearn ? Math.max(1, (p.ivl || 1) + 1) : s.easyIvl);
  } else {   // review
    const ivl = p.ivl || 1, ease = p.ease || s.ease0;
    if (btn === AGAIN) {
      p.lapses = (p.lapses || 0) + 1; p.ease = Math.max(1.3, ease - 0.2); p.ivl = 1;
      if (s.relearn.length) { p.state = "relearning"; p.step = 0; p.dueAt = at(s.relearn[0]); } else toReview(1);
    }
    else if ((p0.dueAt || 0) > now) {   // reviewed ahead (Anki's early review): grow from the days actually waited, never below the old interval
      const waited = Math.max(0, ivl - ((p0.dueAt || 0) - now) / DAY);
      if (btn === HARD) { p.ease = Math.max(1.3, ease - 0.15); toReview(Math.max(waited * s.hardIvl, ivl * s.hardIvl / 2)); }
      else if (btn === GOOD) toReview(Math.max(waited * ease, ivl));
      else { p.ease = ease + 0.15; toReview(Math.max(waited * ease, ivl) * (s.easyBonus - (s.easyBonus - 1) / 2)); }
    }
    else if (btn === HARD) { p.ease = Math.max(1.3, ease - 0.15); toReview(Math.max(ivl + 1, ivl * s.hardIvl)); }
    else if (btn === GOOD) toReview(Math.max(ivl + 1, ivl * ease));
    else { p.ease = ease + 0.15; toReview(Math.max(ivl + 1, ivl * ease * s.easyBonus)); }
  }
  // familiarity 0-5 for the familiarity bars on cards
  p.familiarity = p.state === "review" ? ((p.ivl || 0) >= 90 ? 5 : (p.ivl || 0) >= s.mature ? 4 : (p.ivl || 0) >= 7 ? 3 : 2) : 1;
  return p;
}

/** When each button would bring the card back, as a short label (1m, 10m, 1d, 4d, 1.5mo, 2y). */
export const whenLabel = (ms: number) => { const m = Math.max(1, Math.round(ms / MIN));
  if (m < 60) return `${m}m`; if (m < 1440) return `${Math.round(m / 60)}h`;
  const d = m / 1440; if (d < 30) return `${Math.round(d)}d`; if (d < 365) return `${Math.round(d / 30 * 10) / 10}mo`; return `${Math.round(d / 365 * 10) / 10}y`; };
export function previews(lvl: Level, t: string, no: number, now = Date.now()): Record<number, string> {
  const p = profile(lvl, t, no), out: Record<number, string> = {};
  for (const [b] of BUTTONS) out[b] = whenLabel(schedule(p, b, now).dueAt - now);
  return out;
}

/** Apply a button and save it. Returns the new progress. */
export function rate(lvl: Level, t: string, no: number, btn: number, now = Date.now()): Profile {
  const p = schedule(profile(lvl, t, no), btn, now);
  store.set(K.profile(lvl, t, no), p);
  store.set(K.due(lvl, t, no), p.dueAt);
  CACHE.set(K.profile(lvl, t, no), { ...p });
  return p;
}

/** Anki's words for where a card is: new, learning (incl. relearning), young / mature review, and leech (struggling). */
export type Status = "new" | "learning" | "young" | "mature" | "leech";
export function status(p: Profile, s = settings()): Status {
  if (!p.reviews || p.state === "new") return "new";
  if ((p.lapses || 0) >= s.leech) return "leech";
  if (p.state === "learning" || p.state === "relearning") return "learning";
  return (p.ivl || 0) >= s.mature ? "mature" : "young";
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
  for (const k of [K.profile(lvl, t, no), K.due(lvl, t, no), K.sessions, K.pg, "jc:mistakes"]) snap.v[k] = store.raw(k);
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
