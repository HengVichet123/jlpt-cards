/* Scenes / Photos / Explorer: a list of pictures, and one scene (tap anything to learn its name). */
import { useEffect, useRef } from "react";
import { startScene, type SceneData, type SceneDeps } from "../scenes/scene";

export function SceneList(p: { items: { id: string; title: string; titleEn: string; count: number }[] }) {
  return (
    <section className="reading">
      <div className="story-list">{p.items.map(x => (
        <button key={x.id} className="home-card story-item" data-scene={x.id}><b>{x.title}</b><span>{`${x.titleEn} · ${x.count} words`}</span></button>))}</div>
    </section>
  );
}

export function Scene(p: { id: string; sc: SceneData; svg: string; dir: string; arrive: { dir: string; spot?: string } | null; wordsOpen: boolean;
  deps: SceneDeps; parentItems: () => Promise<SceneData["items"]> }) {
  const root = useRef<HTMLElement>(null);
  useEffect(() => startScene(root.current!, p.sc, p.id, p.arrive, p.deps, p.parentItems), []);
  const sc = p.sc, n = Object.keys(sc.items).length;
  const backLabel = sc.parent ? "Zoom out" : p.dir === "explore" ? "Home" : p.dir === "photos" ? "Photos" : "Scenes";
  const hint = p.dir === "explore" ? "Tap anything to learn its name. 🔍 = you can zoom in." : "Tap anything in the picture.";
  return (
    <section className="scene" ref={root}>
      <div className="story-top"><button className="nav-btn" id="sceneBack" data-back={backLabel}>{sc.parent ? "Zoom out" : p.dir === "explore" ? "Home" : "Back"}</button>
        <button className="nav-btn" id="showAll" aria-pressed="false">Show all</button></div>
      {sc.three ? <div className="scene-3d" id="scene3d" /> : <div className="scene-zoom" id="sceneZoom"><div className="scene-canvas" id="sceneCanvas" dangerouslySetInnerHTML={{ __html: p.svg }} /></div>}
      <div className="scene-info" id="sceneInfo" dangerouslySetInnerHTML={{ __html: `<div class="scene-hint">${hint}</div>` }} />
      <details className="scene-words" open={p.wordsOpen}><summary>{`Words in this scene · ${n}`}</summary>
        <div className="scene-list">{Object.entries(sc.items).map(([k, v]) => (
          <button key={k} className="scene-row" data-spot={k}><b>{v.jp}</b><span className="rd">{v.reading}</span><span className="en">{v.en}</span></button>))}</div>
      </details>
      <div className="story-meta">{sc.sourceUrl ? <a href={sc.sourceUrl} target="_blank" rel="noopener">{sc.source}</a> : sc.source}</div>
    </section>
  );
}
