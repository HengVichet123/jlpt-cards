/* Use it: write a message that uses the target words; Claude replies (and corrects misuse).
   Send unlocks only when every target word is in the message; Hint fills a real example (logged as a hint).
   The user's own API key stays in this browser (jc:apikey). Log: jc:uselog [{ts, words, hint, text}]. Logic unchanged from v163. */
import { store } from "../data/store";

export type UseCard = { no: number; level: string; word: string; reading: string; en?: string; ex?: { jp: string }[]; use?: { jp: string } };
export const USE: { words: UseCard[]; hinted: Set<string>; history: { role: "user" | "assistant"; content: string }[]; client: any; Anthropic?: any;
  wantKey?: boolean; fromStudied?: boolean } = { words: [], hinted: new Set(), history: [], client: null };
const SDK_URL = "https://cdn.jsdelivr.net/npm/@anthropic-ai/sdk@0.128.0/+esm";

export function usesWord(msg: string, c: UseCard): boolean {
  const w = c.word.replace(/[（(].*?[）)]|[〜～]/g, "").trim();
  if (msg.includes(w)) return true;
  // conjugated verbs / i-adjectives: accept the stem when it keeps a kanji (掲げる -> 掲げ, 著しい -> 著し)
  if (/[一-鿿]/.test(w) && /[うくぐすつぬぶむるい]$/.test(w) && w.length >= 2) {
    const stem = w.slice(0, -1);
    if (/[一-鿿]/.test(stem) && msg.includes(stem)) return true;
  }
  return false;
}

/** Two words to use: studied ones when there are enough, else random N1 words. Returns whether they are studied words. */
export async function pickUseWords(pool: (lv: string) => Promise<{ words: UseCard[] }>, reviewed: (c: UseCard) => boolean): Promise<boolean> {
  const affix = (c: UseCard) => /[〜～]/.test(c.word + (c.reading || ""));   // suffix/prefix entries (～宛, ～化) are not usable on their own
  const all = [...(await pool("N1")).words, ...(await pool("N2")).words].filter(c => !affix(c));
  const studied = all.filter(reviewed);
  const from = studied.length >= 2 ? studied : all.filter(c => c.level === "N1");
  const out: UseCard[] = []; while (out.length < 2) { const c = from[Math.floor(Math.random() * from.length)]; if (!out.includes(c)) out.push(c); }
  USE.words = out; USE.hinted = new Set(); return studied.length >= 2;
}

export function logUse(text: string, via?: string): void {
  const log = store.get<unknown[]>("jc:uselog", []);
  log.push({ ts: Date.now(), words: USE.words.map(c => [c.level, c.no, c.word]), hint: USE.words.some(c => USE.hinted.has(c.no + c.level)), text, ...(via ? { via } : {}) });
  store.set("jc:uselog", log.slice(-500));
}

/** Without an API key: open Claude with the sentence and the instructions ready (also copied). */
export async function openInClaude(text: string): Promise<void> {
  const words = USE.words.map(c => `${c.word}（${c.reading}）= ${(c.en || "").split(" / ")[0]}`).join(" / ");
  const prompt = `I'm learning Japanese for JLPT N1. I wrote a message that uses these target words: ${words}\n\nMy message:「${text}」\n\n`
    + `1) If a target word is used wrongly or unnaturally, correct it in one line: ✎ 「wrong part」→「better」— short English reason. If it's fine, skip this.\n`
    + `2) Then reply to my message naturally in Japanese (2–4 sentences, about N2 level), as if we're chatting.`;
  try { await navigator.clipboard.writeText(prompt); } catch { /* no clipboard */ }
  window.open("https://claude.ai/new?q=" + encodeURIComponent(prompt), "_blank", "noopener");
}

/** With an API key: Claude's reply to the conversation so far (USE.history ends with the user's message). */
export async function askClaude(): Promise<{ reply?: string; refused?: boolean; error?: string }> {
  try {
    if (!USE.client) { const { default: Anthropic } = await import(/* @vite-ignore */ SDK_URL);
      USE.client = new Anthropic({ apiKey: store.get("jc:apikey", ""), dangerouslyAllowBrowser: true }); USE.Anthropic = Anthropic; }
    const target = USE.words.map(c => `${c.word}（${c.reading}）: ${(c.en || "").split(" / ")[0]}`).join("\n");
    const response = await USE.client.beta.messages.create({
      model: "claude-opus-5",
      max_tokens: 1024,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low" },
      system: `You are a friendly Japanese conversation partner for a JLPT N1/N2 learner.
The learner's message had to use these target words:
${target}
Reply in natural Japanese, 2 to 4 short sentences, at about N2 level, continuing the conversation.
If a target word is used incorrectly or unnaturally, begin with one correction line in this form:
✎ 「wrong part」→「better phrasing」— one short English explanation
then continue the conversation. If the usage is fine, do not comment on it; just reply naturally.`,
      messages: USE.history,
    });
    if (response.stop_reason === "refusal") return { refused: true };
    return { reply: response.content.filter((b: { type: string }) => b.type === "text").map((b: { text: string }) => b.text).join("").trim() };
  } catch (err: any) {
    const A = USE.Anthropic;
    return { error: A && err instanceof A.AuthenticationError ? "The API key was rejected. Tap “Change key” and enter a valid key."
      : A && err instanceof A.RateLimitError ? "Too many requests right now. Wait a moment and send again."
      : A && err instanceof A.APIConnectionError ? "No connection to the API. Check your internet and send again."
      : `Could not get a reply: ${err?.message || err}` };
  }
}
