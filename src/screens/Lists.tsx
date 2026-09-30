/* Card lists: Complete list, Sections (table of contents) and one section.
   Cards are the app's card HTML (mini ↔ full on tap is handled app-wide); lists grow as you scroll. */
import { Fragment, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useBodyHost } from "../react/float";

type Tr = (s: string) => string;
type Card = { no: number; level?: string };

/** Cards drawn in pages of `page`; the next page is added when the end comes near. Old pages are never redrawn,
    so a card opened in place (mini → full) stays open. */
export function CardPages<C extends Card>({ cards, html, page = 60, sentinel, atLeast = 0 }: { cards: C[]; html: (c: C) => string; page?: number;
  sentinel: React.RefObject<HTMLElement | null>; atLeast?: number }) {
  const [shown, setShown] = useState(Math.max(page, Math.ceil(atLeast / page) * page));
  useEffect(() => {
    const el = sentinel.current; if (!el || cards.length <= page) return;
    const grow = () => { if (!el.isConnected) return; if (el.getBoundingClientRect().top > innerHeight + 800) return; setShown(n => Math.min(cards.length, n + page)); };
    const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) grow(); }, { rootMargin: "800px" });
    io.observe(el); addEventListener("scroll", grow, { passive: true });
    return () => { io.disconnect(); removeEventListener("scroll", grow); };
  }, [cards, page]);
  const chunks: C[][] = [];
  for (let i = 0; i < Math.min(shown, cards.length); i += page) chunks.push(cards.slice(i, i + page));
  return <>{chunks.map((ch, k) => <div key={k} className="rx-chunk" dangerouslySetInnerHTML={{ __html: ch.map(html).join("") }} />)}</>;
}

/* ---------------- Complete list ---------------- */
type Pool = Record<"words" | "kanji" | "grammar", Card[]>;
export type Bookmark = { c: number; k: string; t: string; lv: string; no: number; at: number };
const BM_ICON = <svg viewBox="0 0 24 24" width="21" height="21" aria-hidden="true"><path d="M6.5 3.5h11v17l-5.5-4-5.5 4z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>;
const TYPE = { words: "Words", kanji: "Kanji", grammar: "Grammar" } as Record<string, string>;
/** The flags, in a card sliding in from the right (like Settings from the gear). Placed flag = tap to go there. */
function FlagSheet({ colors, marks, closing, onPick, onClose, tr }: { colors: string[]; marks: Bookmark[]; closing: boolean; onPick: (b: Bookmark) => void; onClose: () => void; tr: Tr }) {
  const host = useBodyHost(), x0 = useRef<number | null>(null);
  useEffect(() => {
    if (closing) { document.body.classList.remove("sheet-open"); return; }
    const a = requestAnimationFrame(() => requestAnimationFrame(() => document.body.classList.add("sheet-open")));
    return () => cancelAnimationFrame(a);
  }, [closing]);
  useEffect(() => () => document.body.classList.remove("sheet-open"), []);
  return createPortal(<>
    <div className="pg-scrim" onClick={onClose} />
    <aside className="pg-sheet" role="dialog" aria-modal="true" aria-label="Bookmarks"
      onTouchStart={e => { x0.current = e.touches[0].clientX; }}
      onTouchEnd={e => { if (x0.current !== null && e.changedTouches[0].clientX - x0.current > 80) onClose(); x0.current = null; }}>
      <div className="pg-sheet-head"><button type="button" className="pg-sheet-x" aria-label="Close" onClick={onClose}>‹</button><b>{tr("Bookmarks")}</b></div>
      <div className="pg-sheet-body flag-body"><ul className="flag-rows">{colors.map((col, c) => { const b = marks.find(x => x.c === c);
        return <li key={c}><button type="button" className="flag-row" style={{ ["--stk" as string]: col }} disabled={!b} onClick={() => b && onPick(b)}
          aria-label={b ? `Go to bookmark ${c + 1}` : `Bookmark ${c + 1} not placed`}>
          <span className="flag" />{b ? <span className="flag-at">{`${b.lv} · ${tr(TYPE[b.t])}`}</span> : null}{b ? <span className="flag-go" aria-hidden="true">›</span> : null}</button></li>; })}</ul>
        <p className="flag-note">{tr("Double-tap a card to stick a flag on it.")}</p></div>
    </aside>
  </>, host);
}
const GEAR = <svg viewBox="0 0 24 24" width="21" height="21" aria-hidden="true"><path fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z" /><path fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" d="M19.4 13.5a7.7 7.7 0 0 0 0-3l2-1.6-2-3.4-2.4.9a7.6 7.6 0 0 0-2.6-1.5L14 2.4h-4l-.4 2.5A7.6 7.6 0 0 0 7 6.4l-2.4-.9-2 3.4 2 1.6a7.7 7.7 0 0 0 0 3l-2 1.6 2 3.4 2.4-.9a7.6 7.6 0 0 0 2.6 1.5l.4 2.5h4l.4-2.5a7.6 7.6 0 0 0 2.6-1.5l2.4.9 2-3.4Z" /></svg>;
/** Which cards the list shows: all of the level, or one day of the plan (a hook to look over, not a schedule). */
function DaySheet({ level, days, day, closing, onPick, onClose, tr }: { level: string; days: number; day: number | null; closing: boolean; onPick: (d: number | null) => void; onClose: () => void; tr: Tr }) {
  const host = useBodyHost(), x0 = useRef<number | null>(null);
  useEffect(() => {
    if (closing) { document.body.classList.remove("sheet-open"); return; }
    const a = requestAnimationFrame(() => requestAnimationFrame(() => document.body.classList.add("sheet-open")));
    return () => cancelAnimationFrame(a);
  }, [closing]);
  useEffect(() => () => document.body.classList.remove("sheet-open"), []);
  return createPortal(<>
    <div className="pg-scrim" onClick={onClose} />
    <aside className="pg-sheet" role="dialog" aria-modal="true" aria-label="Show"
      onTouchStart={e => { x0.current = e.touches[0].clientX; }}
      onTouchEnd={e => { if (x0.current !== null && e.changedTouches[0].clientX - x0.current > 80) onClose(); x0.current = null; }}>
      <div className="pg-sheet-head"><button type="button" className="pg-sheet-x" aria-label="Close" onClick={onClose}>‹</button><b>{level}</b></div>
      <div className="pg-sheet-body flag-body">
        <button type="button" className={`day-all${day === null ? " on" : ""}`} aria-pressed={day === null} onClick={() => onPick(null)}>{tr("All cards")}</button>
        <div className="day-grid">{Array.from({ length: days }, (_, k) => k + 1).map(d =>
          <button key={d} type="button" className={d === day ? "on" : ""} aria-pressed={d === day} aria-label={`Day ${d}`} onClick={() => onPick(d)}>{d}</button>)}</div>
      </div>
    </aside>
  </>, host);
}
/** Complete list. Bookmarks are 5 sticky flags: double-tap a card to stick one (handled with the card taps in src/cards/cards.js);
    the flag button shows the 5 colours, tap a placed one to jump to its card. */
