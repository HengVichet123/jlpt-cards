/* Practice run: one card at a time, Again / Hard / Good / Easy, undo, Anki counts (New / Learn / Due), Exit.
   The card itself is the app's card HTML (shared with Complete list); its taps (flip, sound, double-tap) are the app's. */
import { useLayoutEffect, useRef, useState } from "react";
import { BUTTONS } from "../practice/srs";
import { store } from "../data/store";
import { SPK, SPK_OFF } from "../audio/speech.js";

export type PracticeRunProps = {
  ja: boolean;
  tr: (s: string) => string;
  calm: boolean;
  card: { key: string; level: string; type: string; no: number; html: string; when: Record<number, string> } | null;   // null = session complete
  counts: { n: number; l: number; d: number };   // Anki: New / Learn / Due, the same numbers as the session row
  which: "new" | "learn" | "due" | null;          // the queue the card on screen comes from (underlined, like Anki)
  ahead: number;                                  // review cards scheduled for later days (Review ahead, when the session is done)
  onAhead: () => void;
  canUndo: boolean;
  onRate: (minutes: number) => void;
  onUndo: () => void;
  onExit: () => void;
};

const UNDO = (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 14 4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
  </svg>
);

export function PracticeRun(p: PracticeRunProps) {
  const stage = useRef<HTMLDivElement>(null);
  const [say, setSay] = useState(() => store.get("jc:revealsay", true));   // word plays when its card opens
  useLayoutEffect(() => {   // a new card pops in and stays put
    const c = stage.current?.querySelector(".play-card");
    if (c && !p.calm) c.animate([{ opacity: 0, transform: "scale(.96)" }, { opacity: 1, transform: "none" }], { duration: 240, easing: "cubic-bezier(.2,.8,.2,1)" });
  }, [p.card?.key]);

  return (
    <div className="play-screen">
      <div className="play-bar pg-bottom">
        <div className="play-top">
          <div className="play-queue run-n" aria-label={`${p.counts.n} new, ${p.counts.l} learning, ${p.counts.d} due`}>
            {([["new", p.counts.n], ["learn", p.counts.l], ["due", p.counts.d]] as const).map(([c, v]) =>
              <span key={c} className={`deck-n ${c}${v ? "" : " zero"}${p.which === c ? " cur" : ""}`}>{v}</span>)}
          </div>
          <button type="button" className="pg-undo" id="pgUndo" aria-label="Undo last answer" disabled={!p.canUndo} onClick={p.onUndo}>{UNDO}</button>
          <button type="button" className="pg-undo" id="pgSay" aria-label="Play word when the card opens" aria-pressed={say}
            onClick={() => { store.set("jc:revealsay", !say); setSay(!say); }} dangerouslySetInnerHTML={{ __html: say ? SPK : SPK_OFF }} />
        </div>
        <button className="back-link pg-exit" id="pgBack" type="button" aria-label="Exit to Practice" onClick={p.onExit}>{p.ja ? "‹ 終了" : "‹ Exit"}</button>
      </div>
      <div className="play-stage" ref={stage}>
        {p.card
          ? <div key={p.card.key} style={{ display: "contents" }} dangerouslySetInnerHTML={{ __html: p.card.html }} />
          : <div className="play-empty"><h2>{p.tr("Session complete")}</h2>
              {p.ahead > 0 && <button type="button" className="pg-ahead" id="pgAhead" onClick={p.onAhead}>{p.tr("Review ahead")}<b>{p.ahead}</b></button>}</div>}
      </div>
      {p.card && <>
        <div className="play-ratings" data-level={p.card.level} data-type={p.card.type} data-no={p.card.no}>
          {BUTTONS.map(([m, name]) => (   // Anki: each button shows when the card comes back
            <button key={m} data-m={m} onClick={() => p.onRate(m)}>{p.tr(name)}<span>{p.card!.when[m]}</span></button>
          ))}
        </div>
        <div className="kbd-hint">Space flip · 1 Again · 2 Hard · 3 Good · 4 Easy · Z undo</div>
      </>}
    </div>
  );
}
