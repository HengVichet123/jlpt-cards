/* JLPT-style tests: the list (Listening / Reading tests / 言語知識) and the three players.
   Answers are kept until the test is finished or started over (src/tests/quiz.ts). */
import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import * as Quiz from "../tests/quiz";
import { useBodyHost } from "../react/float";
import { PLAYER, PLAY_ICO, PAUSE_ICO } from "../audio/player";

type Common = { tr: (s: string) => string; onBack: () => void };

/* ---------------- list ---------------- */
export type TestRow = { id: string; level: string; title: string; count: number; scenes?: string[] };
export function TestList(p: Common & { kind: Quiz.Kind; idx: TestRow[]; level: string; onLevel: (l: string) => void;
  credit: string; back: string | null; onOpen: (id: string) => void }) {
  const levels = [...new Set(p.idx.map(t => t.level))].sort();
  const L = p.idx.filter(t => t.level === p.level);
  const state = (t: TestRow) => Quiz.score(p.kind, t.id) ? "done" : Quiz.seen(p.kind, t.id) ? "seen" : "new";
  const tried = L.filter(t => state(t) !== "new").length;
  return (
    <section className="tl">
      {p.back && <button className="nav-btn" data-back={p.back} onClick={p.onBack}>Back</button>}
      <div className="tl-top">
        {levels.length > 1 && <div className="tl-lv" role="tablist">{levels.map(l =>
          <button key={l} type="button" role="tab" aria-selected={l === p.level} onClick={() => p.onLevel(l)}>{l}</button>)}</div>}
        <span className="tl-count" aria-label={`${tried} of ${L.length} opened`}>{`${tried} / ${L.length}`}</span>
      </div>
      <ol className="tl-rows">{L.map((t, i) => { const r = Quiz.score(p.kind, t.id);
        return <li key={t.id}><button type="button" className={`tl-row ${state(t)}`} onClick={() => { Quiz.markSeen(p.kind, t.id); p.onOpen(t.id); scrollTo(0, 0); }}>
          <span className="tl-no">{i + 1}</span>
          <span className="tl-t"><b>{t.scenes && t.scenes.length ? t.scenes.slice(0, 4).join("・") : t.title}</b><small>{p.tr(`${t.count} questions`)}</small></span>
          {r && <span className="tl-best">{`${r.best}/${t.count}`}</span>}
        </button></li>; })}</ol>
      <p className="lsn-note">{p.tr("Original questions in the JLPT formats, not official test material.")}</p>
      {p.credit && <details className="tl-credit"><summary>{p.tr("Voice credits")}</summary><p className="lsn-note">{p.credit}</p></details>}
    </section>
  );
}

