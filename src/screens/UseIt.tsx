/* Use it: write a message with the target words; Claude answers (in the Claude app, or here with your own API key). */
import { useEffect, useRef, useState } from "react";
import { USE, usesWord, logUse, openInClaude, askClaude } from "../useit/chat";
import { store } from "../data/store";

type Msg = { role: string; content: string; cls?: string };
export function UseIt(p: { newWords: () => Promise<void>; onKeyChange: () => void }) {
  const key = store.get("jc:apikey", "");
  const [text, setText] = useState("");
  const [log, setLog] = useState<Msg[]>(() => USE.history.map(m => ({ ...m })));
  const [, redraw] = useState(0);
  const logRef = useRef<HTMLDivElement>(null), ta = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { if (logRef.current) logRef.current.scrollTop = 1e9; }, [log]);

  if (!key && USE.wantKey) return <KeyForm onDone={p.onKeyChange} />;
  const ok = USE.words.map(c => usesWord(text, c)), ready = ok.every(Boolean) && !!text.trim();
  const next = async () => { await p.newWords(); setText(""); redraw(n => n + 1); };
  const send = async () => {
    const t = text.trim(); if (!t) return;
    if (!key) {
      logUse(t, "claude-app"); await openInClaude(t);
      USE.history.push({ role: "user", content: t }, { role: "assistant", content: "Opened in Claude ↗" });
      setLog(l => [...l, { role: "user", content: t }, { role: "assistant", content: "Opened in Claude ↗ (also copied, in case you need to paste)" }]);
      await next(); return;
    }
    logUse(t); USE.history.push({ role: "user", content: t });
    setLog(l => [...l, { role: "user", content: t }, { role: "assistant", content: "…", cls: "pending" }]); setText("");
    const r = await askClaude();
    if (r.reply !== undefined) { USE.history.push({ role: "assistant", content: r.reply });
      setLog(l => [...l.slice(0, -1), { role: "assistant", content: r.reply! }]); await next(); return; }
    USE.history.pop();
    setLog(l => [...l.slice(0, -1), { role: "assistant", content: r.refused ? "The model declined to answer this message. Try writing it differently." : r.error!, cls: r.refused ? "" : "err" }]);
  };
  const hint = () => {   // cheat mode: a real example sentence from the cards (logged)
    const parts = USE.words.map(c => { USE.hinted.add(c.no + c.level); const e = (c.ex && c.ex[0]) || c.use; return e ? e.jp : `${c.word}を使ってみました。`; });
    setText(parts.join("")); ta.current?.focus();
  };
  return (
    <section className="useit">
      <div className="use-task">
        <div className="use-h">{`Write a message using ${USE.words.length === 1 ? "this word" : "both words"}`}{USE.fromStudied ? null : <>{" "}<small>(random N1 words: study some in Playground first)</small></>}</div>
        <div className="use-chips">{USE.words.map((c, i) => <span key={i} className={`use-chip${ok[i] ? " ok" : ""}`} data-i={i}><b>{c.word}</b><small>{`${c.reading} · ${(c.en || "").split(" / ")[0].split(";")[0]}`}</small></span>)}</div>
        <div className="use-tools"><button className="nav-btn" id="useHint" onClick={hint}>Hint</button><button className="nav-btn" id="useNew" onClick={next}>New words</button>
          <button className="use-keyx" id="useKeyReset" onClick={() => { if (key) { store.set("jc:apikey", ""); USE.client = null; USE.wantKey = false; } else USE.wantKey = true; p.onKeyChange(); }}>{key ? "Remove API key" : "Use an API key"}</button></div>
      </div>
      <div className="use-log" id="useLog" ref={logRef}>{log.map((m, k) => <div key={k} className={`use-msg ${m.role}${m.cls ? " " + m.cls : ""}`}>{m.content}</div>)}</div>
      <div className="use-input"><textarea id="useText" rows={3} placeholder="日本語で書いてみよう…" ref={ta} value={text} onChange={e => setText(e.target.value)} />
        <button className="go start" id="useSend" disabled={!ready} onClick={send}>{key ? "Send" : "Ask Claude ↗"}</button></div>
      {key ? null : <p className="use-note">Opens Claude with your sentence ready. It uses your Claude plan, no API key.</p>}
    </section>
  );
}

function KeyForm({ onDone }: { onDone: () => void }) {
  const [v, setV] = useState("");
  return (
    <section className="useit">
      <h2 className="sec-title">使ってみる<em>Use your words in a message</em></h2>
      <p className="set-lead">This practice talks to Claude with your own Anthropic API key. The key is saved only in this browser.</p>
      <label className="set-label" htmlFor="useKey">Anthropic API key</label>
      <input id="useKey" className="use-key" type="password" autoComplete="off" placeholder="sk-ant-…" value={v} onChange={e => setV(e.target.value)} />
      <button className="go start" id="useKeySave" onClick={() => { const k = v.trim(); if (k) { store.set("jc:apikey", k); USE.client = null; onDone(); } }}>Save key</button>
      <button className="use-keyx" id="useNoKey" onClick={() => { USE.wantKey = false; onDone(); }}>Back to Claude-app mode</button>
    </section>
  );
}
