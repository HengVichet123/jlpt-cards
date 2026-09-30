/* Practice home: saved sessions (Anki-style New / Learn / Due), rename in place, delete with Undo,
   bottom dock (Quick 10 | New session | Random) and the New session sheet sliding in from the right.
   Markup and class names are the same as the single-file version (v155), so the look is unchanged. */
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import * as Sess from "../practice/sessions";
import { profile, status, settings } from "../practice/srs";
import * as SRS from "../practice/srs";
import { useBodyHost } from "../react/float";
import type { Session } from "../practice/sessions";

type CardKind = "words" | "kanji" | "grammar";
export type SheetData = {
  level: string; from: string; hasReading: boolean;
  n: Record<CardKind, number>; newLeft: Record<CardKind, number>;
  sections: { lv: string; items: { id: string; label: string }[] }[] | null; section?: string;
  reading: { title: string; words: number; kanji: number; grammar: number } | null;
  placeholder: string;
};
/** A built-in session from the learning plan (a day, all cards of a level, quiz mistakes). */
export type PlanRow = { id: string; name: string; ids: import("../practice/srs").CardRef[] };
export type PlanData = { today: PlanRow[]; days: { lv: string; rows: PlanRow[]; current: number }[]; all: PlanRow[]; mistakes: PlanRow | null };
export type PracticeHomeProps = {
  plan: PlanData | null;
  onPlan: (row: PlanRow) => void;
  ja: boolean;
  tr: (s: string) => string;           // app translation (Japanese-only mode)
  calm: boolean;                       // reduced motion
  sheetOpen: boolean;
  sheet: SheetData;
  origin: string | null;               // opened from Cards / a section: back goes there
  onOrigin: () => void;
  onResume: (id: string) => void;
  onQuick: () => void;
  onSheet: (open: boolean) => void;    // keeps the app's PG_NEW in step
  onLevel: (l: string) => void;
  onFrom: (f: string) => void;
  onSection: (id: string) => void;
  onStart: (name: string) => void;
  onChanged: () => void;               // sessions changed (rename/delete): redraw counts
};

const TOOL = <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z M14 6l4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" /></svg>;
const BIN = <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" /></svg>;
const SHOW = 6;



function Num({ v, c }: { v: number; c: string }) {
  return <span className={`deck-n ${c}${v ? "" : " zero"}`}>{v}</span>;
}