/* ---------------- shared pieces ---------------- */
function Head({ part, count, show, onOver, tr }: { part: string; count: string; show: boolean; onOver: () => void; tr: Common["tr"] }) {
  return <div className="lsn-head"><b>{part}</b>{show && <button type="button" className="q-over" onClick={onOver}>{tr("Start over")}</button>}<span>{count}</span></div>;
}
function Options({ opts, answer, chosen, onPick, render, grid, nums }: { opts: string[]; answer: number; chosen: number; onPick: (m: number) => void;
  render: (o: string) => ReactNode; grid?: boolean; nums?: boolean }) {
  return <ol className={`lsn-opts${grid ? " voc-grid" : ""}${nums ? " lsn-nums" : ""}`}>{opts.map((o, m) => {
    const cls = chosen ? (m + 1 === answer ? " right" : m + 1 === chosen ? " wrong" : "") : "";
    return <li key={m}><button type="button" className={`lsn-opt${cls}`} disabled={!!chosen} onClick={() => onPick(m + 1)}>
      <span className="lsn-n">{m + 1}</span>{nums ? null : <span>{render(o)}</span>}</button></li>; })}</ol>;
}
function Result({ right, total, skipped, parts, back, tr, onBack, onAgain }: { right: number; total: number; skipped: number; parts: [string, number, number][];
  back: string; tr: Common["tr"]; onBack: () => void; onAgain: () => void }) {
  return <section className="lsn lsn-done">
    <button className="nav-btn" data-back={back} onClick={onBack}>Back</button>
    <p className="lsn-score"><b>{right}</b>{` / ${total}`}</p>{skipped ? <p className="lsn-skipped">{tr(`${skipped} skipped`)}</p> : null}
    <ul className="lsn-parts">{parts.map(([name, a, n], k) => <li key={k}><span>{name}</span><b>{`${a} / ${n}`}</b></li>)}</ul>
    <button type="button" className="lsn-next" onClick={onAgain}>{tr("Try again")}</button>
  </section>;
}
/** One quiz screen's state: answers (saved as picked), current screen, result. */
function useQuiz<T extends Quiz.Picked>(kind: Quiz.Kind, id: string, fresh: () => T, screens: (p: T) => number[][]) {
  const [picked, setPicked] = useState<T>(() => Quiz.load(kind, id, fresh()));
  const [i, setI] = useState(() => Quiz.firstOpen(screens(picked)));
  const n = screens(picked).length, done = i >= n;
  const pick = (next: T) => { Quiz.save(kind, id, next); setPicked(next); };
  const over = () => { Quiz.clear(kind, id); setPicked(fresh()); setI(0); scrollTo(0, 0); };
  const go = (d: number) => { setI(i + d); scrollTo(0, 0); };
  const again = () => { setPicked(fresh()); setI(0); };
  return { picked, i, n, done, pick, over, go, again };
}

/* ---------------- reading test ---------------- */
type RdQ = { q: string; options: string[]; answer: number; why?: string };
type RdItem = { texts: { label?: string; title?: string; body: string }[]; questions: RdQ[] };
export type ReadTestData = { level: string; parts: { ja: string; items: RdItem[] }[] };

function rdBody(t: string): ReactNode[] {   // paragraphs; "■ " = heading; lines starting with "|" = a table (first row = header)
  const out: ReactNode[] = []; let tb: string[] = [];
  const flush = () => { if (!tb.length) return;
    const rows = tb.map(l => l.replace(/^\||\|$/g, "").split("|").map(c => c.trim()));
    out.push(<div className="rd-tbl" key={out.length}><table><tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => i ? <td key={j}>{c}</td> : <th key={j}>{c}</th>)}</tr>)}</tbody></table></div>); tb = []; };
  for (const l of t.split("\n")) {
    if (/^\|/.test(l)) { tb.push(l); continue; } flush();
    if (!l.trim()) continue;
    out.push(/^■/.test(l) ? <h4 key={out.length}>{l.replace(/^■\s*/, "")}</h4> : <p key={out.length}>{l}</p>);
  }
  flush(); return out;
}

