/* Movies playback. The film (theatre) and the text + Listen page are imperative players:
   timers, gestures and preloaded pictures, started when their screen mounts and stopped when it goes.
   Logic unchanged from the single-file app; it now looks only inside its own screen. */
import { PLAYER, PLAY_ICO, PAUSE_ICO } from "../audio/player";
import { store } from "../data/store";
import { esc } from "../util/html";

export type Deps = { audioMap: () => Record<string, string> | null; speak: (t: string) => void; speakDevice: (t: string) => void;
  soundOn: () => boolean; calm: () => boolean; ja: () => boolean };

/** What is playing now (one story at a time, app-wide). */
export const STORY: { i: number; cont: boolean; play: ((i: number, cont: boolean) => void) | null; stopUI: (() => void) | null;
  onPlaying?: ((on: boolean) => void) | null } = { i: 0, cont: false, play: null, stopUI: null };
export function stopStory(): void {
  STORY.cont = false;
  try { PLAYER.pause(); PLAYER.onended = null; speechSynthesis.cancel(); } catch { /* no speech */ }
  if (STORY.stopUI) STORY.stopUI();
}

type Line = { jp: string; en?: string; h?: string; tk?: [number, number, string, string, unknown, string?][] };
export type NovelData = { id: string; title: string; titleEn: string; author: string; source: string; sentences: Line[];
  scenes?: { from: number; img: string }[] };

