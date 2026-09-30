/* Card lists: Complete list, Sections (table of contents) and one section.
   Cards are the app's card HTML (mini ↔ full on tap is handled app-wide); lists grow as you scroll. */
import { Fragment, useEffect, useRef, useState } from "react";

type Tr = (s: string) => string;
type Card = { no: number; level?: string };

/** Cards drawn in pages of `page`; the next page is added when the end comes near. Old pages are never redrawn,
    so a card opened in place (mini → full) stays open. */
export function CardPages<C extends Card>({ cards, html, page = 60, sentinel }: { cards: C[]; html: (c: C) => string; page?: number; sentinel: React.RefObject<HTMLElement | null> }) {
  const [shown, setShown] = useState(page);
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
export function CompleteList(p: { tr: Tr; level: string; tab: "words" | "kanji" | "grammar"; pool: Pool; html: (t: string, c: Card) => string; onLevel: (l: string) => void }) {
  const more = useRef<HTMLDivElement>(null);
  const L = { words: "Words", kanji: "Kanji", grammar: "Grammar" }[p.tab];
  return (
    <section className="complete">
      <div className="complete-head">
        <div><h1>{p.tr("Complete list")}</h1><div className="stat">{p.tr(`${p.pool.words.length} words · ${p.pool.kanji.length} kanji · ${p.pool.grammar.length} grammar`)}</div></div>
        <div className="seg seg-2" role="radiogroup" aria-label="Level">{["N1", "N2"].map(l =>
          <button key={l} type="button" role="radio" aria-checked={l === p.level} className={l === p.level ? "on" : ""} data-clevel={l} onClick={() => p.onLevel(l)}>{l}</button>)}</div>
      </div>
      <div className="tabs tabs-in" role="tablist">{([["words", "語", "Words"], ["kanji", "字", "Kanji"], ["grammar", "文", "Grammar"]] as const).map(([t, j, l]) =>
        <div key={t} className={`tab${t === p.tab ? " on" : ""}`} data-t={t} role="tab" tabIndex={0} aria-selected={t === p.tab}><span className="jp">{j}</span>{p.tr(l)}</div>)}</div>
      <section className="complete-section">
        <h2>{p.tr(L) + " "}<span className="stat">{p.pool[p.tab].length}</span></h2>
        <div className="complete-cards"><CardPages key={p.level + p.tab} cards={p.pool[p.tab]} html={c => p.html(p.tab, c)} sentinel={more} /></div>
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