export function ReadTest(p: Common & { id: string; T: ReadTestData; setTitle: (t: string) => void }) {
  const S = p.T.parts.flatMap(pt => pt.items.map(it => ({ ...it, part: pt })));
  const nQ = S.reduce((n, x) => n + x.questions.length, 0);
  const q = useQuiz("rdt", p.id, () => S.map(x => new Array(x.questions.length).fill(0)) as number[][], pk => pk);
  const saved = useRef(false);
  useEffect(() => { p.setTitle(p.T.level + " 読解"); }, []);
  if (q.done) {
    const pk = q.picked; let right = 0; S.forEach((it, k) => it.questions.forEach((x, m) => { if (pk[k][m] === x.answer) right++; }));
    if (!saved.current) { saved.current = true; Quiz.saveScore("rdt", p.id, right); Quiz.clear("rdt", p.id); }
    const parts = p.T.parts.map(pt => { let a = 0, n = 0; S.forEach((it, k) => { if (it.part === pt) it.questions.forEach((x, m) => { n++; if (pk[k][m] === x.answer) a++; }); }); return [pt.ja, a, n] as [string, number, number]; });
    return <Result right={right} total={nQ} skipped={pk.flat().filter(x => !x).length} parts={parts} back="Reading tests" tr={p.tr} onBack={p.onBack} onAgain={() => { saved.current = false; q.again(); }} />;
  }
  const it = S[q.i], P = q.picked[q.i], all = P.every(Boolean);
  return (
    <section className="rdt">
      <button className="nav-btn" data-back="Reading tests" onClick={p.onBack}>Back</button>
      <Head part={it.part.ja} count={`${q.i + 1} / ${S.length}`} show={Quiz.anyAnswered(q.picked)} onOver={q.over} tr={p.tr} />
      {it.texts.map((x, k) => <article key={k} className="rd-text">{x.label && <span className="rd-lab">{x.label}</span>}{x.title && <h3>{x.title}</h3>}{rdBody(x.body)}</article>)}
      {it.questions.map((x, k) => <div key={k} className="rd-q"><p className="rd-qt"><span className="rd-qn">{k + 1}</span>{x.q}</p>
        <Options opts={x.options} answer={x.answer} chosen={P[k]} render={o => o}
          onPick={m => { const y = scrollY; const next = q.picked.map(a => [...a]); next[q.i][k] = m; q.pick(next); requestAnimationFrame(() => scrollTo(0, y)); }} />
        {P[k] && x.why ? <p className="t-why">{x.why}</p> : null}</div>)}
      <button type="button" className={all ? "lsn-next" : "lsn-skip"} onClick={() => q.go(1)}>{p.tr(q.i + 1 < S.length ? (all ? "Next" : "Skip") : "See result")}</button>
    </section>
  );
}

/* ---------------- 言語知識 test ---------------- */
type VocQ = { q: string; options: string[]; answer: number; why?: string; full?: string };
export type VocabTestData = { level: string; parts: { ja: string; key: string; instr?: string; text?: string; items: VocQ[] }[] };

/** ［word］ = underlined, ＿＿ = blank, ★ = the starred blank */
function vocMark(t: string): ReactNode {
  return t.split(/(［.+?］|＿＿|★)/).map((s, k) => s.startsWith("［") ? <u key={k} className="voc-u">{s.slice(1, -1)}</u>
    : s === "＿＿" ? <span key={k} className="voc-bl" /> : s === "★" ? <span key={k} className="voc-bl voc-star">★</span> : <Fragment key={k}>{s}</Fragment>);
}

export function VocabTest(p: Common & { id: string; T: VocabTestData; setTitle: (t: string) => void }) {
  const P = p.T.parts, nQ = P.reduce((n, x) => n + x.items.length, 0);
  const q = useQuiz("voc", p.id, () => P.map(x => new Array(x.items.length).fill(0)) as number[][], pk => pk);
  const saved = useRef(false);
  useEffect(() => { p.setTitle(p.T.level + " 言語知識"); }, []);
  if (q.done) {
    const pk = q.picked; let right = 0; P.forEach((pt, k) => pt.items.forEach((x, m) => { if (pk[k][m] === x.answer) right++; }));
    if (!saved.current) { saved.current = true; Quiz.saveScore("voc", p.id, right); Quiz.clear("voc", p.id); }
    const parts = P.map((pt, k) => [pt.ja, pt.items.filter((x, m) => pk[k][m] === x.answer).length, pt.items.length] as [string, number, number]);
    return <Result right={right} total={nQ} skipped={pk.flat().filter(x => !x).length} parts={parts} back="Vocab & Grammar" tr={p.tr} onBack={p.onBack} onAgain={() => { saved.current = false; q.again(); }} />;
  }
  const pt = P[q.i], A = q.picked[q.i], all = A.every(Boolean);
  return (
    <section className="rdt voc">
      <button className="nav-btn" data-back="Vocab & Grammar" onClick={p.onBack}>Back</button>
      <Head part={pt.ja} count={`${q.i + 1} / ${P.length}`} show={Quiz.anyAnswered(q.picked)} onOver={q.over} tr={p.tr} />
      {pt.instr && <p className="voc-instr">{pt.instr}</p>}
      {pt.text && <article className="rd-text voc-text">{pt.text.split("\n").filter(Boolean).map((l, k) => <p key={k}>{vocMark(l)}</p>)}</article>}
      {pt.items.map((x, k) => <div key={k} className="rd-q"><p className="rd-qt"><span className="rd-qn">{k + 1}</span><span>{vocMark(x.q)}</span></p>
        <Options opts={x.options} answer={x.answer} chosen={A[k]} render={vocMark} grid={pt.key !== "yoho" && x.options.every(o => o.length <= 9)}
          onPick={m => { const y = scrollY; const next = q.picked.map(a => [...a]); next[q.i][k] = m; q.pick(next); requestAnimationFrame(() => scrollTo(0, y)); }} />
        {A[k] && x.full ? <p className="voc-full">{x.full}</p> : null}{A[k] && x.why ? <p className="t-why">{x.why}</p> : null}</div>)}
      <button type="button" className={all ? "lsn-next" : "lsn-skip"} onClick={() => q.go(1)}>{p.tr(q.i + 1 < P.length ? (all ? "Next" : "Skip") : "See result")}</button>
    </section>
  );
}

