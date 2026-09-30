/* Pictures (photos per word), Illustrations (いらすとや, one row per topic) and the picture viewer. */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { startViewer, type ViewerDeps } from "../pictures/viewer";

type Tr = (s: string) => string;
export type PicCat = { key: string; ja: string; en: string; count: number; cover: string; group?: string; first?: string[] };
type Pic = { img: string; credit?: string; page?: string; cap?: string; capEn?: string; exEn?: string };
export type PicWord = { word: string; reading?: string; en?: string; img?: string; credit?: string; page?: string; imgs?: Pic[] };
export const picsOf = (w: PicWord): Pic[] => (w.imgs && w.imgs.length) ? w.imgs : [{ img: w.img!, credit: w.credit, page: w.page }];   // 1–3 pictures per word

export function PicturesHome(p: { tr: Tr; cats: PicCat[]; src: (f: string) => string; loadCredits: () => Promise<{ word: string; n: number | null; credit: string; page: string }[]>; onOpen: (key: string) => void }) {
  const [credits, setCredits] = useState<{ word: string; n: number | null; credit: string; page: string }[] | null>(null);
  return (
    <section className="pics">
      <div className="pic-cats">{p.cats.map(x => (
        <button key={x.key} className={`pic-cat${x.group === "illust" ? " illust" : ""}`} data-pcat={x.key} onClick={() => { p.onOpen(x.key); scrollTo(0, 0); }}>
          <span className="pic-cover"><img src={p.src(x.cover)} alt="" loading="lazy" /></span>
          <b>{x.ja}</b><span>{`${x.en.replace(" (いらすとや)", "")} · ${x.count}`}</span></button>))}</div>
      <details className="ps-credits pic-credits" id="picCredits" onToggle={async e => { if ((e.target as HTMLDetailsElement).open && !credits) setCredits(await p.loadCredits()); }}>
        <summary>{p.tr("Photo credits")}</summary>
        <ol id="picCreditList">{(credits || []).map((c, k) => <li key={k}>{`${c.word}${c.n ? ` (${c.n})` : ""} : `}<a href={c.page} target="_blank" rel="noopener">{c.credit}</a></li>)}</ol></details>
    </section>
  );
}

const IRASUTOYA = <a href="https://www.irasutoya.com/" target="_blank" rel="noopener">いらすとや</a>;
export function Illustrations(p: { rows: { theme: string; en: string; total: number; items: PicCat[] }[]; src: (f: string) => string; onOpen: (key: string) => void }) {
  return (
    <section className="pics ill-rows">
      {p.rows.map((r, ti) => (
        <div key={r.theme} className="ill-row"><h2 className="ill-h"><span className="ill-no">{ti + 1}</span>{r.theme}<small>{`${r.en} · ${r.total.toLocaleString()}`}</small></h2>
          <div className="ill-scroll">{r.items.map(x => (
            <button key={x.key} type="button" className="ill-tile" data-pcat={x.key} onClick={() => { p.onOpen(x.key); scrollTo(0, 0); }}>
              <span className="ill-cover"><img src={p.src(x.cover)} alt="" loading="lazy" /></span><span className="ill-words">{(x.first || []).slice(0, 2).join("・")}</span></button>))}</div></div>))}
      <p className="pic-by">Illustrations by {IRASUTOYA} (みふねたかし). Used for personal study, not for sale.</p>
    </section>
  );
}

export function ExtraTheme(p: { sessions: { key: string; labels: string[]; count: number }[]; onBack: () => void; onOpen: (key: string) => void }) {
  return (
    <section className="pics xtheme">
      <button className="nav-btn" id="xBack" data-back="Illustrations" onClick={() => { p.onBack(); scrollTo(0, 0); }}>Back</button>
      <ul className="x-sessions">{p.sessions.map((x, i) => <li key={x.key}><button type="button" className="x-sess" data-pcat={x.key} onClick={() => { p.onOpen(x.key); scrollTo(0, 0); }}>
        <span className="x-no">{i + 1}</span><span className="x-lab">{x.labels.join("・")}</span><span className="x-n">{x.count}</span></button></li>)}</ul>
      <p className="pic-by">Illustrations by {IRASUTOYA}. Meanings here are automatic (dictionary), so a few may be off.</p>
    </section>
  );
}

/** The viewer: one picture per word, the word, its meaning and a small example (tap it for the English). */
export function PicViewer(p: { catKey: string; words: PicWord[]; back: string; sound: boolean; spk: string; spkOff: string; deps: ViewerDeps;
  clean: (s?: string) => string; onBack: () => void }) {
  const root = useRef<HTMLElement>(null);
  useEffect(() => startViewer(root.current!, p.deps), []);
  const extra = /^x/.test(p.catKey);
  const rei = (cap: string, word: string): ReactNode => { const k = cap.indexOf(word);   // the word itself in bold inside the example
    return k < 0 ? cap : <>{cap.slice(0, k)}<em>{word}</em>{cap.slice(k + word.length)}</>; };
  return (
    <section className={`pv${extra ? " extra" : ""}`} ref={root}>
      <div className="pv-top"><button className="nav-btn" id="pvBack" data-back={p.back} onClick={() => { p.onBack(); scrollTo(0, 0); }}>Back</button>
        <button className="pv-sound" id="pvSound" type="button" aria-pressed={p.sound} aria-label="Sound" dangerouslySetInnerHTML={{ __html: p.sound ? p.spk : p.spkOff }} />
        <span className="pv-ctl"><button id="pvPrev" type="button" aria-label="Previous">‹</button><span className="pv-pos" id="pvPos" /><button id="pvNext" type="button" aria-label="Next">›</button></span></div>
      <div className="pv-bar"><i id="pvBar" /></div>
      <div className="pv-track" id="pvTrack">{p.words.map((w, n) => { const P = picsOf(w), ld = n < 3 ? "eager" : "lazy", c0 = P[0];
        return <div key={n} className="pv-slide" data-n={n}>
          <button className={`pv-photo${/irasutoya/.test(c0.page || "") ? " illust" : ""}`} type="button" data-n={n} aria-label={`Hear ${w.word}`}>
            <img className="pv-bg" src={p.deps.src(c0.img)} alt="" aria-hidden="true" loading={ld} /><img className="pv-fg" src={p.deps.src(c0.img)} alt={w.word} loading={ld} /></button>
          {P.length > 1 && <div className="pv-thumbs">{P.map((x, k) => <button key={k} className={`pv-thumb${k ? "" : " on"}`} type="button" data-src={x.img} aria-label={`Photo ${k + 1} of ${P.length}`}>
            <img src={p.deps.src(x.img)} alt="" loading="lazy" /></button>)}</div>}
          <div className="pv-word"><b className={w.word.length > 5 ? (w.word.length > 9 ? "longer" : "long") : ""}>{w.word}</b>
            {w.reading && w.reading !== w.word ? <span className="pv-rd">{w.reading}</span> : null}
            <span className="pv-en">{c0.capEn || p.clean(w.en)}</span>
            {c0.cap && c0.cap !== w.word ? <span className="pv-rei" role="button" tabIndex={0}>{"例："}{rei(c0.cap, w.word)}{c0.exEn ? <span className="pv-rei-en">{c0.exEn}</span> : null}</span> : null}</div>
        </div>; })}</div>
    </section>
  );
}
