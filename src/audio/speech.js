/* audio/speech.js: part of the app split out of the old single file (v166). Imports generated from use. */
import { PLAYER } from "../audio/player";
import { St } from "../app/state";
import { store } from "../data/store";
import { $, esc } from "../app/core.js";
import { bestVoice } from "../app/settings.js";

/* ---------- Sound: the phone's Japanese voice (offline, no files) ---------- */

export const SILENT = "data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//OEwAAAAAAAAAAAAEluZm8AAAAPAAAACQAABCAARUVFRUVFRUVFRUVdXV1dXV1dXV1dXXR0dHR0dHR0dHR0i4uLi4uLi4uLi4uioqKioqKioqKiorq6urq6urq6urq60dHR0dHR0dHR0dHo6Ojo6Ojo6Ojo6P//////////////AAAAAExhdmM1OC4xMwAAAAAAAAAAAAAAACQD8AAAAAAAAAQgDea3ZwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//NExAAAAANIAAAAAExBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMu//NExFMAAANIAAAAADEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMu//NExKYAAANIAAAAADEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMu//NExKwAAANIAAAAADEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMu//NExKwAAANIAAAAADEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMu//NExKwAAANIAAAAADEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMu//NExKwAAANIAAAAADEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//NExKwAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//NExKwAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV";
try{ if(navigator.audioSession) navigator.audioSession.type = "playback"; }catch(e){}   // iPhone: play even with the silent switch on
// iPhone: an audio element may only play after a tap has "unlocked" it once with a real sound
export function unlockAudio(){ removeEventListener("touchend", unlockAudio); removeEventListener("click", unlockAudio);
  if(PLAYER.src) return; PLAYER.src = SILENT; PLAYER.play().then(() => PLAYER.pause()).catch(() => {}); }
addEventListener("touchend", unlockAudio, {passive: true}); addEventListener("click", unlockAudio);
export const soundOn = () => store.get("jc:sound", true);
export const sayOff = () => { if(St.SAY_ON){ St.SAY_ON.classList.remove("playing"); St.SAY_ON = null; } };
PLAYER.addEventListener("ended", sayOff); PLAYER.addEventListener("pause", sayOff);
export function soundNote(msg){   // only when every way of playing failed, so the cause can be reported
  let n = $("#soundNote"); if(!n){ n = document.createElement("div"); n.id = "soundNote"; n.className = "sound-note"; document.body.appendChild(n); }
  n.textContent = msg; n.hidden = false; clearTimeout(n._t); n._t = setTimeout(() => n.hidden = true, 6000);
}
fetch("data/audio/map.json", {cache:"no-cache"}).then(r => r.ok ? r.json() : {}).then(m => St.AUDIO_MAP = m).catch(() => St.AUDIO_MAP = {});
export const speaker = () => "nanami";   // one voice for everything (keeps the app small as content grows)
export function speak(text){
  try{ if(St.AUDIO_NOW) St.AUDIO_NOW.pause(); }catch(e){}
  const sp = speaker(), key = sp !== "device" && St.AUDIO_MAP && St.AUDIO_MAP[text];
  if(key){
    try{ if(St.AUDIO_NOW) St.AUDIO_NOW.pause(); speechSynthesis.cancel(); }catch(e){}
    const url = `data/audio/${sp}/${key}.mp3`, a = PLAYER; St.AUDIO_NOW = a;
    try{ if(navigator.audioSession) navigator.audioSession.type = "playback"; }catch(e){}
    a.src = url;
    a.play().catch(err1 =>   // route 2: load the whole file into memory and play it from there
      fetch(url).then(r => r.blob()).then(b => { a.src = URL.createObjectURL(b); return a.play(); })
        .catch(err2 => { sayOff(); speakDevice(text); soundNote(`No sound (${(err2 || err1).name || "error"}). Tell Claude this message.`); }));
    return;
  }
  speakDevice(text);
}
export function speakDevice(text){
  try{
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "ja-JP"; u.rate = store.get("jc:rate", 0.9);
    const v = bestVoice();
    if(v) u.voice = v;
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  }catch(e){}
}
export const SPK_OFF = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16.5 9.5l5 5M21.5 9.5l-5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
export const SPK = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 9.5a3.5 3.5 0 0 1 0 5M18.5 7a7 7 0 0 1 0 10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
export const sayIcon = text => `<span class="say say-i" role="button" tabindex="0" data-say="${esc(text)}" aria-label="Play ${esc(text)}">${SPK}</span>`;
export const sayBtn = text => `<button class="say" type="button" data-say="${esc(text)}" aria-label="Play sound">🔊</button>`;