/* ---------------- session list ---------------- */
function Ledger({ p, onOpenSheet }: { p: PracticeHomeProps; onOpenSheet: () => void }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [undo, setUndo] = useState<{ se: Session; at: number } | null>(null);
  const undoTimer = useRef<number>(0);
  const nameRef = useRef<HTMLSpanElement>(null);
  const binDown = useRef(false);

  useLayoutEffect(() => {   // renaming: focus the name and select it
    const n = nameRef.current; if (!n) return;
    n.focus(); const r = document.createRange(); r.selectNodeContents(n);
    const sel = getSelection(); sel?.removeAllRanges(); sel?.addRange(r);
  }, [editing]);
  useEffect(() => () => clearTimeout(undoTimer.current), []);

  const all = Sess.open().sort((a, b) => (b.at || 0) - (a.at || 0));
  if (!all.length && !undo && !p.plan) {   // nothing saved yet: three empty rows invite a first session
    return (
      <div className="deck-table"><div className="deck-head" aria-hidden="true"><span className="dh-name">{p.tr("Sessions")}</span><span>New</span><span>Learn</span><span>Due</span></div>
        <ul className="deck-list">{[1, 2, 3].map(i => (
          <li key={i}><button type="button" className="deck ghost" aria-label="Empty. Start a new session" onClick={onOpenSheet}>
            <span className="deck-name">{p.ja ? "空のセッション" : "Empty session"}</span><Num v={0} c="" /><Num v={0} c="" /><Num v={0} c="" />
          </button></li>))}</ul></div>
    );
  }

  const commit = (id: string) => {
    const se = Sess.list().find(x => x.id === id), n = nameRef.current;
    if (se && n) {
      const v = (n.textContent || "").replace(/\s+/g, " ").trim().slice(0, 40), nm = !v || v === se.label ? "" : v;
      if (nm !== (se.name || "")) { const list = Sess.list(), i = list.findIndex(x => x.id === se.id); list[i] = { ...se, name: nm }; Sess.saveAll(list); }
    }
    setEditing(null); p.onChanged();
  };
  const remove = (id: string) => {
    const se = all.find(x => x.id === id)!; setUndo({ se, at: all.indexOf(se) }); Sess.drop(id); setEditing(null);
    clearTimeout(undoTimer.current); undoTimer.current = window.setTimeout(() => setUndo(null), 7000);
    p.onChanged();
  };
  const restore = () => { if (!undo) return; Sess.saveAll([...Sess.list(), undo.se]); setUndo(null); clearTimeout(undoTimer.current); p.onChanged(); };

  const vis = showAll ? all : all.filter((se, i) => i < SHOW || se.id === editing);
  const rows = vis.map(se => {
    const c = Sess.counts(se), nm = Sess.name(se);
    if (se.id === editing) return (
      <li key={se.id} className="renaming" data-sid={se.id}>
        <div className="deck">
          <span ref={nameRef} className="deck-name" contentEditable="plaintext-only" suppressContentEditableWarning spellCheck={false} enterKeyHint="done" aria-label="Session name"
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); }
              if (e.key === "Escape") { e.currentTarget.textContent = nm; e.currentTarget.blur(); } }}
            onBlur={() => { if (!binDown.current) commit(se.id); binDown.current = false; }}>{nm}</span>
          <Num v={c.n} c="new" /><Num v={c.l} c="learn" /><Num v={c.d} c="due" />
        </div>
        <button type="button" className="deck-tool deck-bin" aria-label={`Delete ${nm}`} onPointerDown={() => { binDown.current = true; }} onClick={() => remove(se.id)}>{BIN}</button>
      </li>);
    return (
      <li key={se.id}>
        <button type="button" className="deck" data-sid={se.id} aria-label={`${nm}: ${c.n} new, ${c.l} learning, ${c.d} due`} onClick={() => p.onResume(se.id)}>
          <span className="deck-name">{nm}</span><Num v={c.n} c="new" /><Num v={c.l} c="learn" /><Num v={c.d} c="due" />
        </button>
        <button type="button" className="deck-tool" data-edit={se.id} aria-label={`Rename ${nm}`} onClick={e => { e.stopPropagation(); setEditing(se.id); }}>{TOOL}</button>
      </li>);
  });
  if (undo) rows.splice(Math.min(undo.at, rows.length), 0,
    <li key="undo" className="sess-undo" role="status"><span>{`“${Sess.name(undo.se)}” deleted`}</span><button type="button" className="sess-undo-btn" onClick={restore}>{p.tr("Undo")}</button></li>);

  return (<>
    <div className="deck-table"><div className="deck-head" aria-hidden="true"><span className="dh-name">{p.tr("Sessions")}</span><span>New</span><span>Learn</span><span>Due</span></div>
      <ul className="deck-list"><PlanItems p={p} />{rows.length ? <li className="own-sep" aria-hidden="true" /> : null}{rows}
        {all.length > SHOW && <li className="plan-li"><button type="button" className="deck more plan-fold" aria-expanded={showAll} onClick={() => setShowAll(!showAll)}>
          <span className="deck-name">{showAll ? p.tr("Show less") : `… ${all.length - SHOW} ${p.tr("more")}`}</span></button></li>}</ul></div>
  </>);
}

/* ---------------- progress: mastered / learning / struggling / not seen, per level (tap = per type) ---------------- */
type Stat = { m: number; l: number; s: number; u: number };
const STATUS: [keyof Stat, string, string][] = [["m", "Mastered", "st-m"], ["l", "Learning", "st-l"], ["s", "Struggling", "st-s"], ["u", "Not seen", "st-u"]];
function statOf(ids: import("../practice/srs").CardRef[]): Record<string, Stat> {
  const set = settings();
  const out: Record<string, Stat> = { all: { m: 0, l: 0, s: 0, u: 0 }, words: { m: 0, l: 0, s: 0, u: 0 }, kanji: { m: 0, l: 0, s: 0, u: 0 }, grammar: { m: 0, l: 0, s: 0, u: 0 } };
  for (const [lv, t, no] of ids) {
    const st = status(profile(lv, t, no), set);   // Anki: mature = mastered, leech = struggling
    const k: keyof Stat = st === "new" ? "u" : st === "mature" ? "m" : st === "leech" ? "s" : "l";
    out.all[k]++; out[t][k]++;
  }
  return out;
}
function Progress({ p }: { p: PracticeHomeProps }) {
  const [open, setOpen] = useState<string | null>(null);
  if (!p.plan) return null;
  return (
    <div className="prog">{p.plan.all.map(r => { const lv = r.id.split(":")[1], S = statOf(r.ids), total = r.ids.length;
      const bar = (st: Stat, n: number) => <div className="prog-bar" aria-hidden="true">{STATUS.map(([k, , c]) => st[k] ? <i key={k} className={c} style={{ flexGrow: st[k] / n }} /> : null)}</div>;
      return <div key={lv} className="prog-lv">
        <button type="button" className="prog-row" aria-expanded={open === lv} onClick={() => setOpen(open === lv ? null : lv)}>
          <span className="prog-name">{lv}<small>{`${total - S.all.u} / ${total}`}</small></span>{bar(S.all, total)}</button>
        <div className="prog-legend">{STATUS.map(([k, name, c]) => <span key={k}><i className={c} />{`${p.tr(name)} ${S.all[k]}`}</span>)}</div>
        {open === lv && <table className="prog-table"><thead><tr><th />{STATUS.map(([k, name]) => <th key={k}>{p.tr(name)}</th>)}</tr></thead>
          <tbody>{(["words", "kanji", "grammar"] as const).map(t => <tr key={t}><th>{p.tr(t[0].toUpperCase() + t.slice(1))}</th>{STATUS.map(([k]) => <td key={k}>{S[t][k]}</td>)}</tr>)}</tbody></table>}
      </div>; })}</div>
  );
}

