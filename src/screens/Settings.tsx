/* Settings: theme, language, Practice answer style, sound, familiarity bars, version.
   Shown as a sheet over Home (gear) or as its own page. Every change is saved at once. */
import { useEffect, useRef, useState } from "react";

export type SettingsProps = {
  ja: boolean; tr: (s: string) => string; version: string;
  theme: string; lang: string; answer: string; sound: boolean; fam: boolean;
  onTheme: (v: string) => void; onLang: (v: string) => void; onAnswer: (v: string) => void;
  onSound: (on: boolean) => void; onFam: (on: boolean) => void;
};

function Seg({ id, cls = "", items, cur, onPick, tr, checked = true }: { id: string; cls?: string; items: [string, string][]; cur: string;
  onPick: (v: string) => void; tr: (s: string) => string; checked?: boolean }) {
  return <div className={`seg ${cls}`.trim()} role="radiogroup" id={id}>{items.map(([k, l]) =>
    <button key={k} type="button" role="radio" data-v={k} className={k === cur ? "on" : ""} aria-checked={checked ? k === cur : undefined} onClick={() => onPick(k)}>{tr(l)}</button>)}</div>;
}

export function SettingsPanel(p: SettingsProps) {
  const [sound, setSound] = useState(p.sound), [fam, setFam] = useState(p.fam);
  return (
    <section className="settings">
      <div className="set-group"><h2 className="set-h">{p.tr("Appearance")}</h2>
        <Seg id="setTheme" items={[["auto", "Auto"], ["light", "Light"], ["dark", "Dark"]]} cur={p.theme} onPick={p.onTheme} tr={p.tr} /></div>
      <div className="set-group"><h2 className="set-h">{p.tr("Language")}</h2>
        <Seg id="setLang" cls="seg-2" items={[["en", "With English"], ["ja", "Japanese only"]]} cur={p.lang} onPick={p.onLang} tr={p.tr} checked={false} /></div>
      <div className="set-group"><h2 className="set-h">{p.tr("Practice answer")}</h2>
        <Seg id="setAnswer" cls="seg-2" items={[["short", "Short"], ["full", "Full"]]} cur={p.answer} onPick={p.onAnswer} tr={p.tr} /></div>
      <div className="set-group"><h2 className="set-h">{p.tr("Cards")}</h2>
        <label className="opt-row opt-switch" htmlFor="setSay"><span>{p.tr("Sound")}</span>
          <input type="checkbox" id="setSay" checked={sound} onChange={e => { setSound(e.target.checked); p.onSound(e.target.checked); }} /></label>
        <label className="opt-row opt-switch" htmlFor="setFam"><span>{p.tr("Familiarity bars")}</span>
          <input type="checkbox" id="setFam" checked={fam} onChange={e => { setFam(e.target.checked); p.onFam(e.target.checked); }} /></label></div>
      <p className="set-ver">{p.version}</p>
    </section>
  );
}

/** The sheet sliding in from the right over the current page (tap outside / ‹ / swipe right closes). */
export function SettingsSheet(p: SettingsProps & { calm: boolean; closing: boolean; onClose: () => void }) {
  const x0 = useRef<number | null>(null);
  useEffect(() => {
    if (p.closing) { document.body.classList.remove("sheet-open"); return; }
    const a = requestAnimationFrame(() => requestAnimationFrame(() => document.body.classList.add("sheet-open")));
    return () => cancelAnimationFrame(a);
  }, [p.closing]);
  return (<>
    <div id="appScrim" className="pg-scrim" onClick={p.onClose} />
    <aside id="appSheet" className="pg-sheet" role="dialog" aria-modal="true" aria-label="Settings"
      onTouchStart={e => { x0.current = e.touches[0].clientX; }}
      onTouchEnd={e => { if (x0.current !== null && e.changedTouches[0].clientX - x0.current > 80) p.onClose(); x0.current = null; }}>
      <div className="pg-sheet-head"><button type="button" className="pg-sheet-x" id="appSheetX" aria-label="Close" onClick={p.onClose}>‹</button><b>{p.ja ? "設定" : "Settings"}</b></div>
      <div className="pg-sheet-body app-sheet-body"><SettingsPanel {...p} /></div>
    </aside>
  </>);
}
