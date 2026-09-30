/* Reading: the Reading home (sections you can reorder by holding + dragging), a shelf of books,
   a book's Cards page (words / grammar / kanji it uses), the clean reader (tap a word for a quick look) and stories. */
import { useEffect, useRef, useState } from "react";

type Tr = (s: string) => string;

export type Book = { id: string; title: string; img?: string; date?: string; chars: number; counts: number[]; shelf?: string };
export type ShelfRow = { key: string; jp: string; en: string; count: number; fan: string[] };

function BookButton({ x }: { x: Book }) {
  const mins = Math.max(1, Math.round(x.chars / 400));
  const first = (x.title.match(/[一-鿿]/) || [x.title[0]])[0];   // typographic cover when there is no picture
  return (
    <button className="book" data-prelearn={x.id} aria-label={x.title}>
      <span className="bk-cover">{x.img ? <img src={`data/readings/${x.img}`} alt="" loading="lazy" /> : <span className="bk-type">{first}</span>}</span>
      <b className="bk-t">{x.title}</b>
      <span className="bk-meta">{`${x.date ? `${+x.date.slice(5, 7)}/${+x.date.slice(8, 10)} · ` : ""}${x.counts[0]}語 · ${mins}分`}</span>
    </button>
  );
}

/** Reading home. `reorder` is the app's hold-and-drag sorter; after a drop the list is redrawn from the saved order. */
export function ReadingHome(p: { tr: Tr; rows: ShelfRow[]; order: number; reorder: (box: HTMLElement, onDrop: () => void) => void;
  justDropped: () => boolean; onTests: () => void; onShelf: (k: string) => void; onReordered: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => { if (box.current) p.reorder(box.current, p.onReordered); }, [p.order]);
  return (
    <section className="library">
      <button className="sec-row rdt-row" id="rdtOpen" onClick={() => { p.onTests(); scrollTo(0, 0); }}>
        <span className="sec-row-t"><b>読解テスト</b><span>{p.tr("JLPT-style reading tests")}</span></span><span className="sec-row-go" aria-hidden="true">›</span></button>
      <div className="sec-rows" id="secRows" ref={box} key={p.order}>
        {p.rows.map(r => (
          <button key={r.key} className="sec-row" data-shelf={r.key} onClick={() => { if (p.justDropped()) return; p.onShelf(r.key); scrollTo(0, 0); }}>
            <span className="sec-row-t"><b>{r.jp}</b><span>{p.tr(r.en)}</span><em>{p.tr(`${r.count} books`)}</em></span>
            <span className="fan">{r.fan.map((img, i) => <img key={i} src={`data/readings/${img}`} alt="" style={{ ["--i" as string]: i }} loading="lazy" />)}</span>
            <span className="sec-row-go" aria-hidden="true">›</span></button>
        ))}
      </div>
    </section>
  );
}

export function Shelf(p: { tr: Tr; jp: string; en: string; items: Book[]; onBack: () => void }) {
  return (
    <section className="library">
      <div className="story-top"><button className="nav-btn" id="shelfBack" data-back="Reading" onClick={() => { p.onBack(); scrollTo(0, 0); }}>Back</button></div>
      <h2 className="sec-title">{p.jp}<em>{p.en}</em><small>{p.tr(`${p.items.length} books`)}</small></h2>
      <div className="shelf-grid">{p.items.map(x => <BookButton key={x.id} x={x} />)}</div>
    </section>
  );
}

/** A book's Cards page: the words, grammar and kanji it uses (the app's card HTML), and Study these. */
export function Prelearn(p: { tr: Tr; title: string; titleEn: string; meta: string; words: string; grammar: string; kanji: string;
  nWords: number; nGrammar: number; nKanji: number; source: string; sourceUrl: string; imgCredit?: string; imgUrl?: string;
  onBack: () => void; onStudy: () => void }) {
  return (
    <section className="reading prelearn">
      <div className="story-top"><button className="nav-btn" id="preBack" data-back="本文" onClick={() => { p.onBack(); scrollTo(0, 0); }}>Back</button>
        <button className="nav-btn pre-read" id="preReadBtn" hidden onClick={() => { p.onBack(); scrollTo(0, 0); }}>Read 本文</button></div>
      <div className="pre-head"><h2 className="sec-title">{p.title}<em>{p.titleEn}</em><small>{p.meta}</small></h2>
        <button className="nav-btn pre-study" id="preStudy" onClick={p.onStudy}>{p.tr("Study these")}</button></div>
      <h3 className="pre-part">言葉 <small>{p.tr(`${p.nWords} words`)}</small></h3>
      <div className="complete-cards" dangerouslySetInnerHTML={{ __html: p.words }} />
      {p.nGrammar ? <><h3 className="pre-part">文法 <small>{p.tr(`${p.nGrammar} grammar`)}</small></h3><div className="complete-cards" dangerouslySetInnerHTML={{ __html: p.grammar }} /></> : null}
      {p.nKanji ? <><h3 className="pre-part">漢字 <small>{p.tr(`${p.nKanji} kanji`)}</small></h3><div className="complete-cards" dangerouslySetInnerHTML={{ __html: p.kanji }} /></> : null}
      <p className="story-meta"><a href={p.sourceUrl} target="_blank" rel="noopener">{p.source}</a>
        {p.imgCredit ? <>{" · "}<a href={p.imgUrl || p.sourceUrl} target="_blank" rel="noopener">{p.imgCredit}</a></> : null}</p>
    </section>
  );
}