/* ---------------- text + Listen (novels without scenes) ---------------- */
export function startNovel(root: HTMLElement, d: Deps): () => void {
  const lines = [...root.querySelectorAll<HTMLElement>(".story-line")], btn = root.querySelector<HTMLButtonElement>("#novelListen")!;
  const setBtn = (on: boolean) => { btn.setAttribute("aria-pressed", String(on)); btn.querySelector(".lb-ico")!.innerHTML = on ? PAUSE_ICO : PLAY_ICO;
    btn.querySelector(".lb-t")!.textContent = on ? (d.ja() ? "一時停止" : "Pause") : (d.ja() ? "聞く" : "Listen"); };
  STORY.play = (i, cont) => {
    const line = lines[i]; if (!line) { stopStory(); return; }
    const text = line.querySelector(".jpline")!.textContent || "", key = d.audioMap()?.[text];
    lines.forEach(l => l.classList.toggle("speaking", l === line)); STORY.i = i; STORY.cont = cont; setBtn(cont);
    if (cont) line.scrollIntoView({ block: "center", behavior: d.calm() ? "auto" : "smooth" });
    const next = () => { if (STORY.cont && STORY.i === i) STORY.play!(i + 1, true); else line.classList.remove("speaking"); };
    if (key) { PLAYER.onended = next; PLAYER.src = `data/audio/nanami/${key}.mp3`; PLAYER.play().catch(() => { d.speakDevice(text); }); }
    else { try { const u = new SpeechSynthesisUtterance(text); u.lang = "ja-JP"; u.onend = next; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch { /* no speech */ } }
  };
  STORY.stopUI = () => { setBtn(false); lines.forEach(l => l.classList.remove("speaking")); };
  lines.forEach((l, i) => l.addEventListener("click", () => { if (!d.soundOn()) return; STORY.play!(i, STORY.cont); }));
  btn.onclick = () => { if (STORY.cont) { stopStory(); return; } STORY.play!(Math.max(0, STORY.i || 0), true); };
  STORY.i = 0; STORY.cont = false;
  const mine = STORY.play;
  return () => { if (STORY.play !== mine) return;   // another player took over already
    stopStory(); STORY.play = null; STORY.stopUI = null; };
}

/* ---------------- theatre: a novel as a film ---------------- */
export function startTheatre(root: HTMLElement, st: NovelData, d: Deps): () => void {
  const $ = <T extends Element = HTMLElement>(s: string) => root.querySelector<T>(s)!;
  const L = st.sentences, scenes = st.scenes!, sceneAt = (i: number) => { let k = 0; scenes.forEach((sc, j) => { if (sc.from <= i) k = j; }); return k; };
  const subHTML = (x: Line) => { if (!x.tk) return esc(x.jp); let h = "", at = 0;
    for (const [a, b, g, r, , base] of x.tk) { if (a < at) continue; h += esc(x.jp.slice(at, a)) + `<span class="th-tk" data-g="${esc(g)}" data-r="${esc(r)}" data-b="${esc(base || "")}">${esc(x.jp.slice(a, b))}</span>`; at = b; }
    return h + esc(x.jp.slice(at)); };
  const imgs = [...root.querySelectorAll<HTMLImageElement>(".th-img")], card = $(".th-card"), big = $(".th-big"), playB = $(".th-play"), th = $(".th");
  let front = 0, shown = -1, timer = 0;
  const showScene = (k: number, instant: boolean) => {
    if (k === shown) return; shown = k;
    const nxt = imgs[1 - front]; nxt.src = `data/novels/${scenes[k].img}`;
    const swap = () => { imgs[front].classList.remove("on"); nxt.classList.remove("on"); void nxt.offsetWidth; nxt.classList.add("on"); front = 1 - front; };
    if (instant || nxt.complete) swap(); else nxt.onload = swap;
  };
  const setLine = (i: number) => {
    const x = L[i]; STORY.i = i; showScene(sceneAt(i), i === 0);
    card.hidden = !x.h; if (x.h) { card.querySelector("b")!.textContent = x.h; card.querySelector("small")!.textContent = x.en || ""; }
    $(".th-jp").innerHTML = x.h ? "" : subHTML(x); $(".th-en").textContent = x.h ? "" : (x.en || ""); $(".th-tip").hidden = true;
    $(".th-bar i").style.width = `${(i + 1) / L.length * 100}%`; $(".th-count").textContent = `${i + 1} / ${L.length}`; $<HTMLInputElement>(".th-range").value = String(i);
  };
  const setPlaying = (on: boolean) => { STORY.cont = on; big.hidden = on; playB.innerHTML = on ? PAUSE_ICO : PLAY_ICO; playB.setAttribute("aria-label", on ? "Pause" : "Play");
    th.classList.toggle("paused", !on); if (on) $(".th-tip").hidden = true; if (STORY.onPlaying) STORY.onPlaying(on); };
  STORY.play = (i, cont) => {
    clearTimeout(timer);
    if (i >= L.length) { stopStory(); setLine(L.length - 1); return; }
    setLine(i); setPlaying(cont); if (!cont) return;
    const text = L[i].h || L[i].jp, key = d.audioMap()?.[text];
    const next = () => { if (STORY.cont && STORY.i === i) timer = window.setTimeout(() => STORY.play!(i + 1, true), L[i].h ? 900 : 350); };
    if (key) { PLAYER.onended = next; PLAYER.src = `data/audio/nanami/${key}.mp3`; PLAYER.play().catch(() => { timer = window.setTimeout(next, text.length * 160); }); }
    else timer = window.setTimeout(next, text.length * 160 + 800);
  };
  STORY.stopUI = () => { clearTimeout(timer); setPlaying(false); };
  const toggle = () => { if (STORY.cont) { stopStory(); return; }
    if (PLAYER.src && PLAYER.paused && PLAYER.currentTime > 0 && !PLAYER.ended && PLAYER.onended) { setPlaying(true); PLAYER.play().catch(() => {}); return; }
    STORY.play!(STORY.i, true); };
  const go = (dl: number) => { const i = Math.max(0, Math.min(L.length - 1, STORY.i + dl)); try { PLAYER.pause(); PLAYER.onended = null; } catch { /* */ } STORY.play!(i, STORY.cont); };
  big.onclick = playB.onclick = toggle;
  $(".th-frame").addEventListener("click", e => { if (!(e.target as HTMLElement).closest(".th-big")) toggle(); });
  $(".th-prev").onclick = () => go(-1); $(".th-next").onclick = () => go(1);
  $(".th-sub").addEventListener("click", e => {
    const w = (e.target as HTMLElement).closest<HTMLElement>(".th-tk"), tip = $(".th-tip") as HTMLElement & { _t?: number };
    root.querySelectorAll(".th-tk.on").forEach(x => x.classList.remove("on"));
    if (!w) { tip.hidden = true; return; }
    const wasOn = STORY.cont, line = STORY.i; if (wasOn) { th.classList.add("peek"); stopStory(); }
    w.classList.add("on");
    const short = (w.dataset.g || "").split(/[;；/]/)[0].replace(/\s*\(.*?\)\s*/g, " ").trim();
    tip.innerHTML = (w.dataset.r ? `<span class="tip-rd">${esc(w.dataset.r)}</span>` : "") + (short ? `<span class="tip-en">${esc(short)}</span>` : "");
    tip.hidden = false;
    if (d.soundOn()) d.speak(w.textContent || "");   // hear it as written in the line
    clearTimeout(tip._t);
    tip._t = window.setTimeout(() => { tip.hidden = true; w.classList.remove("on"); th.classList.remove("peek"); if (wasOn && STORY.i === line && !STORY.cont) STORY.play!(line, true); }, 2000);
    const r = w.getBoundingClientRect(), br = $(".th-sub").getBoundingClientRect();
    tip.style.left = Math.max(0, Math.min(br.width - tip.offsetWidth, r.left - br.left + r.width / 2 - tip.offsetWidth / 2)) + "px";
    tip.style.top = (r.top - br.top - tip.offsetHeight - 8) + "px";
  });
  const cc = () => store.get("jc:cc", true), enOn = () => store.get("jc:thEn", true);
  $(".th-cc").onclick = () => { const on = !cc(); store.set("jc:cc", on); $(".th-cc").setAttribute("aria-pressed", String(on)); th.classList.toggle("no-cc", !on); };
  $(".th-entg").onclick = () => { const on = !enOn(); store.set("jc:thEn", on); $(".th-entg").setAttribute("aria-pressed", String(on)); th.classList.toggle("no-en", !on); };
  const rg = $<HTMLInputElement>(".th-range");   // drag = preview picture + line, release = play from there
  rg.oninput = () => { clearTimeout(timer); try { PLAYER.pause(); PLAYER.onended = null; } catch { /* */ } setLine(+rg.value); };
  rg.onchange = () => STORY.play!(+rg.value, STORY.cont || th.dataset.was === "1");
  rg.onpointerdown = () => { th.dataset.was = STORY.cont ? "1" : "0"; };
  // controls fade out while playing; any movement brings them back (first tap on a phone only reveals them)
  let idleT = 0;
  const wake = () => { th.classList.remove("idle"); clearTimeout(idleT); idleT = window.setTimeout(() => { if (STORY.cont && document.body.classList.contains("cinema")) th.classList.add("idle"); }, 2600); };
  th.addEventListener("pointermove", e => { if (e.pointerType === "mouse") wake(); });
  th.addEventListener("pointerdown", e => { if (th.classList.contains("idle") && e.pointerType !== "mouse") { e.preventDefault(); e.stopPropagation(); th.dataset.swallow = "1"; } wake(); }, true);
  th.addEventListener("click", e => { if (th.dataset.swallow === "1") { th.dataset.swallow = ""; e.stopPropagation(); e.preventDefault(); } }, true);
  addEventListener("keydown", wake);
  let wasOn = false;
  STORY.onPlaying = on => { if (on === wasOn) return; wasOn = on; if (on) wake(); else { clearTimeout(idleT); th.classList.remove("idle"); } };
  STORY.i = 0; STORY.cont = false; setLine(0); setPlaying(false); card.hidden = true;   // poster: picture + title only
  $(".th-jp").textContent = st.title; $(".th-en").textContent = `${st.titleEn} · ${st.author}`;
  const mine = STORY.play;
  return () => { clearTimeout(timer); clearTimeout(idleT); removeEventListener("keydown", wake);
    if (STORY.play !== mine) return;   // another player took over already
    stopStory(); STORY.play = null; STORY.stopUI = null; STORY.onPlaying = null; };
}
