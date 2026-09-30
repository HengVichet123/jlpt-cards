/* Picture viewer behaviour: one picture at a time in a sideways-scrolling track
   (swipe / mouse drag / ‹ › / arrow keys), tap the picture = hear the word, thumbnails switch the big picture. */
import { store } from "../data/store";

export type ViewerDeps = { count: number; word: (n: number) => string; src: (f: string) => string; soundOn: () => boolean; speak: (t: string) => void;
  spk: string; spkOff: string };

export function startViewer(root: HTMLElement, d: ViewerDeps): () => void {
  const $ = <T extends HTMLElement = HTMLElement>(s: string) => root.querySelector<T>(s)!;
  const tr = $("#pvTrack"), slides = [...tr.querySelectorAll<HTMLElement>(".pv-slide")], W = d.count;
  let i = 0, dragX: number | null = null, startLeft = 0, dragged = false;
  const mark = (n: number) => { i = n; $("#pvPos").textContent = `${i + 1} / ${W}`; $("#pvBar").style.width = `${(i + 1) / W * 100}%`;
    $<HTMLButtonElement>("#pvPrev").disabled = i === 0; $<HTMLButtonElement>("#pvNext").disabled = i === W - 1; };
  const go = (n: number) => { n = Math.max(0, Math.min(W - 1, n));
    slides[n].scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", inline: "start", block: "nearest" }); mark(n); };
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) mark(+(e.target as HTMLElement).dataset.n!); }), { root: tr, threshold: .6 });
  slides.forEach(s => io.observe(s));
  tr.addEventListener("click", e => { if (dragged) { dragged = false; return; }
    const t = (e.target as HTMLElement).closest<HTMLElement>(".pv-thumb");
    if (t) { const sl = t.closest(".pv-slide")!;   // switch this word's big picture
      sl.querySelectorAll<HTMLImageElement>(".pv-photo img").forEach(im => im.src = d.src(t.dataset.src!));
      sl.querySelectorAll(".pv-thumb").forEach(x => x.classList.toggle("on", x === t)); return; }
    const b = (e.target as HTMLElement).closest<HTMLElement>(".pv-photo"); if (!b) return;
    const n = +b.dataset.n!;
    if (n !== i) { go(n); return; }
    b.animate([{ transform: "scale(1)" }, { transform: "scale(.97)" }, { transform: "scale(1)" }], { duration: 220, easing: "cubic-bezier(.2,.8,.2,1)" });   // press feedback
    if (d.soundOn()) d.speak(d.word(n)); });
  $("#pvSound").onclick = () => { const on = !d.soundOn(); store.set("jc:sound", on);
    $("#pvSound").innerHTML = on ? d.spk : d.spkOff; $("#pvSound").setAttribute("aria-pressed", String(on)); };
  tr.addEventListener("pointerdown", e => { if (e.pointerType !== "mouse") return; dragX = e.clientX; startLeft = tr.scrollLeft; dragged = false; });
  tr.addEventListener("pointermove", e => { if (dragX === null) return; const dx = e.clientX - dragX;
    if (!dragged && Math.abs(dx) > 6) { dragged = true; tr.style.scrollSnapType = "none"; tr.setPointerCapture(e.pointerId); }
    if (dragged) tr.scrollLeft = startLeft - dx; });
  tr.addEventListener("pointerup", e => { if (dragX === null) return; const dx = e.clientX - dragX; dragX = null;
    if (dragged) { tr.style.scrollSnapType = ""; go(Math.abs(dx) > 60 ? i + (dx < 0 ? 1 : -1) : i); } });
  $("#pvPrev").onclick = () => go(i - 1); $("#pvNext").onclick = () => go(i + 1);
  const keys = (e: KeyboardEvent) => { if (e.key === "ArrowRight") go(i + 1); if (e.key === "ArrowLeft") go(i - 1); };
  addEventListener("keydown", keys);
  tr.addEventListener("click", e => { const r = (e.target as HTMLElement).closest(".pv-rei"); if (r) { e.stopPropagation(); r.classList.toggle("show"); } }, true);
  mark(0);
  return () => { io.disconnect(); removeEventListener("keydown", keys); };
}