/* ---------------- listening test ---------------- */
type LsnItem = { intro?: string; lines: [string, string, string?][]; question?: string; options: string[]; answer: number; why?: string;
  audio: string; at?: number[]; atQ?: number; sub?: { question: string; options: string[]; answer: number; why?: string }[] };
export type ListenTestData = { title: string; parts: { ja: string; spoken?: boolean; items: LsnItem[] }[] };
const SPK: Record<string, string> = { F: "女", F2: "女", M: "男", M2: "男", N: "" };

export function ListenTest(p: Common & { id: string; T: ListenTestData; setTitle: (t: string) => void }) {
  const Q = p.T.parts.flatMap(pt => pt.items.flatMap((it, i) => it.sub
    ? it.sub.map((x, j) => ({ ...it, ...x, part: pt, no: i + 1, subNo: j + 1 }))
    : [{ ...it, part: pt, no: i + 1, subNo: 0 }]));
  const q = useQuiz("lsn", p.id, () => new Array(Q.length).fill(0) as number[], pk => pk.map(x => [x]));
  const [scriptOpen, setScriptOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [spoken, setSpoken] = useState(-1);   // index of the line being spoken
  const saved = useRef(false);
  const host = useBodyHost();
  useEffect(() => { p.setTitle(p.T.title); return () => { PLAYER.pause(); PLAYER.ontimeupdate = null; PLAYER.onended = null; }; }, []);
  useEffect(() => { setPlaying(false); setProgress(0); setSpoken(-1); }, [q.i]);

  if (q.done) {
    const pk = q.picked, right = Q.filter((x, k) => pk[k] === x.answer).length;
    if (!saved.current) { saved.current = true; Quiz.saveScore("lsn", p.id, right); Quiz.clear("lsn", p.id); }
    const parts = p.T.parts.map(pt => { const idx = Q.map((x, k) => [x, k] as const).filter(([x]) => x.part === pt);
      return [pt.ja, idx.filter(([x, k]) => pk[k] === x.answer).length, idx.length] as [string, number, number]; });
    return <Result right={right} total={Q.length} skipped={pk.filter(x => !x).length} parts={parts} back="Listening" tr={p.tr} onBack={p.onBack} onAgain={() => { saved.current = false; q.again(); }} />;
  }

  const it = Q[q.i], ans = q.picked[q.i];
  const times: number[] = [...(it.intro ? [0] : []), ...(it.at || []), ...(it.question && !it.subNo && it.atQ != null ? [it.atQ] : [])];
  const mine = () => PLAYER.dataset.q === it.audio;
  const start = (at?: number) => {
    if (!mine()) { PLAYER.src = `data/listening/${it.audio}`; PLAYER.dataset.q = it.audio; }
    const mark = () => { const now = mine() && !PLAYER.paused ? PLAYER.currentTime + 0.05 : -1; let cur = -1; times.forEach((t, k) => { if (t <= now) cur = k; }); setSpoken(cur); };
    PLAYER.onended = () => { setPlaying(false); setProgress(100); mark(); };
    PLAYER.ontimeupdate = () => { if (mine() && PLAYER.duration) setProgress(PLAYER.currentTime / PLAYER.duration * 100); mark(); };
    if (at != null) { if (PLAYER.readyState >= 1) PLAYER.currentTime = at; else PLAYER.addEventListener("loadedmetadata", () => { PLAYER.currentTime = at; }, { once: true }); }   // iPhone ignores a seek before metadata
    PLAYER.play().then(() => { setPlaying(true); mark(); }).catch(() => {});
  };
  const toggle = () => { if (!PLAYER.paused && mine()) { PLAYER.pause(); setPlaying(false); setSpoken(-1); return; } start(); };
  const go = (d: number) => { PLAYER.pause(); q.go(d); };
  let li = 0;
  const line = (t: number | null | undefined, cls: string, body: ReactNode, key: string) => {
    if (t == null) return <p key={key} className={cls}>{body}</p>;
    const k = li++;
    return <button key={key} type="button" className={`lsn-line ${cls}${spoken === k ? " on" : ""}`} onClick={() => start(t)}>{body}</button>;
  };
  const numsOnly = !!it.part.spoken && !ans;
  return (
    <section className="lsn lsn-pad">
      <button className="nav-btn" data-back="Listening" onClick={() => { PLAYER.pause(); PLAYER.ontimeupdate = null; p.onBack(); }}>Back</button>
      <Head part={it.part.ja} count={`${it.no}番${it.subNo ? ` 質問${it.subNo}` : ""} · ${q.i + 1} / ${Q.length}`} show={Quiz.anyAnswered(q.picked)}
        onOver={() => { PLAYER.pause(); q.over(); }} tr={p.tr} />
      <div className="lsn-player">
        <button type="button" className="lsn-play" aria-label={playing ? "Pause" : "Play"} onClick={toggle} dangerouslySetInnerHTML={{ __html: playing ? PAUSE_ICO : PLAY_ICO }} />
        <div className="lsn-bar"><i style={{ width: `${progress}%` }} /></div>
      </div>
      {numsOnly && <p className="lsn-hear">{p.tr("Answers are only heard. Pick a number.")}</p>}
      <Options opts={it.options} answer={it.answer} chosen={ans} render={o => o} nums={numsOnly}
        onPick={m => { const y = scrollY; const next = [...q.picked]; next[q.i] = m; PLAYER.pause(); setPlaying(false); q.pick(next); requestAnimationFrame(() => scrollTo(0, y)); }} />
      {ans && it.why ? <p className="t-why">{it.why}</p> : null}
      <details className="lsn-script" open={scriptOpen} onToggle={e => setScriptOpen((e.target as HTMLDetailsElement).open)}>
        <summary>{p.tr("Script")}</summary><div className="lsn-body">
          {it.intro ? line(0, "lsn-nar", it.intro, "intro") : null}
          {it.lines.map(([spk, t], k) => line(it.at ? it.at[k] : null, "", <>{SPK[spk] ? <b>{`${SPK[spk]}：`}</b> : null}{t}</>, "l" + k))}
          {it.question ? line(it.subNo ? null : it.atQ, "lsn-nar", it.question, "q") : null}
        </div></details>
      {createPortal(
        <div className="pg-dock lsn-dock"><div className="pg-dock-in lsn-nav">
          {q.i > 0 && <button type="button" id="lsnPrev" aria-label="Previous question" onClick={() => go(-1)}>{p.tr("‹ Previous")}</button>}
          <button type="button" className="main" id="lsnNext" onClick={() => go(1)}>{p.tr(q.i + 1 < Q.length ? "Next" : "See result")}</button>
        </div></div>, host)}
    </section>
  );
}
