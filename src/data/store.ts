/* The one place the app reads and writes saved data (browser localStorage, keys "jc:*").
   Key names are unchanged from the single-file app, so existing progress carries over as is.
   Later (migration step 4) this module is where account sync plugs in: exportAll / importAll. */

export type Json = null | boolean | number | string | Json[] | { [k: string]: Json };

const PREFIX = "jc:";

function safe<T>(fn: () => T, fallback: T): T {
  try { return fn(); } catch { return fallback; }   // private mode / blocked storage: behave as empty
}

export const store = {
  /** Parsed value, or `d` when missing, empty or unreadable (same rules as before v154). */
  get<T = any>(k: string, d?: T): T {
    return safe(() => { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; }, d as T);
  },
  set(k: string, v: unknown): void {
    safe(() => localStorage.setItem(k, JSON.stringify(v)), undefined);
  },
  remove(k: string): void {
    safe(() => localStorage.removeItem(k), undefined);
  },
  /** Raw string (for undo snapshots that must restore byte-for-byte). null = missing. */
  raw(k: string): string | null {
    return safe(() => localStorage.getItem(k), null);
  },
  /** Put back a raw string; null removes the key. */
  setRaw(k: string, v: string | null): void {
    safe(() => (v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v)), undefined);
  },
  /** Every saved key that starts with `prefix`. */
  keys(prefix = PREFIX): string[] {
    return safe(() => {
      const out: string[] = [];
      for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith(prefix)) out.push(k); }
      return out;
    }, []);
  },
};

/* Key builders: one name per kind of saved data. */
export const K = {
  due: (lvl: string, t: string, no: number | string) => `jc:due:${lvl}:${t}:${no}`,          // SRS: time the card is due (ms)
  profile: (lvl: string, t: string, no: number | string) => `jc:profile:${lvl}:${t}:${no}`,  // SRS: reviews, correct, familiarity…
  quiz: (kind: string, id: string) => `jc:prog:${kind}:${id}`,        // answers in an unfinished test
  best: (kind: string, id: string) => `jc:${kind}:${id}`,             // best / last score of a finished test
  seen: (kind: string, id: string) => `jc:seen:${kind}:${id}`,        // test opened at least once
  testLevel: (kind: string) => `jc:tlv:${kind}`,                      // N1 / N2 tab of a test list
  pg: "jc:pg",                 // current Practice setup + running session id
  sessions: "jc:sessions",     // saved Practice sessions
  shelfOrder: "jc:shelforder", // Reading sections order
  bookmarks: "jc:bookmarks",   // Complete list bookmarks [{k, t, lv, no, word, at}]
} as const;

/* What each family of keys holds. Used for export/sync; also the reference list for developers. */
export const FAMILIES: Record<string, string> = {
  "jc:due:": "Practice due times", "jc:profile:": "Practice card progress", "jc:pg": "Practice setup",
  "jc:sessions": "Practice sessions", "jc:prog:": "Unfinished test answers", "jc:seen:": "Opened tests",
  "jc:lsn:": "Listening scores", "jc:rdt:": "Reading test scores", "jc:voc:": "言語知識 scores", "jc:tlv:": "Test list level",
  "jc:theme": "Theme", "jc:lang": "Language", "jc:sound": "Sound", "jc:rate": "Voice speed", "jc:voice": "Device voice",
  "jc:tapvoice": "Speak on tap", "jc:revealsay": "Practice: play word on open", "jc:showfam": "Familiarity bars", "jc:answer": "Practice answer style",
  "jc:clevel": "Complete list level", "jc:slevel": "Sections level", "jc:lesson": "Last page", "jc:shelforder": "Reading order",
  "jc:cc": "Movie subtitles", "jc:thEn": "Movie English", "jc:scenewords": "Scene words", "jc:scenelabels": "Scene labels",
  "jc:uselog": "Use it log", "jc:bookmarks": "Complete list bookmarks", "jc:apikey": "Use it API key (never exported)",
};

const PRIVATE = new Set(["jc:apikey"]);   // secrets stay on this device

export const SCHEMA = 1;   // bump + migrate() when a key's shape changes

/** All saved data as one object (secrets excluded). */
export function exportAll(): { schema: number; at: number; data: Record<string, string> } {
  const data: Record<string, string> = {};
  for (const k of store.keys()) if (!PRIVATE.has(k)) { const v = store.raw(k); if (v !== null) data[k] = v; }
  return { schema: SCHEMA, at: Date.now(), data };
}

/** Write an exportAll() object back (keys not in it are left alone). */
export function importAll(dump: { schema: number; data: Record<string, string> }): number {
  let n = 0;
  for (const [k, v] of Object.entries(dump.data || {})) if (k.startsWith(PREFIX) && !PRIVATE.has(k)) { store.setRaw(k, v); n++; }
  return n;
}

/** Run once at start: records the schema version. Nothing to convert yet (v1 = the original keys). */
export function migrate(): void {
  const v = store.get<number>("jc:schema", 0);
  if (v < SCHEMA) store.set("jc:schema", SCHEMA);
}