export function CompleteList(p: { tr: Tr; level: string; tab: "words" | "kanji" | "grammar"; pool: Pool; html: (t: string, c: Card) => string; onLevel: (l: string) => void;
  marks: () => Bookmark[]; colors: string[]; onJump: (b: Bookmark) => void; jump: { k: string; n: number } | null;
  day: number | null; days: number; onDay: (d: number | null) => void }) {
  const more = useRef<HTMLDivElement>(null), box = useRef<HTMLElement>(null);
  const [marks, setMarks] = useState(p.marks);
  const [open, setOpen] = useState(false), [closing, setClosing] = useState(false);
  const [dayOpen, setDayOpen] = useState(false), [dayClosing, setDayClosing] = useState(false);
  const closeDay = (then?: () => void) => { document.body.classList.remove("sheet-open"); if (then) { setDayOpen(false); then(); return; }
    setDayClosing(true); setTimeout(() => { setDayOpen(false); setDayClosing(false); }, 320); };
  const close = (then?: () => void) => {
    if (then || matchMedia("(prefers-reduced-motion: reduce)").matches) { document.body.classList.remove("sheet-open"); setOpen(false); then?.(); return; }
    setClosing(true); setTimeout(() => { setOpen(false); setClosing(false); }, 320);
  };
  useEffect(() => { const f = () => setMarks(p.marks()); addEventListener("jc:bookmarks", f); return () => removeEventListener("jc:bookmarks", f); }, []);
  const L = { words: "Words", kanji: "Kanji", grammar: "Grammar" }[p.tab];
  const at = p.jump ? p.pool[p.tab].findIndex(c => `${p.tab}:${c.level}:${c.no}` === p.jump!.k) + 1 : 0;
  useEffect(() => {   // after a jump: bring the card to the middle of the screen and flash it
    if (!p.jump) return;
    const [t, lv, no] = p.jump.k.split(":");
    const el = box.current?.querySelector(`.list-card[data-mt="${t}"][data-mlv="${lv}"][data-no="${no}"]`) as HTMLElement | null;
    if (!el) return;
    el.scrollIntoView({ block: "center", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    el.classList.add("bm-flash"); const tm = setTimeout(() => el.classList.remove("bm-flash"), 1600); return () => clearTimeout(tm);
  }, [p.jump?.n]);
  return (
    <section className="complete" ref={box}>
      <div className="complete-head">
        <div><h1>{p.tr("Complete list")}</h1><div className="stat">{p.day ? <b className="day-chip">{`${p.tr("Day")} ${p.day}`}</b> : null}{p.tr(`${p.pool.words.length} words · ${p.pool.kanji.length} kanji · ${p.pool.grammar.length} grammar`)}</div></div>
        <div className="bm-bar">
          <button type="button" className="bm-btn" aria-label={`Bookmarks (${marks.length} of 5 placed)`} onClick={() => { setClosing(false); setOpen(true); }}>{BM_ICON}</button>
          <button type="button" className={`bm-btn${p.day ? " on" : ""}`} aria-label={p.day ? `Showing day ${p.day}` : "Show: all cards or one day"} onClick={() => { setDayClosing(false); setDayOpen(true); }}>{GEAR}</button>
          <div className="seg seg-2" role="radiogroup" aria-label="Level">{["N1", "N2"].map(l =>
            <button key={l} type="button" role="radio" aria-checked={l === p.level} className={l === p.level ? "on" : ""} data-clevel={l} onClick={() => p.onLevel(l)}>{l}</button>)}</div>
        </div>
      </div>
      {dayOpen && <DaySheet level={p.level} days={p.days} day={p.day} closing={dayClosing} tr={p.tr} onClose={() => closeDay()} onPick={d => closeDay(() => p.onDay(d))} />}
      {open && <FlagSheet colors={p.colors} marks={marks} closing={closing} tr={p.tr} onClose={() => close()} onPick={b => close(() => p.onJump(b))} />}
      <div className="tabs tabs-in" role="tablist">{([["words", "語", "Words"], ["kanji", "字", "Kanji"], ["grammar", "文", "Grammar"]] as const).map(([t, j, l]) =>
        <div key={t} className={`tab${t === p.tab ? " on" : ""}`} data-t={t} role="tab" tabIndex={0} aria-selected={t === p.tab}><span className="jp">{j}</span>{p.tr(l)}</div>)}</div>
      <section className="complete-section">
        <h2>{p.tr(L) + " "}<span className="stat">{p.pool[p.tab].length}</span></h2>
        <div className="complete-cards"><CardPages key={p.level + p.tab + (p.day || "") + (p.jump ? p.jump.n : "")} cards={p.pool[p.tab]} html={c => p.html(p.tab, c)} sentinel={more} atLeast={at} /></div>
        <div className="complete-more" aria-hidden="true" ref={more} />
      </section>
    </section>
  );
}

/* ---------------- Sections ---------------- */
export type SectionRow = { id: string; n: number; name: string; en?: string; words: number; seen: number };
export type SectionPart = { title: string; sub: string; rows: SectionRow[] };
const PN = ["一", "二", "三", "四", "五", "六"];
export function SectionsToc(p: { tr: Tr; level: string; total: number; words: number; parts: SectionPart[]; source: string; onLevel: (l: string) => void; onOpen: (id: string) => void }) {
  return (
    <section className="sections toc-page">
      <div className="complete-head"><div><h2 className="toc-h">目次 <small>{p.tr(`${p.total} sections · ${p.words} words`)}</small></h2></div>
        <div className="seg seg-2" role="radiogroup">{["N1", "N2"].map(l =>
          <button key={l} type="button" className={l === p.level ? "on" : ""} data-slevel={l} onClick={() => p.onLevel(l)}>{l}</button>)}</div></div>
      {p.parts.map((pt, pi) => <Fragment key={pi}>
        <h3 className="toc-part"><span>{`第${PN[pi]}部`}</span>{pt.title}<small>{pt.sub}</small></h3>
        <ol className="toc">{pt.rows.map(s => <li key={s.id}><button data-sec={s.id} onClick={() => { p.onOpen(s.id); scrollTo(0, 0); }}>
          <span className="toc-no">{s.n}</span><span className="toc-name">{s.name}{s.en ? <small>{s.en}</small> : null}</span><span className="toc-dots" />
          <span className={`toc-n${s.seen ? " on" : ""}`}>{`${s.seen ? `${s.seen}/` : ""}${s.words}語`}</span></button></li>)}</ol>
      </Fragment>)}
      <p className="story-meta">{p.source}</p>
    </section>
  );
}

export function SectionPage(p: { tr: Tr; name: string; en?: string; meta: string; cardsHtml: string; onBack: () => void; onStudy: () => void }) {
  return (
    <section className="complete">
      <div className="story-top"><button className="nav-btn" id="secBack" data-back="Sections" onClick={p.onBack}>Back</button>
        <button className="nav-btn sec-study" id="secStudy" onClick={p.onStudy}>{p.tr("Study this section")}</button></div>
      <h2 className="sec-title">{p.name}{p.en ? <em>{p.en}</em> : null}<small>{p.meta}</small></h2>
      <div className="complete-cards" dangerouslySetInnerHTML={{ __html: p.cardsHtml }} />
    </section>
  );
}