/* ---------------- plan: today, days, all cards, quiz mistakes ---------------- */
/** The plan's rows (today, all days, all cards, exam mistakes), shown at the top of the one Sessions table. */
function PlanItems({ p }: { p: PracticeHomeProps }) {
  const [openLv, setOpenLv] = useState<string | null>(null);
  const plan = p.plan; if (!plan) return null;
  const row = (r: PlanRow, cls = "") => { const c = Sess.counts({ ids: r.ids, done: [] } as unknown as Session);
    return <li key={r.id} className={`plan-li ${cls}`}><button type="button" className="deck" data-plan={r.id} aria-label={`${r.name}: ${c.n} new, ${c.l} learning, ${c.d} due`} onClick={() => p.onPlan(r)}>
      <span className="deck-name">{r.name}</span><Num v={c.n} c="new" /><Num v={c.l} c="learn" /><Num v={c.d} c="due" /></button></li>; };
  return <>
    {plan.days.map(d => [
      <li key={"days-" + d.lv} className="plan-li"><button type="button" className="deck plan-fold" aria-expanded={openLv === d.lv} onClick={() => setOpenLv(openLv === d.lv ? null : d.lv)}>
        <span className="deck-name">{`${d.lv} · ${p.tr("Days")}`}<small>{`${d.rows.length}`}</small></span><span className="plan-chev" aria-hidden="true">›</span></button></li>,
      ...(openLv === d.lv ? d.rows.map(r => row(r, "plan-day")) : [])])}
    {plan.all.map(r => row(r))}
    {plan.mistakes && row(plan.mistakes, "plan-miss")}
  </>;
}

/* ---------------- New session sheet ---------------- */
function Stepper({ t, glyph, name, p, n, setN }: { t: CardKind; glyph: string; name: string; p: PracticeHomeProps; n: Record<CardKind, number>; setN: (t: CardKind, v: number) => void }) {
  return (
    <div className="set-row">
      <div className="set-name"><span className="set-glyph">{glyph}</span><span><b>{p.tr(name)}</b><small>{p.tr(`${p.sheet.newLeft[t]} new left`)}</small></span></div>
      <div className="stepper" data-t={t}>
        <button type="button" aria-label={`Fewer ${name}`} onClick={() => setN(t, n[t] - 1)}>−</button>
        <output>{n[t]}</output>
        <button type="button" aria-label={`More ${name}`} onClick={() => setN(t, n[t] + 1)}>+</button>
      </div>
    </div>
  );
}

