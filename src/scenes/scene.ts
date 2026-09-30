/* Scene behaviour: tap anything in the picture (or a word in the list) = its name, reading, meaning, example and sound;
   Show all labels (overlaps pushed apart); Zoom in / Zoom out between linked scenes; the 3D konbini (three.js).
   Logic unchanged from the single-file app; it now looks only inside its own screen. */
import { store } from "../data/store";
import { esc } from "../util/html";

export type SceneItem = { jp: string; reading: string; en: string; phrase: string; phraseEn: string; zoom?: string; box?: number[] };
export type SceneData = { title: string; titleEn: string; items: Record<string, SceneItem>; parent?: string; three?: boolean; photo?: string; svg?: string;
  size?: [number, number]; source: string; sourceUrl?: string };
export type SceneDeps = { speak: (t: string) => void; sayBtn: (t: string) => string; version: string;
  loadScript: (src: string) => Promise<void>; zoomInto: (id: string) => void; back: () => Promise<void> | void };

declare global { interface Window { __scene3d?: any; mountKonbini3D?: any } }

export function startScene(root: HTMLElement, sc: SceneData, id: string, arrive: { dir: string; spot?: string } | null, d: SceneDeps,
  parentItems: () => Promise<Record<string, SceneItem>>): () => void {
  const $ = <T extends HTMLElement = HTMLElement>(s: string) => root.querySelector<T>(s)!;
  const svgEl = root.querySelector<SVGSVGElement>("#sceneCanvas svg");
  let view3d: any = null, alive = true;
  let allOn = false, cur: string | null = null;
  const tags = () => {   // labels on the picture: the selected item, or all of them; overlaps relaxed apart
    if (!svgEl) return;
    svgEl.querySelectorAll(".tag").forEach(t => t.remove());
    const keys = allOn ? Object.keys(sc.items) : (cur ? [cur] : []);
    const ns = "http://www.w3.org/2000/svg", VW = svgEl.viewBox.baseVal.width, VH = svgEl.viewBox.baseVal.height, u = VW / 400;
    const P = keys.map(k => {
      const g = svgEl.querySelector<SVGGraphicsElement>(`.spot[data-id="${k}"]`); if (!g) return null;
      const bb = g.getBBox(), t = document.createElementNS(ns, "g"), label = document.createElementNS(ns, "text") as SVGTextElement;
      t.setAttribute("class", "tag"); label.textContent = sc.items[k].jp + (sc.items[k].zoom ? " 🔍" : "");
      label.setAttribute("font-size", String((allOn ? 10.5 : 12) * u)); label.setAttribute("font-weight", "700");
      label.setAttribute("text-anchor", "middle"); label.setAttribute("fill", "#fff");
      t.appendChild(label); svgEl.appendChild(t);
      const w = label.getComputedTextLength() + 10 * u, h = (allOn ? 15 : 18) * u;
      const x = bb.x + bb.width / 2, y = allOn ? bb.y + Math.min(bb.height / 2, 18 * u) : bb.y - 4 * u;
      return { k, t, label, w, h, ax: x, ay: y, x, y };
    }).filter(Boolean) as { k: string; t: SVGGElement; label: SVGTextElement; w: number; h: number; ax: number; ay: number; x: number; y: number }[];
    for (let it = 0; it < 120 && P.length > 1; it++) {
      for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) {
        const p = P[i], q = P[j];
        const ox = (p.w + q.w) / 2 + 2 * u - Math.abs(p.x - q.x), oy = (p.h + q.h) / 2 + u - Math.abs(p.y - q.y);
        if (ox <= 0 || oy <= 0) continue;
        if (oy < ox) { const s = p.y <= q.y ? -1 : 1; p.y += s * oy / 2; q.y -= s * oy / 2; }
        else { const s = p.x <= q.x ? -1 : 1; p.x += s * ox / 2; q.x -= s * ox / 2; }
      }
      for (const p of P) { p.x += (p.ax - p.x) * .02; p.y += (p.ay - p.y) * .02; }
    }
    for (const p of P) {
      p.x = Math.max(p.w / 2 + 2 * u, Math.min(VW - p.w / 2 - 2 * u, p.x)); p.y = Math.max(p.h + u, Math.min(VH - 2 * u, p.y));
      const r = document.createElementNS(ns, "rect");
      r.setAttribute("x", String(p.x - p.w / 2)); r.setAttribute("y", String(p.y - p.h + 3)); r.setAttribute("width", String(p.w)); r.setAttribute("height", String(p.h));
      r.setAttribute("rx", String(4 * u)); r.setAttribute("fill", p.k === cur || !allOn ? "var(--shu)" : "rgba(43,36,52,.8)");
      p.t.insertBefore(r, p.label); p.label.setAttribute("x", String(p.x)); p.label.setAttribute("y", String(p.y - (allOn ? 1 : 0) * u));
      p.t.style.pointerEvents = "none";
    }
  };
  const setAll = (on: boolean) => { allOn = on; $("#showAll").setAttribute("aria-pressed", String(on)); store.set("jc:scenelabels", on); if (svgEl) svgEl.classList.toggle("all", on);
    if (view3d && view3d.showAll) view3d.showAll(Object.fromEntries(Object.entries(sc.items).map(([k, v]) => [k, v.jp])), on); tags(); };
  $("#showAll").onclick = () => setAll($("#showAll").getAttribute("aria-pressed") !== "true");
  const show = (k: string) => {
    const v = sc.items[k]; if (!v) return;
    const g = svgEl ? svgEl.querySelector(`.spot[data-id="${k}"]`) : null;
    if (svgEl) svgEl.querySelectorAll(".spot").forEach(x => x.classList.toggle("on", x === g));
    if (view3d) { view3d.select(k, true); view3d.setLabel(v.jp); }
    root.querySelectorAll<HTMLElement>(".scene-row").forEach(c => c.classList.toggle("on", c.dataset.spot === k));
    cur = k; tags();
    d.speak(v.jp);
    $("#sceneInfo").innerHTML = `<div class="scene-word">${esc(v.jp)} ${d.sayBtn(v.jp)}</div>
      <div class="rd">${esc(v.reading)}</div><div class="en">${esc(v.en)}</div>
      <div class="ex"><span class="jpline">${esc(v.phrase)}</span><div class="tr">${esc(v.phraseEn)}</div></div>
      ${v.zoom ? `<button class="nav-btn zoom-in" id="zoomIn">Zoom in</button>` : ""}`;
    if (v.zoom) $("#zoomIn").onclick = () => zoomTo(k);
  };
  if (sc.three) {
    (async () => {
      try {
        await d.loadScript("vendor/three.min.js"); await d.loadScript("vendor/OrbitControls.js"); await d.loadScript("scene3d.js?" + d.version);
        if (!alive) return;
        if (window.__scene3d) window.__scene3d.dispose();
        view3d = window.__scene3d = window.mountKonbini3D($("#scene3d"), (k: string) => show(k));
        setAll(store.get("jc:scenelabels", false));
      } catch { $("#scene3d").innerHTML = `<div class="empty">3D could not start on this device.</div>`; }
    })();
  }
  setAll(store.get("jc:scenelabels", false));
  if (svgEl) svgEl.querySelectorAll<SVGGElement>(".spot").forEach(g => g.addEventListener("click", ev => { ev.stopPropagation(); show(g.dataset.id!); }));
  root.querySelectorAll<HTMLElement>(".scene-row").forEach(c => c.onclick = () => { show(c.dataset.spot!); root.querySelector("#scene3d, #sceneZoom")!.scrollIntoView({ behavior: "smooth", block: "start" }); });
  root.querySelector(".scene-words")!.addEventListener("toggle", e => store.set("jc:scenewords", (e.target as HTMLDetailsElement).open));
  // zoom: fly into a spot, then open the closer scene; zoom out flies back from it
  const canvas = root.querySelector<HTMLElement>("#sceneCanvas"), VB = svgEl && svgEl.viewBox.baseVal;
  const focus = (k: string) => {
    const g = svgEl && svgEl.querySelector<SVGGraphicsElement>(`.spot[data-id="${k}"]`); if (!g || !VB) return null;
    const bb = g.getBBox();
    return { ox: (bb.x + bb.width / 2) / VB.width * 100, oy: (bb.y + bb.height / 2) / VB.height * 100, s: Math.min(4, .9 * Math.min(VB.width / bb.width, VB.height / bb.height)) };
  };
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const play = (frames: Keyframe[], opt: KeyframeAnimationOptions & { duration: number }) => { const an = canvas!.animate(frames, opt);
    return Promise.race([an.finished, new Promise(r => setTimeout(r, opt.duration + 60))]); };
  async function zoomTo(k: string) {
    const f = focus(k), next = sc.items[k].zoom!;
    if (f && canvas && !still) {
      canvas.style.transformOrigin = `${f.ox}% ${f.oy}%`;
      await play([{ transform: "scale(1)", opacity: 1 }, { transform: `scale(${f.s})`, opacity: 0 }], { duration: 480, easing: "cubic-bezier(.5,0,.8,.4)", fill: "forwards" });
    }
    d.zoomInto(next);
  }
  if (arrive && canvas && !still) {
    const f = arrive.dir === "out" && arrive.spot ? focus(arrive.spot) : null;
    if (f) { canvas.style.transformOrigin = `${f.ox}% ${f.oy}%`;
      canvas.animate([{ transform: `scale(${f.s})`, opacity: 0 }, { transform: "scale(1)", opacity: 1 }], { duration: 480, easing: "cubic-bezier(.2,.6,.3,1)" }); }
    else canvas.animate([{ transform: "scale(.85)", opacity: 0 }, { transform: "scale(1)", opacity: 1 }], { duration: 380, easing: "cubic-bezier(.2,.6,.3,1)" });
  }
  $("#sceneBack").onclick = async () => {
    if (sc.parent) {
      if (canvas && !still) { canvas.style.transformOrigin = "50% 50%";
        await play([{ transform: "scale(1)", opacity: 1 }, { transform: "scale(.7)", opacity: 0 }], { duration: 320, easing: "ease-in", fill: "forwards" }); }
      const items = await parentItems();
      d.zoomInto(sc.parent + "|" + (Object.keys(items).find(x => items[x].zoom === id) || ""));
      return;
    }
    if (window.__scene3d) { window.__scene3d.dispose(); window.__scene3d = null; }
    d.back();
  };
  return () => { alive = false; };
}
