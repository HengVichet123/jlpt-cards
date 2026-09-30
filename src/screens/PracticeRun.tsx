/* Practice run: one card at a time, Again / Hard / Easy, undo, count, Exit.
   The card itself is the app's card HTML (shared with Complete list); its taps (flip, sound, double-tap) are the app's. */
import { useLayoutEffect, useRef } from "react";
import { AGAIN, HARD, EASY } from "../practice/srs";

export type PracticeRunProps = {
  ja: boolean;
  tr: (s: string) => string;
  calm: boolean;
  card: { key: string; level: string; type: string; no: number; html: string } | null;   // null = session complete
  live: number; later: number;
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
const RATINGS: [number, string, string][] = [[AGAIN, "Again", "3 min"], [HARD, "Hard", "10 min"], [EASY, "Easy", "1 day"]];

export function PracticeRun(p: PracticeRunProps) {
  const stage = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {   // a new card pops in and stays put
    const c = stage.current?.querySelector(".play-card");
    if (c && !p.calm) c.animate([{ opacity: 0, transform: "scale(.96)" }, { opacity: 1, transform: "none" }], { duration: 240, easing: "cubic-bezier(.2,.8,.2,1)" });
  }, [p.card?.key]);

  return (
    <div className="play-screen">
      <div className="play-bar pg-bottom">
        <div className="play-top">
          <div className="play-queue"><span><b>{p.live}</b>{" " + p.tr("to go")}</span>{p.later ? <span className="pq-later">{p.tr(`${p.later} coming back`)}</span> : null}</div>
          <button type="button" className="pg-undo" id="pgUndo" aria-label="Undo last answer" disabled={!p.canUndo} onClick={p.onUndo}>{UNDO}</button>
        </div>
        <button className="back-link pg-exit" id="pgBack" type="button" aria-label="Exit to Practice" onClick={p.onExit}>{p.ja ? "‹ 終了" : "‹ Exit"}</button>
      </div>
      <div className="play-stage" ref={stage}>
        {p.card
          ? <div key={p.card.key} style={{ display: "contents" }} dangerouslySetInnerHTML={{ __html: p.card.html }} />
          : <div className="play-empty"><h2>{p.tr("Session complete")}</h2><p>{p.tr("All cards are resting.")}</p></div>}
      </div>
      {p.card && <>
        <div className="play-ratings" data-level={p.card.level} data-type={p.card.type} data-no={p.card.no}>
          {RATINGS.map(([m, name, when]) => (
            <button key={m} data-m={m} onClick={() => p.onRate(m)}>{p.tr(name)}<span>{p.tr(when)}</span></button>
          ))}
        </div>
        <div className="kbd-hint">Space flip · 1 Again · 2 Hard · 3 Easy · Z undo</div>
      </>}
    </div>
  );
}