function Sheet({ p, closing, onClose, host }: { p: PracticeHomeProps; closing: boolean; onClose: () => void; host: HTMLElement }) {
  const s = p.sheet, inSec = s.from === "section", inRead = s.from === "reading" && !!s.reading;
  const [n, setNState] = useState(s.n);
  const [name, setName] = useState("");
  useEffect(() => setNState(s.n), [s.n.words, s.n.kanji, s.n.grammar]);
  const setN = (t: CardKind, v: number) => {
    const c = Math.max(0, Math.min(99, v)), next = { ...n, [t]: c }; setNState(next);
    const st = Sess.state(); st.n[t] = c; Sess.setState(st);   // saved as you tap, like before
  };
  const total = inSec ? n.words : n.words + n.kanji + n.grammar;
  const x0 = useRef<number | null>(null);
  const seg = (items: [string, string][], cur: string, on: (v: string) => void, cls = "", id?: string) => (
    <div className={`seg ${cls}`.trim()} id={id} role="radiogroup">
      {items.map(([v, l]) => <button key={v} type="button" role="radio" aria-checked={cur === v} className={cur === v ? "on" : ""} onClick={() => on(v)}>{p.tr(l)}</button>)}
    </div>);

  useEffect(() => {   // slide in on the next frames (same as before)
    if (closing) { document.body.classList.remove("sheet-open"); return; }
    const a = requestAnimationFrame(() => requestAnimationFrame(() => document.body.classList.add("sheet-open")));
    return () => cancelAnimationFrame(a);
  }, [closing]);
  useEffect(() => () => document.body.classList.remove("sheet-open"), []);

  return createPortal(<>
    <div className="pg-scrim" onClick={onClose} />
    <aside className="pg-sheet" role="dialog" aria-modal="true" aria-label="New session"
      onTouchStart={e => { x0.current = e.touches[0].clientX; }}
      onTouchEnd={e => { if (x0.current !== null && e.changedTouches[0].clientX - x0.current > 80) onClose(); x0.current = null; }}>
      <div className="pg-sheet-head"><button type="button" className="pg-sheet-x" aria-label="Close" onClick={onClose}>‹</button><b>{p.ja ? "新しいセッション" : "New session"}</b></div>
      <div className="pg-sheet-body play-setup"><div className="pg-new">
        <div className="set-label">{p.tr("Level")}</div>
        {seg([["ALL", "ALL"], ["N1", "N1"], ["N2", "N2"]], s.level, p.onLevel)}
        <div className="set-label">{p.tr("From")}</div>
        {seg([["all", "All cards"], ["section", "Section"], ...(s.hasReading ? [["reading", "Reading"] as [string, string]] : [])], s.from || "all", p.onFrom, s.hasReading ? "" : "seg-2", "pgFrom")}
        {inSec && s.sections && <select className="sec-select" value={s.section} onChange={e => p.onSection(e.target.value)}>
          {s.sections.map(g => <optgroup key={g.lv} label={g.lv}>{g.items.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}</optgroup>)}
        </select>}
        {inRead && s.reading && <div className="rd-from">📖 <b>{s.reading.title}</b> <span>{p.tr(`${s.reading.words} words · ${s.reading.kanji} kanji · ${s.reading.grammar} grammar`)}</span></div>}
        <div className="set-label">{p.tr("Cards per session")}</div>
        <div className="set-rows">
          <Stepper t="words" glyph="語" name="Words" p={p} n={n} setN={setN} />
          {!inSec && <Stepper t="kanji" glyph="字" name="Kanji" p={p} n={n} setN={setN} />}
          {!inSec && <Stepper t="grammar" glyph="文" name="Grammar" p={p} n={n} setN={setN} />}
        </div>
        <div className="set-label"><label htmlFor="pgName">{p.tr("Name")}</label></div>
        <input id="pgName" className="pg-name" maxLength={40} autoComplete="off" placeholder={s.placeholder} value={name} onChange={e => setName(e.target.value)} />
        <button className="go start" id="pgGo" onClick={() => p.onStart(name.trim())}>
          {p.ja ? <>始める・<span>{total}</span>枚</> : <>Start · <span>{total}</span> cards</>}
        </button>
      </div></div>
    </aside>
  </>, host);
}