/** The clean reader: only the text. Tap a word = its reading + short English for 2 s (and its sound, if on). */
export function Reader(p: { tr: Tr; title: string; html: string; back: string; source: string; sourceUrl: string;
  voice: boolean; speak: (t: string) => void; onVoice: (on: boolean) => void; onShelf: () => void; onCards: () => void }) {
  const [voice, setVoice] = useState(p.voice);
  const [tip, setTip] = useState<{ rd: string; en: string; left: number; top: number } | null>(null);
  const box = useRef<HTMLElement>(null), tipEl = useRef<HTMLDivElement>(null), timer = useRef(0), onWord = useRef<HTMLElement | null>(null);
  const place = useRef<{ w: HTMLElement } | null>(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {   // position the bubble above the tapped word once its size is known
    if (!tip || !place.current || !tipEl.current || !box.current) return;
    const t = tipEl.current, r = place.current.w.getBoundingClientRect(), br = box.current.getBoundingClientRect();
    t.style.left = Math.max(0, Math.min(br.width - t.offsetWidth, r.left - br.left + r.width / 2 - t.offsetWidth / 2)) + "px";
    t.style.top = (r.top - br.top - t.offsetHeight - 8) + "px";
    place.current = null;
  }, [tip]);
  const tap = (e: React.MouseEvent) => {
    const w = (e.target as HTMLElement).closest<HTMLElement>(".tk");
    onWord.current?.classList.remove("on"); onWord.current = null;
    if (!w) { setTip(null); return; }
    w.classList.add("on"); onWord.current = w; place.current = { w };
    setTip({ rd: w.dataset.r || "", en: w.dataset.g || "", left: 0, top: 0 });
    if (voice) p.speak(w.textContent || "");
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => { setTip(null); w.classList.remove("on"); }, 2000);
  };
  return (
    <section className="reader" ref={box} onClick={tap}>
      <div className="story-top"><span className="pre-btns">
        <button className="nav-btn" id="rdShelf" data-back={p.back} onClick={() => { p.onShelf(); scrollTo(0, 0); }}>Back</button>
        <button className="nav-btn" id="rdBack" hidden onClick={() => { p.onCards(); scrollTo(0, 0); }}>Cards</button></span>
        <button className="rd-voice" id="rdVoice" aria-pressed={voice} aria-label="Voice on tap"
          onClick={e => { e.stopPropagation(); const on = !voice; setVoice(on); p.onVoice(on); }}>
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" />
            <path className="wv" d="M16 9.5a3.5 3.5 0 0 1 0 5M18.5 7a7 7 0 0 1 0 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg></button></div>
      <h1 className="reader-title">{p.title}</h1>
      <div className="reader-text" dangerouslySetInnerHTML={{ __html: p.html }} />
      <p className="story-meta"><a href={p.sourceUrl} target="_blank" rel="noopener">{p.source}</a>{p.tr(" · tap a word for English")}</p>
      <div className="tip-bubble" id="tipB" hidden={!tip} ref={tipEl}>
        {tip?.rd ? <span className="tip-rd">{tip.rd}</span> : null}{tip?.en ? <span className="tip-en">{tip.en}</span> : null}</div>
    </section>
  );
}

const Say = ({ text }: { text: string }) => <button className="say" type="button" data-say={text} aria-label="Play sound">🔊</button>;
export function Story(p: { title: string; level: string; source: string; sentences: { jp: string; en: string }[]; onBack: () => void }) {
  return (
    <section className="reading story">
      <div className="story-top"><button className="nav-btn" id="storyBack" data-back="Reading" onClick={p.onBack}>Back</button><Say text={p.sentences.map(x => x.jp).join("")} /></div>
      <div className="story-meta">{`${p.level} · ${p.source}`}</div>
      {p.sentences.map((x, k) => <div key={k} className="ex story-line"><Say text={x.jp} /><span className="jpline">{x.jp}</span><div className="tr">{x.en}</div></div>)}
    </section>
  );
}
