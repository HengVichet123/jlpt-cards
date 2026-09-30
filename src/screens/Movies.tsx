/* Movies: the list of films/novels, a film (theatre) and a novel page with Listen.
   Markup here; playback in src/movies/player.ts (started on mount, stopped on unmount). */
import { useEffect, useRef } from "react";
import { startNovel, startTheatre, type Deps, type NovelData } from "../movies/player";
import { PLAY_ICO } from "../audio/player";

type Tr = (s: string) => string;

export function MovieList(p: { items: { id: string; title: string; titleEn: string }[] }) {
  return (
    <section className="reading">
      <div className="novel-grid">{p.items.map(x => (
        <button key={x.id} className="novel-tile" data-novel={x.id}>
          <img src={`data/novels/${x.id}.svg`} alt="" loading="lazy" /><b>{x.title}</b><span>{x.titleEn}</span></button>))}</div>
    </section>
  );
}

export function Novel(p: { st: NovelData; ja: boolean; tr: Tr; deps: Deps; onBack: () => void }) {
  const root = useRef<HTMLElement>(null);
  useEffect(() => startNovel(root.current!, p.deps), []);
  const st = p.st;
  return (
    <section className="reading story" ref={root}>
      <div className="story-top"><button className="nav-btn" id="novelBack" data-back="Movies" onClick={p.onBack}>Back</button>
        <button className="listen-btn" id="novelListen" type="button" aria-pressed="false">
          <span className="lb-ico" dangerouslySetInnerHTML={{ __html: PLAY_ICO }} /><span className="lb-t">{p.tr("Listen")}</span></button></div>
      <img className="novel-art" src={`data/novels/${st.id}.svg`} alt="" />
      <h2 className="book-title">{st.title}<small>{`${st.titleEn} · ${st.author}`}</small></h2>
      <div className="story-meta">{st.source}</div>
      {st.sentences.map((x, k) => x.h
        ? <h3 key={k} className="novel-ch">{x.h}<small>{x.en || ""}</small></h3>
        : <div key={k} className="ex story-line"><span className="jpline">{x.jp}</span><div className="tr">{x.en}</div></div>)}
    </section>
  );
}

const PREV = <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M6 5h2v14H6zM20 5v14L9 12z" fill="currentColor" /></svg>;
const NEXT = <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M16 5h2v14h-2zM4 5v14l11-7z" fill="currentColor" /></svg>;

export function Theatre(p: { st: NovelData; ja: boolean; cc: boolean; en: boolean; deps: Deps; onExit: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => { document.body.classList.add("cinema"); return startTheatre(root.current!, p.st, p.deps); }, []);
  const n = p.st.sentences.length;
  return (
    <div ref={root} style={{ display: "contents" }}>
      <div className={`th${p.cc ? "" : " no-cc"}${p.en ? "" : " no-en"}`} role="region" aria-label={p.st.title}>
        <div className="th-top">
          <button className="th-exit" type="button" onClick={p.onExit}>{p.ja ? "‹ 終了" : "‹ Exit"}</button>
          <div className="th-tg"><button className="th-cc" type="button" aria-pressed={p.cc} aria-label="Subtitles">CC</button>
            <button className="th-entg" type="button" aria-pressed={p.en} aria-label="English line">EN</button></div>
        </div>
        <div className="th-stage"><div className="th-frame">
          <img className="th-img" alt="" /><img className="th-img" alt="" />
          <div className="th-card" hidden><b /><small /></div>
          <button className="th-big" type="button" aria-label="Play" dangerouslySetInnerHTML={{ __html: PLAY_ICO }} />
        </div>
          <div className="th-sub" aria-live="polite"><div className="th-tip" hidden /><p className="th-jp" /><p className="th-en" /></div></div>
        <div className="th-hud"><div className="th-seek"><input className="th-range" type="range" min="0" max={n - 1} step="1" defaultValue="0" aria-label="Line" />
          <div className="th-bar" aria-hidden="true"><i /></div></div>
          <div className="th-ctl">
            <div className="th-mid">
              <button className="th-btn th-play" type="button" aria-label="Play" dangerouslySetInnerHTML={{ __html: PLAY_ICO }} />
              <button className="th-btn th-prev" type="button" aria-label="Previous line">{PREV}</button>
              <button className="th-btn th-next" type="button" aria-label="Next line">{NEXT}</button>
            </div>
            <span className="th-count" />
          </div></div>
      </div>
    </div>
  );
}