/* ---------------- Edit: the scheduling numbers (Anki's deck options) ---------------- */
function EditSheet({ p, closing, onClose, host }: { p: PracticeHomeProps; closing: boolean; onClose: () => void; host: HTMLElement }) {
  const [s, setS] = useState(SRS.settings()), x0 = useRef<number | null>(null);
  useEffect(() => {
    if (closing) { document.body.classList.remove("sheet-open"); return; }
    const a = requestAnimationFrame(() => requestAnimationFrame(() => document.body.classList.add("sheet-open")));
    return () => cancelAnimationFrame(a);
  }, [closing]);
  useEffect(() => () => document.body.classList.remove("sheet-open"), []);
  const put = (patch: Partial<SRS.Settings>) => { const next = { ...s, ...patch }; setS(next); SRS.saveSettings(next); };
  const list = (v: string) => v.split(/[\s,]+/).map(Number).filter(n => n > 0);
  const num = (id: string, label: string, sub: string, value: number, set: (n: number) => void, step = 1) => (
    <div className="srs-row"><label htmlFor={id}>{p.tr(label)}<small>{p.tr(sub)}</small></label>
      <input id={id} type="number" inputMode="decimal" min={0} step={step} value={value} onChange={e => { const n = +e.target.value; if (n > 0) set(n); }} /></div>);
  const steps = (id: string, label: string, sub: string, value: number[], set: (a: number[]) => void) => (
    <div className="srs-row"><label htmlFor={id}>{p.tr(label)}<small>{p.tr(sub)}</small></label>
      <input id={id} type="text" inputMode="numeric" defaultValue={value.join(" ")} onBlur={e => { const a = list(e.target.value); if (a.length) set(a); }} /></div>);
  return createPortal(<>
    <div className="pg-scrim" onClick={onClose} />
    <aside className="pg-sheet" role="dialog" aria-modal="true" aria-label="Edit"
      onTouchStart={e => { x0.current = e.touches[0].clientX; }}
      onTouchEnd={e => { if (x0.current !== null && e.changedTouches[0].clientX - x0.current > 80) onClose(); x0.current = null; }}>
      <div className="pg-sheet-head"><button type="button" className="pg-sheet-x" aria-label="Close" onClick={onClose}>‹</button><b>{p.tr("Edit")}</b></div>
      <div className="pg-sheet-body flag-body"><div className="srs-form" key={JSON.stringify(s.steps) + s.relearn.join()}>
        {steps("srsSteps", "Learning steps", "minutes, e.g. 1 10", s.steps, a => put({ steps: a }))}
        {num("srsGrad", "Graduating interval", "days after the last step (Good)", s.gradIvl, n => put({ gradIvl: n }))}
        {num("srsEasy", "Easy interval", "days when a new card is Easy", s.easyIvl, n => put({ easyIvl: n }))}
        {steps("srsRelearn", "Relearning steps", "minutes after Again on a known card", s.relearn, a => put({ relearn: a }))}
        {num("srsEase", "Starting ease", "%: Good multiplies the interval by this", Math.round(s.ease0 * 100), n => put({ ease0: n / 100 }), 10)}
        {num("srsBonus", "Easy bonus", "%: extra on Easy", Math.round(s.easyBonus * 100), n => put({ easyBonus: n / 100 }), 5)}
        {num("srsHard", "Hard interval", "%: Hard multiplies the interval by this", Math.round(s.hardIvl * 100), n => put({ hardIvl: n / 100 }), 5)}
        {num("srsLeech", "Struggling after", "times Again on a known card (Anki's leech)", s.leech, n => put({ leech: n }))}
        {num("srsMature", "Mastered from", "days between reviews (Anki's mature)", s.mature, n => put({ mature: n }))}
        <button type="button" className="srs-reset" onClick={() => { SRS.resetSettings(); setS(SRS.settings()); }}>{p.tr("Reset to Anki defaults")}</button>
      </div></div>
    </aside>
  </>, host);
}

/* ---------------- screen ---------------- */
export function PracticeHome(p: PracticeHomeProps) {
  const host = useBodyHost();
  const [open, setOpen] = useState(p.sheetOpen);
  const [closing, setClosing] = useState(false);
  useEffect(() => { if (p.sheetOpen) { setOpen(true); setClosing(false); } }, [p.sheetOpen]);

  const openSheet = () => p.onSheet(true);
  const [editOpen, setEditOpen] = useState(false), [editClosing, setEditClosing] = useState(false);
  const closeEdit = () => { if (p.calm) { document.body.classList.remove("sheet-open"); setEditOpen(false); p.onChanged(); return; }
    setEditClosing(true); setTimeout(() => { setEditOpen(false); setEditClosing(false); p.onChanged(); }, 320); };   // the app computes the sheet's numbers, then opens it (sheetOpen)
  const closeSheet = () => {
    p.onSheet(false);
    if (p.origin) { setOpen(false); p.onOrigin(); return; }   // came from Cards / a section: leaving the sheet goes back there
    if (p.calm) { setOpen(false); return; }
    setClosing(true); window.setTimeout(() => { setOpen(false); setClosing(false); }, 320);
  };

  return (<>
    <section className="play-setup pg-home">
      {p.origin && <button className="nav-btn" data-back={p.origin} onClick={p.onOrigin}>Back</button>}
      <Progress p={p} />
      <div className="pg-actions">   {/* v176: a fixed row in the page, above the sessions (no floating dock) */}
        <button type="button" className="pg-act" onClick={p.onQuick}>{p.ja ? "クイック10" : "Quick 10"}</button>
        <button type="button" className="pg-act main" onClick={openSheet}>{p.ja ? "新規" : "New session"}</button>
        <button type="button" className="pg-act" onClick={() => { setEditClosing(false); setEditOpen(true); }}>{p.tr("Edit")}</button>
      </div>
      <Ledger p={p} onOpenSheet={openSheet} />
    </section>
    {open && <Sheet p={p} closing={closing} onClose={closeSheet} host={host} />}
    {editOpen && <EditSheet p={p} closing={editClosing} onClose={closeEdit} host={host} />}
  </>);
}
