/* JLPT-style tests: the list (Listening / Reading tests / 言語知識) and the three players.
   Answers are kept until the test is finished or started over (src/tests/quiz.ts). */
import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import * as Quiz from "../tests/quiz";
import * as Mistakes from "../tests/mistakes";
import { useBodyHost } from "../react/float";
import { PLAYER, PLAY_ICO, PAUSE_ICO } from "../audio/player";

type Mode = "practice" | "exam" | "review";
type Common = { tr: (s: string) => string; onBack: () => void; mode?: Mode; init?: Quiz.Picked;
  onReview?: (picked: Quiz.Picked) => void; onAgain?: () => void };
const mm = (s: number) => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.max(0, s) % 60).padStart(2, "0")}`;
/** Seconds since the exam started (ticks every second while `on`). */
function useClock(on: boolean) {
  const [t, setT] = useState(0), t0 = useRef(Date.now());
  useEffect(() => { if (!on) return; const h = setInterval(() => setT(Math.floor((Date.now() - t0.current) / 1000)), 1000); return () => clearInterval(h); }, [on]);
  return t;
}

/* ---------------- list ---------------- */
export type TestRow = { id: string; level: string; title: string; count: number; scenes?: string[] };
export function TestList(p: Common & { kind: Quiz.Kind; idx: TestRow[]; level: string; onLevel: (l: string) => void;
  credit: string; back: string | null; onOpen: (id: string) => void; listMode: "practice" | "exam"; onMode: (m: "practice" | "exam") => void }) {
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
        <div className="seg seg-2 tl-mode" role="radiogroup" aria-label="Mode">{(["practice", "exam"] as const).map(m =>
          <button key={m} type="button" role="radio" aria-checked={p.listMode === m} className={p.listMode === m ? "on" : ""} onClick={() => p.onMode(m)}>{p.tr(m === "exam" ? "Exam" : "Practice")}</button>)}</div>
        <span className="tl-count" aria-label={`${tried} of ${L.length} opened`}>{`${tried} / ${L.length}`}</span>
      </div>
      <ol className="tl-rows">{L.map((t, i) => { const r = Quiz.score(p.kind, t.id), ex = p.listMode === "exam" ? Quiz.examScore(p.kind, t.id) : null;
        return <li key={t.id}><button type="button" className={`tl-row ${state(t)}`} onClick={() => { Quiz.markSeen(p.kind, t.id); p.onOpen(t.id); scrollTo(0, 0); }}>
          <span className="tl-no">{i + 1}</span>
          <span className="tl-t"><b>{t.scenes && t.scenes.length ? t.scenes.slice(0, 4).join("・") : t.title}</b><small>{p.tr(`${t.count} questions`)}</small></span>
          {p.listMode === "exam" ? (ex ? <span className={`tl-best${ex.best >= Quiz.PASS ? " pass" : ""}`}>{`${ex.best}%`}</span> : null)
            : r && <span className="tl-best">{`${r.best}/${t.count}`}</span>}
        </button></li>; })}</ol>
      <p className="lsn-note">{p.tr("Original questions in the JLPT formats, not official test material.")}</p>
      {p.credit && <details className="tl-credit"><summary>{p.tr("Voice credits")}</summary><p className="lsn-note">{p.credit}</p></details>}
    </section>
  );
}

/* ---------------- shared pieces ---------------- */
function Head({ part, count, show, onOver, tr, clock }: { part: string; count: string; show: boolean; onOver: () => void; tr: Common["tr"]; clock?: { text: string; low: boolean } | null }) {
  return <div className="lsn-head"><b>{part}</b>{show && <button type="button" className="q-over" onClick={onOver}>{tr("Start over")}</button>}
    <span>{clock ? <em className={`ex-clock${clock.low ? " low" : ""}`} aria-label="Time">{clock.text}</em> : null}{count}</span></div>;
}
function Options({ opts, answer, chosen, onPick, render, grid, nums, exam }: { opts: string[]; answer: number; chosen: number; onPick: (m: number) => void;
  render: (o: string) => ReactNode; grid?: boolean; nums?: boolean; exam?: boolean }) {
  return <ol className={`lsn-opts${grid ? " voc-grid" : ""}${nums ? " lsn-nums" : ""}`}>{opts.map((o, m) => {
    const cls = exam ? (m + 1 === chosen ? " picked" : "") : chosen ? (m + 1 === answer ? " right" : m + 1 === chosen ? " wrong" : "") : "";
    return <li key={m}><button type="button" className={`lsn-opt${cls}`} disabled={!exam && !!chosen} onClick={() => onPick(m + 1)}>
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
/** Exam result: score, percent against the pass line, time, parts; Review answers / Try again. */
function ExamResult({ right, total, parts, time, limit, back, tr, onBack, onReview, onAgain }: { right: number; total: number; parts: [string, number, number][];
  time: number; limit: number; back: string; tr: Common["tr"]; onBack: () => void; onReview: () => void; onAgain: () => void }) {
  const pct = Math.round(right / Math.max(1, total) * 100), pass = pct >= Quiz.PASS;
  return <section className="lsn lsn-done exam-done">
    <button className="nav-btn" data-back={back} onClick={onBack}>Back</button>
    <p className={`ex-verdict${pass ? " pass" : ""}`}>{tr(pass ? "Pass" : "Not yet")}</p>
    <p className="lsn-score"><b>{`${pct}%`}</b></p>
    <p className="ex-meta">{`${right} / ${total} · ${tr("pass line")} ${Quiz.PASS}% · ${mm(time)}${limit ? ` / ${mm(limit)}` : ""}${limit && time >= limit ? ` · ${tr("time up")}` : ""}`}</p>
    <ul className="lsn-parts">{parts.map(([name, a, n], k) => <li key={k}><span>{name}</span><b>{`${a} / ${n}`}</b></li>)}</ul>
    <div className="ex-actions"><button type="button" className="lsn-next" onClick={onReview}>{tr("Review answers")}</button>
      <button type="button" className="lsn-skip" onClick={onAgain}>{tr("Try again")}</button></div>
  </section>;
}
/** Previous / Next: a row at the end of the page (same in all three tests). */
function Dock({ host, i, n, onGo, tr, noPrev, last }: { host: HTMLElement; i: number; n: number; onGo: (d: number) => void; tr: Common["tr"]; noPrev?: boolean; last?: string }) {
  void host;   // v176: in the page after the questions (no floating bar)
  return (
    <div className="q-nav">
      {i > 0 && !noPrev && <button type="button" id="lsnPrev" aria-label="Previous question" onClick={() => onGo(-1)}>{tr("‹ Previous")}</button>}
      <button type="button" className="main" id="lsnNext" onClick={() => onGo(1)}>{tr(i + 1 < n ? "Next" : last || "See result")}</button>
    </div>);
}
/** One quiz screen's state: answers (saved as picked), current screen, result. */
function useQuiz<T extends Quiz.Picked>(kind: Quiz.Kind, id: string, fresh: () => T, screens: (p: T) => number[][], mode: Mode = "practice", init?: Quiz.Picked) {
  const [picked, setPicked] = useState<T>(() => mode === "practice" ? Quiz.load(kind, id, fresh()) : mode === "review" && init ? init as T : fresh());
  const [i, setI] = useState(() => mode === "practice" ? Quiz.firstOpen(screens(picked)) : 0);
  const n = screens(picked).length, done = i >= n;
  const pick = (next: T) => { if (mode === "practice") Quiz.save(kind, id, next); if (mode !== "review") setPicked(next); };
  const finish = () => setI(n);
  const over = () => { Quiz.clear(kind, id); setPicked(fresh()); setI(0); scrollTo(0, 0); };
  const go = (d: number) => { setI(i + d); scrollTo(0, 0); };
  const again = () => { setPicked(fresh()); setI(0); };
  return { picked, i, n, done, pick, over, go, again, finish };
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
  const exam = p.mode === "exam", review = p.mode === "review";
  const q = useQuiz("rdt", p.id, () => S.map(x => new Array(x.questions.length).fill(0)) as number[][], pk => pk, p.mode, p.init);
  const saved = useRef(false), host = useBodyHost();
  const el = useClock(exam && !q.done), limit = Quiz.examLimit("rdt", nQ);
  useEffect(() => { if (exam && limit && el >= limit && !q.done) q.finish(); }, [el]);   // time up: finish
  useEffect(() => { p.setTitle(p.T.level + " 読解"); }, []);
  if (q.done) {
    const pk = q.picked; let right = 0; S.forEach((it, k) => it.questions.forEach((x, m) => { if (pk[k][m] === x.answer) right++; }));
    const parts = p.T.parts.map(pt => { let a = 0, n = 0; S.forEach((it, k) => { if (it.part === pt) it.questions.forEach((x, m) => { n++; if (pk[k][m] === x.answer) a++; }); }); return [pt.ja, a, n] as [string, number, number]; });
    if (exam) { if (!saved.current) { saved.current = true; Quiz.saveExam("rdt", p.id, Math.round(right / nQ * 100), el); }
      return <ExamResult right={right} total={nQ} parts={parts} time={el} limit={limit} back="Reading exams" tr={p.tr} onBack={p.onBack} onReview={() => p.onReview?.(pk)} onAgain={() => p.onAgain?.()} />; }
    if (!saved.current) { saved.current = true; Quiz.saveScore("rdt", p.id, right); Quiz.clear("rdt", p.id); }
    return <Result right={right} total={nQ} skipped={pk.flat().filter(x => !x).length} parts={parts} back="Reading exams" tr={p.tr} onBack={p.onBack} onAgain={() => { saved.current = false; q.again(); }} />;
  }
  const it = S[q.i], P = q.picked[q.i], all = P.every(Boolean);
  return (
    <section className="rdt q-pad">
      <button className="nav-btn" data-back="Reading exams" onClick={p.onBack}>Back</button>
      <Head part={it.part.ja} count={`${q.i + 1} / ${S.length}`} show={p.mode === "practice" || !p.mode ? Quiz.anyAnswered(q.picked) : false} onOver={q.over} tr={p.tr}
        clock={exam ? { text: mm(limit - el), low: limit - el < 60 } : null} />
      {it.texts.map((x, k) => <article key={k} className="rd-text">{x.label && <span className="rd-lab">{x.label}</span>}{x.title && <h3>{x.title}</h3>}{rdBody(x.body)}</article>)}
      {it.questions.map((x, k) => <div key={k} className="rd-q"><p className="rd-qt"><span className="rd-qn">{k + 1}</span>{x.q}</p>
        <Options opts={x.options} answer={x.answer} chosen={P[k]} render={o => o} exam={exam}
          onPick={m => { if (review) return; const y = scrollY; const next = q.picked.map(a => [...a]); next[q.i][k] = m; q.pick(next); requestAnimationFrame(() => scrollTo(0, y)); }} />
        {P[k] && x.why && !exam ? <p className="t-why">{x.why}</p> : null}</div>)}
      <Dock host={host} i={q.i} n={S.length} tr={p.tr} last={exam ? "Finish" : review ? "Done" : undefined}
        onGo={d => review && q.i + d >= S.length ? p.onBack() : q.go(d)} />
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

export function VocabTest(p: Common & { id: string; T: VocabTestData; setTitle: (t: string) => void; onWrong: (m: { test: string; part: number; item: number; level: string; q: string }) => void }) {
  const P = p.T.parts, nQ = P.reduce((n, x) => n + x.items.length, 0);
  const exam = p.mode === "exam", review = p.mode === "review";
  const q = useQuiz("voc", p.id, () => P.map(x => new Array(x.items.length).fill(0)) as number[][], pk => pk, p.mode, p.init);
  const saved = useRef(false), host = useBodyHost();
  const el = useClock(exam && !q.done), limit = Quiz.examLimit("voc", nQ);
  useEffect(() => { if (exam && limit && el >= limit && !q.done) q.finish(); }, [el]);   // time up: finish
  useEffect(() => { p.setTitle(p.T.level + " 言語知識"); }, []);
  const wrong = (k: number, m: number) => p.onWrong({ test: p.id, part: k, item: m, level: p.T.level, q: P[k].items[m].q });
  if (q.done) {
    const pk = q.picked; let right = 0; P.forEach((pt, k) => pt.items.forEach((x, m) => { if (pk[k][m] === x.answer) right++; }));
    const parts = P.map((pt, k) => [pt.ja, pt.items.filter((x, m) => pk[k][m] === x.answer).length, pt.items.length] as [string, number, number]);
    if (exam) { if (!saved.current) { saved.current = true; Quiz.saveExam("voc", p.id, Math.round(right / nQ * 100), el);
        P.forEach((pt, k) => pt.items.forEach((x, m) => { if (pk[k][m] && pk[k][m] !== x.answer) wrong(k, m); })); }   // wrong questions → Exam mistakes
      return <ExamResult right={right} total={nQ} parts={parts} time={el} limit={limit} back="Vocab & Grammar" tr={p.tr} onBack={p.onBack} onReview={() => p.onReview?.(pk)} onAgain={() => p.onAgain?.()} />; }
    if (!saved.current) { saved.current = true; Quiz.saveScore("voc", p.id, right); Quiz.clear("voc", p.id); }
    return <Result right={right} total={nQ} skipped={pk.flat().filter(x => !x).length} parts={parts} back="Vocab & Grammar" tr={p.tr} onBack={p.onBack} onAgain={() => { saved.current = false; q.again(); }} />;
  }
  const pt = P[q.i], A = q.picked[q.i], all = A.every(Boolean);
  return (
    <section className="rdt voc q-pad">
      <button className="nav-btn" data-back="Vocab & Grammar" onClick={p.onBack}>Back</button>
      <Head part={pt.ja} count={`${q.i + 1} / ${P.length}`} show={p.mode === "practice" || !p.mode ? Quiz.anyAnswered(q.picked) : false} onOver={q.over} tr={p.tr}
        clock={exam ? { text: mm(limit - el), low: limit - el < 60 } : null} />
      {pt.instr && <p className="voc-instr">{pt.instr}</p>}
      {pt.text && <article className="rd-text voc-text">{pt.text.split("\n").filter(Boolean).map((l, k) => <p key={k}>{vocMark(l)}</p>)}</article>}
      {pt.items.map((x, k) => <div key={k} className="rd-q"><p className="rd-qt"><span className="rd-qn">{k + 1}</span><span>{vocMark(x.q)}</span></p>
        <Options opts={x.options} answer={x.answer} chosen={A[k]} render={vocMark} grid={pt.key !== "yoho" && x.options.every(o => o.length <= 9)} exam={exam}
          onPick={m => { if (review) return; const y = scrollY; const next = q.picked.map(a => [...a]); next[q.i][k] = m; q.pick(next); requestAnimationFrame(() => scrollTo(0, y));
            if (!exam && m !== x.answer) wrong(q.i, k); }} />
        {A[k] && x.full && !exam ? <p className="voc-full">{x.full}</p> : null}{A[k] && x.why && !exam ? <p className="t-why">{x.why}</p> : null}</div>)}
      <Dock host={host} i={q.i} n={P.length} tr={p.tr} last={exam ? "Finish" : review ? "Done" : undefined}
        onGo={d => review && q.i + d >= P.length ? p.onBack() : q.go(d)} />
    </section>
  );
}

/* ---------------- Exam mistakes review (v182) ---------------- */
/* The wrong question itself, options shuffled; right/wrong only. 3 rights in a row on different days clear it (src/tests/mistakes.ts).
   A wrong answer comes back once at the end of the session (that retry doesn't count). */
export type ReviewItem = { miss: Mistakes.Miss; title: string; part: VocabTestData["parts"][number]; x: VocQ };
export function ExamReview(p: { items: ReviewItem[]; waiting: number; next: number; tr: Common["tr"]; onBack: () => void }) {
  const [queue, setQueue] = useState(() => p.items.map((_, k) => ({ k, retry: false })));
  const [pos, setPos] = useState(0);
  const [chosen, setChosen] = useState(0);
  const [tally, setTally] = useState({ right: 0, wrong: 0, cleared: 0 });
  const cur = queue[pos], it = cur ? p.items[cur.k] : null;
  const perm = useMemo(() => { const a = it ? it.x.options.map((_, i) => i) : [];
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }, [pos, queue.length]);
  const back = <button className="nav-btn" data-back="Practice" onClick={p.onBack}>Back</button>;
  const later = p.waiting ? <p className="exr-later">{p.tr(`${p.waiting} more come back in ${p.next} ${p.next === 1 ? "day" : "days"}.`)}</p> : null;
  if (!p.items.length) return <section className="lsn lsn-done exr">{back}
    <p className="exr-empty">{p.tr("Nothing to review now.")}</p>{later}</section>;
  if (!it) return <section className="lsn lsn-done exr">{back}
    <p className="lsn-score"><b>{tally.right}</b>{` / ${tally.right + tally.wrong}`}</p>
    <ul className="lsn-parts"><li><span>{p.tr("Cleared")}</span><b>{tally.cleared}</b></li><li><span>{p.tr("Back tomorrow")}</span><b>{tally.wrong}</b></li></ul>
    {later}<button type="button" className="lsn-next" onClick={p.onBack}>{p.tr("Done")}</button></section>;
  const { x, part, miss } = it, opts = perm.map(i => x.options[i]), answer = perm.indexOf(x.answer - 1) + 1;
  const step = miss.step;   // rights so far (before this answer)
  const pick = (m: number) => {
    if (chosen) return; setChosen(m); const right = m === answer;
    if (cur.retry) return;   // the same-session retry doesn't count
    const cleared = Mistakes.answer(miss, right);
    setTally(t => ({ right: t.right + (right ? 1 : 0), wrong: t.wrong + (right ? 0 : 1), cleared: t.cleared + (cleared ? 1 : 0) }));
    if (!right) setQueue(q => [...q, { k: cur.k, retry: true }]);
  };
  const next = () => { setPos(pos + 1); setChosen(0); scrollTo(0, 0); };
  return (
    <section className="rdt voc q-pad exr">
      {back}
      <Head part={part.ja} count={`${pos + 1} / ${queue.length}`} show={false} onOver={() => {}} tr={p.tr} />
      <p className="exr-src"><span>{it.title}</span>{cur.retry ? <em>{p.tr("again")}</em>
        : <span className="exr-steps" aria-label={`${step} of ${Mistakes.GAPS.length} right`}>{Mistakes.GAPS.map((_, k) => <i key={k} className={k < step ? "on" : ""} />)}</span>}</p>
      {part.instr && <p className="voc-instr">{part.instr}</p>}
      {part.text && <article className="rd-text voc-text">{part.text.split("\n").filter(Boolean).map((l, k) => <p key={k}>{vocMark(l)}</p>)}</article>}
      <div className="rd-q"><p className="rd-qt"><span>{vocMark(x.q)}</span></p>
        <Options opts={opts} answer={answer} chosen={chosen} render={vocMark} grid={part.key !== "yoho" && opts.every(o => o.length <= 9)} onPick={pick} />
        {chosen && x.full ? <p className="voc-full">{x.full}</p> : null}{chosen && x.why ? <p className="t-why">{x.why}</p> : null}</div>
      {chosen ? <div className="q-nav"><button type="button" className="main" onClick={next}>{p.tr(pos + 1 < queue.length ? "Next" : "Finish")}</button></div> : null}
    </section>
  );
}

/* ---------------- listening test ---------------- */
type LsnItem = { intro?: string; lines: [string, string, string?][]; question?: string; options: string[]; answer: number; why?: string;
  audio: string; at?: number[]; atQ?: number; sub?: { question: string; options: string[]; answer: number; why?: string }[] };
export type ListenTestData = { title: string; parts: { ja: string; spoken?: boolean; items: LsnItem[] }[] };
const SPK: Record<string, string> = { F: "女", F2: "女", M: "男", M2: "男", N: "" };

export function ListenTest(p: Common & { id: string; T: ListenTestData; setTitle: (t: string) => void }) {
  const nos: Record<string, number> = {};   // 番 counts on across parts with the same title (統合理解 1番, 2番, 3番)
  const Q = p.T.parts.flatMap(pt => pt.items.flatMap(it => { const no = nos[pt.ja] = (nos[pt.ja] || 0) + 1;
    return it.sub ? it.sub.map((x, j) => ({ ...it, ...x, part: pt, no, subNo: j + 1 })) : [{ ...it, part: pt, no, subNo: 0 }]; }));
  const exam = p.mode === "exam", review = p.mode === "review";
  const q = useQuiz("lsn", p.id, () => new Array(Q.length).fill(0) as number[], pk => pk.map(x => [x]), p.mode, p.init);
  const [played, setPlayed] = useState<Set<number>>(() => new Set());   // exam: each recording plays once
  const el = useClock(exam && !q.done);
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
    const parts = [...new Set(p.T.parts.map(pt => pt.ja))].map(ja => { const idx = Q.map((x, k) => [x, k] as const).filter(([x]) => x.part.ja === ja);
      return [ja, idx.filter(([x, k]) => pk[k] === x.answer).length, idx.length] as [string, number, number]; });
    if (exam) { if (!saved.current) { saved.current = true; Quiz.saveExam("lsn", p.id, Math.round(right / Q.length * 100), el); }
      return <ExamResult right={right} total={Q.length} parts={parts} time={el} limit={0} back="Listening" tr={p.tr} onBack={p.onBack} onReview={() => p.onReview?.(pk)} onAgain={() => p.onAgain?.()} />; }
    if (!saved.current) { saved.current = true; Quiz.saveScore("lsn", p.id, right); Quiz.clear("lsn", p.id); }
    return <Result right={right} total={Q.length} skipped={pk.filter(x => !x).length} parts={parts} back="Listening" tr={p.tr} onBack={p.onBack} onAgain={() => { saved.current = false; q.again(); }} />;
  }

  const it = Q[q.i], ans = q.picked[q.i];
  const times: number[] = [...(it.intro ? [0] : []), ...(it.at || []), ...(it.question && !it.subNo && it.atQ != null ? [it.atQ] : [])];
  const mine = () => PLAYER.dataset.q === it.audio;
  const start = (at?: number) => {
    if (!mine()) { PLAYER.src = `data/listening/${it.audio}`; PLAYER.dataset.q = it.audio; }
    const mark = () => { const now = mine() && !PLAYER.paused ? PLAYER.currentTime + 0.05 : -1; let cur = -1; times.forEach((t, k) => { if (t <= now) cur = k; }); setSpoken(cur); };
    PLAYER.onended = () => { setPlaying(false); setProgress(100); mark(); if (exam) setPlayed(s => new Set(s).add(q.i)); };
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
  const numsOnly = !!it.part.spoken && (!ans || exam), once = exam && played.has(q.i) && !playing;
  return (
    <section className="lsn lsn-pad">
      <button className="nav-btn" data-back="Listening" onClick={() => { PLAYER.pause(); PLAYER.ontimeupdate = null; p.onBack(); }}>Back</button>
      <Head part={it.part.ja} count={`${it.no}番${it.subNo ? ` 質問${it.subNo}` : ""} · ${q.i + 1} / ${Q.length}`} show={p.mode === "practice" || !p.mode ? Quiz.anyAnswered(q.picked) : false}
        onOver={() => { PLAYER.pause(); q.over(); }} tr={p.tr} clock={exam ? { text: mm(el), low: false } : null} />
      <div className="lsn-player">
        <button type="button" className="lsn-play" aria-label={playing ? "Pause" : "Play"} disabled={once} onClick={toggle} dangerouslySetInnerHTML={{ __html: playing ? PAUSE_ICO : PLAY_ICO }} />
        <div className="lsn-bar"><i style={{ width: `${progress}%` }} /></div>
      </div>
      {numsOnly && <p className="lsn-hear">{p.tr("Answers are only heard. Pick a number.")}</p>}
      <Options opts={it.options} answer={it.answer} chosen={ans} render={o => o} nums={numsOnly} exam={exam}
        onPick={m => { if (review) return; const y = scrollY; const next = [...q.picked]; next[q.i] = m; if (!exam) { PLAYER.pause(); setPlaying(false); } q.pick(next); requestAnimationFrame(() => scrollTo(0, y)); }} />
      {ans && it.why && !exam ? <p className="t-why">{it.why}</p> : null}
      {!exam && <details className="lsn-script" open={scriptOpen} onToggle={e => setScriptOpen((e.target as HTMLDetailsElement).open)}>
        <summary>{p.tr("Script")}</summary><div className="lsn-body">
          {it.intro ? line(0, "lsn-nar", it.intro, "intro") : null}
          {it.lines.map(([spk, t], k) => line(it.at ? it.at[k] : null, "", <>{SPK[spk] ? <b>{`${SPK[spk]}：`}</b> : null}{t}</>, "l" + k))}
          {it.question ? line(it.subNo ? null : it.atQ, "lsn-nar", it.question, "q") : null}
        </div></details>}
      <Dock host={host} i={q.i} n={Q.length} tr={p.tr} noPrev={exam} last={exam ? "Finish" : review ? "Done" : undefined}
        onGo={d => review && q.i + d >= Q.length ? p.onBack() : go(d)} />
    </section>
  );
}
