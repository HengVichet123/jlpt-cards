/* app/settings.js: part of the app split out of the old single file (v166). Imports generated from use. */
import { SettingsPanel, SettingsSheet } from "../screens/Settings";
import { St } from "../app/state";
import { createElement } from "react";
import { hasOverlay, removeOverlay, renderOverlay } from "../react/mount";
import { store } from "../data/store";
import { APP_VERSION } from "../app/core.js";
import { applyLang, isJa, tr } from "../app/i18n.js";
import { calmMotion } from "../cards/cards.js";
import { pick, showScreen } from "../app/shell.js";
import { soundOn } from "../audio/speech.js";

export function applyTheme(){
  const t = store.get("jc:theme", "auto");
  if(t === "auto") document.documentElement.removeAttribute("data-theme"); else document.documentElement.setAttribute("data-theme", t);
}
export function jaVoices(){ try{ return speechSynthesis.getVoices().filter(v => /^ja/i.test(v.lang)); }catch(e){ return []; } }
export function bestVoice(){   // the saved choice, else the most natural-sounding Japanese voice on this device
  const vs = jaVoices(), saved = store.get("jc:voice", "");
  return vs.find(v => v.name === saved) ||
    vs.find(v => /natural|neural|online|enhanced|premium|siri/i.test(v.name)) ||
    vs.find(v => /google/i.test(v.name)) || vs.find(v => /kyoko|o-ren|nanami|haruka/i.test(v.name)) || vs[0] || null;
}
/* v160: Settings is React (src/screens/Settings.tsx): a sheet over the page (gear) or its own page */
export function settingsProps(){
  return {ja: isJa(), tr, version: APP_VERSION, theme: store.get("jc:theme", "auto"), lang: store.get("jc:lang", "en"),
    answer: store.get("jc:answer", "full"), sound: soundOn(), fam: store.get("jc:showfam", false),
    onTheme: v => { store.set("jc:theme", v); applyTheme(); drawSettings(); },
    onLang: v => { store.set("jc:lang", v);
      if(hasOverlay("settings")){ St.NAV_SAME = true; St.KEEP_SETTINGS = true; pick(St.CURRENT); St.KEEP_SETTINGS = false; applyLang(); drawSettings(); return; }
      if(v === "en"){ pick("settings"); applyLang(); } else { applyLang(); drawSettings(); } },
    onAnswer: v => { store.set("jc:answer", v); drawSettings(); },
    onSound: on => store.set("jc:sound", on),
    onFam: on => { store.set("jc:showfam", on); document.body.classList.toggle("showfam", on); }};
}
export function drawSettings(){
  if(hasOverlay("settings")) renderOverlay("settings", createElement(SettingsSheet, {...settingsProps(), calm: calmMotion(), closing: St.SETTINGS_CLOSING, onClose: () => closeSettingsSheet()}));
  else if(St.CURRENT === "settings") showScreen("settings", createElement(SettingsPanel, settingsProps()));
}
export function openSettingsSheet(){   // Settings = a card sliding in from the right, Home nudged aside behind it
  if(hasOverlay("settings")) return;
  St.SETTINGS_CLOSING = false;
  renderOverlay("settings", createElement(SettingsSheet, {...settingsProps(), calm: calmMotion(), closing: false, onClose: () => closeSettingsSheet()}));
}
export function closeSettingsSheet(instant){
  if(!hasOverlay("settings")) return;
  if(instant || calmMotion()){ document.body.classList.remove("sheet-open"); removeOverlay("settings"); return; }
  St.SETTINGS_CLOSING = true; drawSettings();
  setTimeout(() => { St.SETTINGS_CLOSING = false; removeOverlay("settings"); }, 320);
}
export function renderSettings(){
  document.body.classList.remove("playing");
  showScreen("settings", createElement(SettingsPanel, settingsProps()));
}
