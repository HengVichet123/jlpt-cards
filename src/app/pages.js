/* app/pages.js: part of the app split out of the old single file (v166). Imports generated from use. */
import { CompleteList, SectionPage, SectionsToc } from "../screens/Lists";
import { ExtraTheme, Illustrations, PicViewer, PicturesHome, picsOf } from "../screens/Pictures";
import { Home } from "../screens/Home";
import { K, store } from "../data/store";
import { ExamReview, ListenTest, ReadTest, TestList, VocabTest } from "../screens/Tests";
import * as Mistakes from "../tests/mistakes";
import { MovieList, Novel, Theatre } from "../screens/Movies";
import { Prelearn, Reader, ReadingHome, Shelf, Story } from "../screens/Reading";
import { Scene, SceneList } from "../screens/Scenes";
import { St } from "../app/state";
import { loadOrder, inOrder, days } from "../practice/plan";
import { USE, pickUseWords } from "../useit/chat";
import { UseIt } from "../screens/UseIt";
import { createElement } from "react";
import { stopStory } from "../movies/player";
import { $, APP_VERSION, esc } from "../app/core.js";
import { PG, dueLine, leavePracticeTo, loadReading, loadSections, pgPool, pgProfile, pgState, prefetchPools, renderPG, secSeen } from "../app/practice.js";
import { SPK, SPK_OFF, sayBtn, soundOn, speak, speakDevice } from "../audio/speech.js";
import { STICKERS, calmMotion, miniCard, miniFor, stickers } from "../cards/cards.js";
import { isJa, tr } from "../app/i18n.js";
import { pick, setHeaderAction, showScreen } from "../app/shell.js";

export function renderHome(){
  prefetchPools();

  document.body.classList.remove(
    "playing"
  );


  showScreen("home", createElement(Home, {ja: isJa(), due: dueLine()}));   // v155: Home is a React screen (src/screens/Home.tsx)


  $("#count").textContent =
    "Home";

}


/* =========================================================
   COMPLETE LIST
   ========================================================= */

export async function renderComplete(jump = null){

  document.body.classList.remove(
    "playing"
  );


  const LVL = store.get("jc:clevel", "N1") === "N2" ? "N2" : "N1";   // one level at a time
  if(!PG.pool[LVL]) $("#list").innerHTML = `<p class="loading-note">Loading ${LVL} cards…</p>`;   // never look frozen
  const order = await loadOrder(), raw = await pgPool(LVL);   // v172: learning order (words by theme, kanji by frequency)
  let pool = {words: inOrder(raw.words, order[LVL].words), kanji: inOrder(raw.kanji, order[LVL].kanji), grammar: inOrder(raw.grammar, order[LVL].grammar)};
  const D = days(order, LVL), dayKey = "jc:cday:" + LVL;   // v177: show one day of the plan (a hook to look over)
  let day = store.get(dayKey, null); if(day && !D[day - 1]) day = null;
  if(jump && day && !D[day - 1].some(([l, t, n]) => `${t}:${l}:${n}` === jump.k)){ day = null; store.set(dayKey, null); }   // bookmark outside this day
  if(day){ const want = new Set(D[day - 1].map(([, t, n]) => t + ":" + n)); pool = {words: pool.words.filter(c => want.has("words:" + c.no)), kanji: pool.kanji.filter(c => want.has("kanji:" + c.no)), grammar: pool.grammar.filter(c => want.has("grammar:" + c.no))}; }
  if(St.CURRENT !== "complete") return;   // user left while it was loading


  showScreen("complete", createElement(CompleteList, {   // v161: React (src/screens/Lists.tsx); tabs are switched by the app-wide .tab handler
    tr, level: LVL, tab: St.TAB, pool, html: (t, c) => miniFor(t, c, c.level), jump,
    marks: stickers, colors: STICKERS, day, days: D.length,
    onDay: d => { store.set(dayKey, d); St.NAV_SAME = true; renderComplete(); scrollTo(0, 0); },
    onJump: b => { store.set("jc:clevel", b.lv); St.TAB = b.t; store.set("jc:tab", b.t); St.NAV_SAME = true; renderComplete({k: b.k, n: Date.now()}); },   // v167: bookmarks
    onLevel: l => { store.set("jc:clevel", l); renderComplete(); }}));
  $("#count").textContent = "Complete list";
}

/* ---------- Novels ---------- */
export async function renderNovels(){
  document.body.classList.remove("playing");
  try{ St.NOVELS = St.NOVELS || await (await fetch("data/novels/index.json", {cache:"no-cache"})).json(); }
  catch(e){ $("#list").innerHTML = `<div class="empty">Could not load novels.</div>`; return; }
  showScreen("movies", createElement(MovieList, {items: St.NOVELS}));   // v163: React (src/screens/Movies.tsx)
}
export async function renderNovel(id){
  let st; try{ st = await (await fetch(`data/novels/${id}.json`, {cache:"no-cache"})).json(); }catch(e){ return; }
  if(st.scenes && st.scenes.length) return renderTheatre(st);
  $("#pageTitle").textContent = st.title;
  showScreen("novel-" + id, createElement(Novel, {st, ja: isJa(), tr, deps: MOVIE_DEPS,   // v163: React + src/movies/player.ts
    onBack: () => { stopStory(); $("#pageTitle").textContent = "Movies"; renderNovels(); }}));
}
export const MOVIE_DEPS = {audioMap: () => St.AUDIO_MAP, speak: t => speak(t), speakDevice: t => speakDevice(t), soundOn: () => soundOn(), calm: () => calmMotion(), ja: () => isJa()};
export function renderTheatre(st){   // a novel as a film (src/screens/Movies.tsx + src/movies/player.ts)
  document.body.classList.add("cinema"); St.NAV_SAME = true;
  showScreen("film-" + st.id, createElement(Theatre, {st, ja: isJa(), cc: store.get("jc:cc", true), en: store.get("jc:thEn", true), deps: MOVIE_DEPS,
    onExit: () => { stopStory(); document.body.classList.remove("cinema"); $("#pageTitle").textContent = "Movies"; St.NAV_DIR = "back"; renderNovels(); }}));
}
addEventListener("keydown", e => { if(!document.body.classList.contains("cinema") || e.target.closest("input,textarea")) return;
  if(e.key === " "){ e.preventDefault(); $(".th-play") && $(".th-play").click(); }
  else if(e.key === "ArrowRight") $(".th-next") && $(".th-next").click();
  else if(e.key === "ArrowLeft") $(".th-prev") && $(".th-prev").click();
  else if(e.key === "Escape") $(".th-exit") && $(".th-exit").click(); });



/* ---------- Scenes: learn words through pictures ---------- */
export const loadScript = src => new Promise((ok, bad) => {
  if(document.querySelector(`script[data-src="${src}"]`)) return ok();
  const el = document.createElement("script"); el.src = src; el.dataset.src = src; el.onload = ok; el.onerror = bad;
  document.head.appendChild(el);
});
export async function renderScenes(){
  document.body.classList.remove("playing");
  let list; try{ list = await (await fetch(`data/${St.SCENE_DIR}/index.json`, {cache:"no-cache"})).json(); }
  catch(e){ $("#list").innerHTML = `<div class="empty">Could not load scenes.</div>`; return; }
  $("#pageTitle").textContent = St.SCENE_DIR === "photos" ? "Photos" : "Scenes";
  showScreen("scenes-" + St.SCENE_DIR, createElement(SceneList, {items: list}));   // v165: React (src/screens/Scenes.tsx)
}
export async function renderScene(id, arrive){
  let sc, svg;
  try{
    sc = await (await fetch(`data/${St.SCENE_DIR}/${id}.json`, {cache:"no-cache"})).json();
    if(sc.photo){   // real photo + invisible tap boxes, drawn as an SVG so labels/Show all work the same
      const [W, H] = sc.size;
      svg = `<svg viewBox="0 0 ${W} ${H}" class="photo-scene" role="img" aria-label="${esc(sc.titleEn)}">
        <image href="data/${St.SCENE_DIR}/${sc.photo}" width="${W}" height="${H}"/>
        ${Object.entries(sc.items).filter(([k,v]) => v.box).map(([k,v]) => `<g class="spot" data-id="${k}"><rect class="hit" x="${v.box[0]}" y="${v.box[1]}" width="${v.box[2]}" height="${v.box[3]}" rx="${W/100}"/></g>`).join("")}</svg>`;
    }
    else svg = await (await fetch(`data/${St.SCENE_DIR}/${sc.svg}`, {cache:"no-cache"})).text();
  }catch(e){ return; }
  $("#pageTitle").textContent = sc.title;
  if(sc.parent){ try{ const par = await (await fetch(`data/${St.SCENE_DIR}/${sc.parent}.json`, {cache:"no-cache"})).json(); $("#pageTitle").textContent = `${par.title} › ${sc.title}`; }catch(e){} }
  const dir = St.SCENE_DIR;
  showScreen(`scene-${dir}-${id}`, createElement(Scene, {id, sc, svg: svg || "", dir, arrive: arrive || null, wordsOpen: store.get("jc:scenewords", true),   // v165: React + src/scenes/scene.ts
    parentItems: async () => (await (await fetch(`data/${dir}/${sc.parent}.json`, {cache:"no-cache"})).json()).items,
    deps: {speak, sayBtn, version: APP_VERSION, loadScript,
      zoomInto: t => { const [nid, spot] = t.split("|"); renderScene(nid, spot !== undefined ? {dir: "out", spot} : {dir: "in"}); },
      back: () => { if(dir === "explore") pick("home"); else renderScenes(); }}}));
}

/* ---------- Sections: topic chapters ---------- */
export const SEC_PARTS = {"1":["関係","Relations & abstract ideas"],"2":["人間","People & society"],"3":["活動","Actions, mind & life"],
  "4":["生産物","Things people make"],"5":["自然","Nature"],"x":["その他","Other words"]};
export async function renderSections(){
  document.body.classList.remove("playing");
  const S = await loadSections();
  const LVL = store.get("jc:slevel", "N1") === "N2" ? "N2" : "N1";
  $("#pageTitle").textContent = "Sections";
  const part = s => /^[1-5]/.test(s.code) ? s.code[0] : "x";
  const parts = {}; S[LVL].forEach((s, i) => (parts[part(s)] = parts[part(s)] || []).push([s, i + 1]));
  showScreen("sections", createElement(SectionsToc, {   // v161: React (src/screens/Lists.tsx)
    tr, level: LVL, total: S[LVL].length, words: S[LVL].reduce((n, s) => n + s.words.length, 0), source: S.source || "",
    parts: Object.keys(SEC_PARTS).filter(k => parts[k]).map(k => ({title: SEC_PARTS[k][0], sub: SEC_PARTS[k][1],
      rows: parts[k].map(([s, n]) => ({id: s.id, n, name: s.name, en: s.en, words: s.words.length, seen: secSeen(LVL, s)}))})),
    onLevel: l => { store.set("jc:slevel", l); renderSections(); },
    onOpen: id => renderSection(id)}));
}

export async function renderSection(id){
  const S = await loadSections(), lv = id.split("-")[0], idx = S[lv].findIndex(x => x.id === id), s = S[lv][idx];
  const pool = await pgPool(lv), set = new Set(s.words);
  const cards = pool.words.filter(c => set.has(c.no));
  $("#pageTitle").textContent = s.name;
  showScreen("section-" + id, createElement(SectionPage, {   // v161: React (src/screens/Lists.tsx)
    tr, name: s.name, en: s.en, meta: `${lv} · section ${idx + 1} · ${cards.length} words`, cardsHtml: cards.map(c => miniCard(c, lv)).join(""),
    onBack: () => renderSections(),
    onStudy: () => { const cur = pgState(); cur.from = "section"; cur.section = id; cur.level = lv; store.set("jc:pg", cur);
      const name = s.name; pick("playground"); St.PG_NEW = true; St.PG_RETURN = {label: name, go: () => leavePracticeTo("sections", () => renderSection(id))}; renderPG(); }}));
}

/* ---------- Pre-learn reading page ---------- */
export async function renderPrelearn(id){
  document.body.classList.remove("playing");
  const R = await loadReading(id);
  // the reading file carries its own cards, so the page opens without loading the whole database
  const get = (t, lv, no) => ((R.cards || {})[t] || []).find(c => c.level === lv && c.no === no);
  const studied = R.words.filter(([lv, no]) => pgProfile(lv, "words", no).reviews).length;
  const list = (t, rows) => rows.map(([lv, no]) => { const c = get(t, lv, no); return c ? miniFor(t, c, lv) : ""; }).join("");
  $("#pageTitle").textContent = R.title;
  showScreen("pre-" + id, createElement(Prelearn, {   // v162: React (src/screens/Reading.tsx)
    tr, title: R.title, titleEn: R.titleEn, meta: `${R.level} · about ${Math.max(1, Math.round(R.text.length / 400))} min read · ${studied}/${R.words.length} words studied`,
    words: list("words", R.words), grammar: list("grammar", R.grammar), kanji: list("kanji", R.kanji),
    nWords: R.words.length, nGrammar: R.grammar.length, nKanji: R.kanji.length,
    source: R.source, sourceUrl: R.sourceUrl, imgCredit: R.imgCredit, imgUrl: R.imgUrl,
    onBack: () => renderReader(id),
    onStudy: () => { const cur = pgState(); cur.from = "reading"; cur.reading = id; cur.level = "ALL";
      cur.n.words = R.words.length; cur.n.kanji = R.kanji.length; cur.n.grammar = R.grammar.length; store.set("jc:pg", cur);
      pick("playground"); St.PG_NEW = true; St.PG_RETURN = {label: "Cards", go: () => leavePracticeTo("reading", () => renderPrelearn(id))}; renderPG(); }}));

}

/* ---------- Clean reader: only the text; tap any word = quick English ---------- */
export async function renderReader(id){
  const R = await loadReading(id);
  const listed = new Set(R.spans.filter(x => x[2] === "words").map(x => x[0] + ":" + x[1]));
  let html = "", at = 0;
  for(const [s, e, g, rd] of (R.tokens || [])){
    if(s < at) continue;
    html += esc(R.text.slice(at, s)) + `<span class="tk${listed.has(s + ":" + e) ? " tk-own" : ""}" data-g="${esc(g || "")}" data-r="${esc(rd || "")}">${esc(R.text.slice(s, e))}</span>`;
    at = e;
  }
  html += esc(R.text.slice(at));
  $("#pageTitle").textContent = R.title;
  showScreen("reader-" + id, createElement(Reader, {   // v162: React (src/screens/Reading.tsx)
    tr, title: R.title, html: html.split("\n").map(p => p.startsWith("§") ? `<h3 class="reader-ch">${p.slice(1)}</h3>` : `<p>${p}</p>`).join(""),
    back: ((SHELVES.find(x => x[0] === (R.shelf || "article")) || [])[1]) || "Books",
    source: R.source, sourceUrl: R.sourceUrl, voice: store.get("jc:tapvoice", true), speak,
    onVoice: on => store.set("jc:tapvoice", on), onShelf: () => renderShelf(R.shelf || "article"), onCards: () => renderPrelearn(id)}));
  setHeaderAction("Cards", () => { renderPrelearn(id); scrollTo(0, 0); });
}

/* ---------- Use it (v165: React src/screens/UseIt.tsx, logic src/useit/chat.ts) ---------- */
export async function renderUseIt(){
  document.body.classList.remove("playing");
  const newWords = async () => { USE.fromStudied = await pickUseWords(pgPool, c => pgProfile(c.level, "words", c.no).reviews); };
  if(!USE.words.length) await newWords();
  showScreen("useit-" + (store.get("jc:apikey", "") ? "key" : USE.wantKey ? "form" : "app"), createElement(UseIt, {newWords, onKeyChange: () => renderUseIt()}));
}

/* ---------- Pictures: one word, one photo (Wikidata label + Commons image, meaning-checked with JMdict) ---------- */
export async function renderPictures(){
  document.body.classList.remove("playing");
  let idx = []; try{ idx = await (await fetch("data/pictures/index.json", {cache:"no-cache"})).json(); }catch(e){}
  $("#pageTitle").textContent = "Pictures";
  idx = idx.filter(x => x.group !== "illust");
  showScreen("pictures", createElement(PicturesHome, {tr, cats: idx, src: picSrc, onOpen: k => renderPicCat(k),   // v164: React (src/screens/Pictures.tsx)
    loadCredits: async () => { const cats = await Promise.all(idx.map(x => fetch(`data/pictures/${x.key}.json`).then(r => r.json()).catch(() => null)));
      return cats.filter(Boolean).flatMap(C => C.words.flatMap(w => { const P = picsOf(w); return P.map((p, k) => ({word: w.word, n: P.length > 1 ? k + 1 : null, credit: p.credit, page: p.page})); })); }}));
}
export const picTile = x => `<button class="pic-cat${x.group === "illust" ? " illust" : ""}" data-pcat="${x.key}">
      <span class="pic-cover"><img src="${picSrc(x.cover)}" alt="" loading="lazy"></span>
      <b>${esc(x.ja)}</b><span>${esc(x.en.replace(" (いらすとや)", ""))} · ${x.count}</span></button>`;
export async function extraIdx(){ if(!St.EXTRA_IDX){ try{ St.EXTRA_IDX = await (await fetch("data/pictures/extra/index.json", {cache:"no-cache"})).json(); }catch(e){ St.EXTRA_IDX = []; } } return St.EXTRA_IDX; }
export async function extraThemes(){ const I = await extraIdx(), m = new Map();
  for(const x of I){ const t = m.get(x.theme) || {theme: x.theme, themeEn: x.themeEn, count: 0, cover: x.cover}; t.count += x.count; m.set(x.theme, t); }
  return [...m.values()]; }
export async function renderExtraTheme(theme){   // one theme's extra sessions (150 pictures each)
  const S = (await extraIdx()).filter(x => x.theme === theme);
  $("#pageTitle").textContent = theme;
  showScreen("xtheme-" + theme, createElement(ExtraTheme, {sessions: S, onBack: () => renderIllust(), onOpen: k => renderPicCat(k)}));   // v164: React
}
/* ---------- Listening: JLPT-format tests (original scripts, several voices). Listen, pick an answer, check, read the script ---------- */
/* Test lists (Listening + Reading tests): level switch, one compact row per test with its scenes and best score */
/* v152: answers in a test are kept until it is finished or started over; reopening lands on the first unanswered question */
/* v159: tests are React screens (src/screens/Tests.tsx); answers/scores in src/tests/quiz.ts */
/* v182: a wrong answer in a 言語知識 question puts the question itself in Exam mistakes (src/tests/mistakes.ts) */
const addMistake = m => Mistakes.add(m);
/** Exam mistakes: the due questions, looked up in their tests (a question whose test changed is found by its text, or dropped). */
export async function renderExamReview(){
  const due = Mistakes.due(), T = {}, items = [];
  for(const m of due){
    try{ T[m.test] = T[m.test] || await (await fetch(`data/vocabtests/${m.test}.json`, {cache:"no-cache"})).json(); }catch(e){ continue; }
    const t = T[m.test]; let part = m.part, item = m.item;
    if(!t.parts[part] || !t.parts[part].items[item] || t.parts[part].items[item].q !== m.q){
      part = t.parts.findIndex(pt => pt.items.some(x => x.q === m.q));
      item = part < 0 ? -1 : t.parts[part].items.findIndex(x => x.q === m.q);
    }
    if(item < 0){ Mistakes.drop(m); continue; }
    items.push({miss: {...m, part, item}, title: t.title || m.test, part: t.parts[part], x: t.parts[part].items[item]});
  }
  const c = Mistakes.counts();
  $("#pageTitle").textContent = tr("Exam mistakes");
  showScreen(`exr-${Date.now()}`, createElement(ExamReview, {items, waiting: c.waiting, next: c.next, tr, onBack: () => { renderPG(); scrollTo(0, 0); }}));
}
export const TEST_KINDS = {
  lsn: {title: "Listening", index: "data/listening/index.json", back: null},
  rdt: {title: "Reading exams", index: "data/readtests/index.json", back: null},   // v170: own Home tile (JLPT group)
  voc: {title: "Vocab & Grammar", index: "data/vocabtests/index.json", back: null},
};
export async function renderTestList(kind){
  const K0 = TEST_KINDS[kind];
  let L = []; try{ L = await (await fetch(K0.index, {cache:"no-cache"})).json(); }catch(e){}
  const levels = [...new Set(L.map(t => t.level))].sort(), key = "jc:tlv:" + kind;
  let lv = store.get(key, levels.includes("N1") ? "N1" : levels[0]); if(!levels.includes(lv)) lv = levels[0];
  const v = kind === "lsn" ? [...new Set(L.flatMap(t => t.voices || []))].sort() : [];
  $("#pageTitle").textContent = K0.title;
  const modeKey = "jc:tmode:" + kind; let mode = store.get(modeKey, "practice");   // v174: Practice / Exam
  const draw = () => showScreen("tl-" + kind, createElement(TestList, {kind, idx: L, level: lv, tr, back: K0.back, listMode: mode,
    onMode: m => { mode = m; store.set(modeKey, m); St.NAV_SAME = true; draw(); },
    credit: v.length ? "Voices: " + v.map(n => "VOICEVOX:" + n).join("、") + "、Microsoft Edge TTS (narrator)" : "",
    onLevel: l => { lv = l; store.set(key, l); St.NAV_SAME = true; draw(); },
    onOpen: id => renderTest(kind, id, mode),
    onBack: () => { renderReading(); scrollTo(0, 0); }}));
  draw();
}
export const renderListening = () => renderTestList("lsn"), renderReadTests = () => renderTestList("rdt"), renderVocabTests = () => renderTestList("voc");
export async function renderTest(kind, id, mode = "practice", init = null){
  const dir = {lsn: "listening", rdt: "readtests", voc: "vocabtests"}[kind];
  const T = await (await fetch(`data/${dir}/${id}.json`, {cache:"no-cache"})).json();
  const C = {lsn: ListenTest, rdt: ReadTest, voc: VocabTest}[kind];
  showScreen(`test-${kind}-${id}-${mode}-${Date.now()}`, createElement(C, {id, T, tr, mode, init,
    onReview: picked => renderTest(kind, id, "review", picked), onAgain: () => renderTest(kind, id, mode), setTitle: t => { $("#pageTitle").textContent = t; }, onWrong: addMistake,
    onBack: () => renderTestList(kind)}));
}
export const renderReadTest = id => renderTest("rdt", id), renderVocabTest = id => renderTest("voc", id), renderListenTest = id => renderTest("lsn", id);
export async function renderIllust(){   // いらすとや: one row per topic, sessions scroll sideways (words with pictures)
  document.body.classList.remove("playing");
  let idx = [], ext = [];
  try{ idx = (await (await fetch("data/pictures/index.json", {cache:"no-cache"})).json()).filter(x => x.group === "illust"); }catch(e){}
  ext = await extraIdx();
  for(const x of idx) if(!x.first) x.first = [];
  const rows = new Map(), themeOf = x => x.theme || x.ja.replace(/ \d+$/, "");
  for(const x of [...idx, ...ext]){ const t = themeOf(x); if(!rows.has(t)) rows.set(t, {en: (x.themeEn || x.en || "").replace(" (いらすとや)", ""), items: []}); rows.get(t).items.push(x); }
  const order = [...rows.keys()].sort((a, b) => (a === "その他") - (b === "その他"));
  $("#pageTitle").textContent = "Illustrations";
  showScreen("illust", createElement(Illustrations, {src: picSrc, onOpen: k => renderPicCat(k),   // v164: React (src/screens/Pictures.tsx)
    rows: order.map(t => { const R = rows.get(t); return {theme: t, en: R.en, total: R.items.reduce((n, x) => n + x.count, 0), items: R.items}; })}));
}
export const picSrc = f => /^https?:/.test(f) ? f : `data/pictures/${f}`;   // extras load from いらすとや directly

export async function renderPicCat(key){
  const C = await (await fetch(`data/pictures/${/^x/.test(key) ? "extra/" : ""}${key}.json`, {cache:"no-cache"})).json();
  const clean = s => (s || "").replace(/\s*\([^)]*[A-Z][a-z]+ [a-z]+[^)]*\)/g, "").trim();   // drop Latin species names
  const W = C.words;
  $("#pageTitle").textContent = C.ja;
  return picView(C, W, clean);   // tapping a category opens the viewer directly
  // 1) start screen: cover, title, count, Start, and the photo credits (kept OUT of the session)
  $("#list").innerHTML = `<section class="pic-start">
    <div class="story-top"><button class="nav-btn" id="picBack" data-back="Pictures">Back</button></div>
    <div class="ps-cover"><img src="data/pictures/${picsOf(W[0])[0].img}" alt=""></div>
    <h2 class="ps-title">${esc(C.ja)}<small>${esc(C.en)}</small></h2>
    <p class="ps-count">${W.length} words</p>
    <button class="ps-go" id="picGo" type="button">Start</button>
    <details class="ps-credits"><summary>Photo credits</summary><ol>${W.map(w => { const P = picsOf(w); return P.map((p, k) => `<li>${esc(w.word)}${P.length > 1 ? ` (${k + 1})` : ""} : <a href="${esc(p.page)}" target="_blank" rel="noopener">${esc(p.credit)}</a></li>`).join(""); }).join("")}</ol></details>
  </section>`;
  $("#picBack").onclick = () => { renderPictures(); scrollTo(0, 0); };
  $("#picGo").onclick = () => picView(C, W, clean);
}
// 2) the clean session: one photo at a time (swipe / drag / ‹ › / arrow keys; click the photo = voice)
export function picView(C, W, clean){   // v164: React viewer (src/screens/Pictures.tsx) + behaviour in src/pictures/viewer.ts
  const illust = /^x/.test(C.key) || C.key.startsWith("ira_");
  showScreen("pv-" + C.key, createElement(PicViewer, {catKey: C.key, words: W, back: illust ? "Illustrations" : "Pictures", sound: soundOn(), spk: SPK, spkOff: SPK_OFF, clean,
    deps: {count: W.length, word: n => W[n].word, src: picSrc, soundOn, speak, spk: SPK, spkOff: SPK_OFF},
    onBack: () => (illust ? renderIllust : renderPictures)()}));
}

/* ---------- Reading ---------- */
/* Reading = a library: shelves of books, every book works the same (learn cards -> read -> tap a word) */
export const SHELVES = [["article","記事","Articles","記"],["news","ニュース","News","報"],["novel","小説","Novels","小"],["story","物語","Short stories","物"],["literature","文学","Literature","文"]];
/* 文庫本 look: paper covers in slightly different tones; colour only on the spine + mark (muted traditional colours) */
export const SPINE = {article:"#3A4F6B", news:"#66683A", novel:"#7A3E3E", story:"#3E3B38"};   // 藍 / 鶯 / 小豆 / 墨
export const PAPER = ["var(--pp1)","var(--pp2)","var(--pp3)","var(--pp4)"];
export async function readIndex(){
  if(!St.READ_INDEX){ try{ St.READ_INDEX = await (await fetch("data/readings/index.json", {cache:"no-cache"})).json(); }catch(e){ St.READ_INDEX = []; } }
  // News: newest first (by publish date); other shelves keep their order
  St.READ_INDEX.sort((a, b) => (a.shelf === "news" && b.shelf === "news") ? (b.date || "").localeCompare(a.date || "") : 0);
  return St.READ_INDEX;
}
export function bookHTML(x){
  const mins = Math.max(1, Math.round(x.chars / 400));
  // the picture is the cover; without a free image, a typographic cover (the title's first kanji)
  const first = (x.title.match(/[\u4e00-\u9fff]/) || [x.title[0]])[0];
  return `<button class="book" data-prelearn="${x.id}" aria-label="${esc(x.title)}">
    <span class="bk-cover">${x.img ? `<img src="data/readings/${x.img}" alt="" loading="lazy">` : `<span class="bk-type">${esc(first)}</span>`}</span>
    <b class="bk-t">${esc(x.title)}</b>
    <span class="bk-meta">${x.date ? `${+x.date.slice(5, 7)}/${+x.date.slice(8, 10)} · ` : ""}${x.counts[0]}語 · ${mins}分</span>
  </button>`;
}
export async function renderReading(){
  document.body.classList.remove("playing");
  St.READ_INDEX = null; const RD = await readIndex();
  $("#pageTitle").textContent = "Books";
  let order = 0;
  const draw = () => showScreen("reading", createElement(ReadingHome, {   // v162: React (src/screens/Reading.tsx)
    tr, order,
    rows: shelfOrder().filter(([k]) => RD.some(x => (x.shelf || "article") === k)).map(([k, jp, en]) => {
      const items = RD.filter(x => (x.shelf || "article") === k);
      return {key: k, jp, en, count: items.length, fan: items.filter(x => x.img).slice(0, 3).map(x => x.img)}; }),
    reorder: secReorder, justDropped: () => SEC_DRAG.justDropped,
    onShelf: k => renderShelf(k),
    onReordered: () => { order++; draw(); }}));
  draw();
}
/* his order of the Reading sections (press-and-hold + drag); saved per device */
export function shelfOrder(){
  const o = store.get(K.shelfOrder, []);
  const rank = k => { const i = o.indexOf(k); return i < 0 ? 99 + SHELVES.findIndex(s => s[0] === k) : i; };
  return [...SHELVES].sort((a, b) => rank(a[0]) - rank(b[0]));
}
export const SEC_DRAG = {justDropped: false};
export function secReorder(box, onDrop){
  if(!box) return;
  let row = null, timer = null, startX = 0, startY = 0, grab = 0, on = false, mouse = false;
  const lift = () => { on = true; grab = startY - row.getBoundingClientRect().top;
    row.classList.add("lifted"); box.classList.add("sorting"); if(!mouse && navigator.vibrate) navigator.vibrate(15); };
  const pt = e => e.touches ? e.touches[0] : e;
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches, EASE = "cubic-bezier(.2,.8,.2,1)";
  const place = y => {   // move the lifted row to the slot under the finger; the others SLIDE out of the way (FLIP)
    const sibs = [...box.querySelectorAll(".sec-row")].filter(b => b !== row);
    const before = new Map(sibs.map(b => [b, b.getBoundingClientRect().top]));
    const slotTop = b => box.getBoundingClientRect().top + b.offsetTop - box.offsetTop;   // resting layout position (ignores running transforms/scale)
    for(const sib of sibs){
      const mid = slotTop(sib) + sib.offsetHeight / 2;
      const after = row.compareDocumentPosition(sib) & Node.DOCUMENT_POSITION_FOLLOWING;
      if(after && y > mid) sib.after(row); else if(!after && y < mid) sib.before(row);
    }
    row.style.transform = `translateY(${y - grab - slotTop(row)}px)`;
    if(calm) return;
    for(const sib of sibs){   // First/Last/Invert/Play: start where it was, glide to the new slot
      sib.style.transition = "none"; sib.style.transform = "";
      const d = before.get(sib) - sib.getBoundingClientRect().top;
      if(Math.abs(d) < 1) continue;
      sib.style.transform = `translateY(${d}px)`; sib.getBoundingClientRect();
      sib.style.transition = `transform .26s ${EASE}`; sib.style.transform = "";
    }
  };
  const start = e => {
    const r = e.target.closest(".sec-row"); if(!r || (e.button && e.button !== 0)) return;
    const p = pt(e); startX = p.clientX; startY = p.clientY; row = r; mouse = !e.touches;
    if(mouse){ e.preventDefault(); return; }   // mouse: drag starts on movement (no hold); touch: hold first so swipes still scroll
    timer = setTimeout(lift, 420);
  };
  const move = e => {
    if(!document.body.contains(box)){ removeEventListener("mousemove", move); removeEventListener("mouseup", end); return; }
    if(!row) return; const p = pt(e);
    if(!on){
      if(Math.hypot(p.clientX - startX, p.clientY - startY) > 6){
        if(mouse) lift(); else { clearTimeout(timer); row = null; return; }   // touch moved before the hold = a scroll
      } else return;
    }
    if(e.cancelable) e.preventDefault(); place(p.clientY);
  };
  const end = () => {
    clearTimeout(timer);
    if(on){ const r = row; box.classList.remove("sorting");
      if(calm){ r.classList.remove("lifted"); r.style.transform = ""; }
      else { r.style.transition = `transform .24s ${EASE}, scale .24s ${EASE}, box-shadow .3s ease`; r.style.transform = ""; r.classList.remove("lifted");
        setTimeout(() => { r.style.transition = ""; }, 320); }   // glide into its slot and settle
      store.set(K.shelfOrder, [...box.querySelectorAll(".sec-row")].map(b => b.dataset.shelf));
      if(onDrop) setTimeout(onDrop, calm ? 0 : 330);   // redraw from the saved order once the row has settled
      SEC_DRAG.justDropped = true; setTimeout(() => SEC_DRAG.justDropped = false, 350); }
    row = null; on = false;
  };
  box.addEventListener("touchstart", start, {passive: true});
  box.addEventListener("touchmove", move, {passive: false});
  box.addEventListener("touchend", end); box.addEventListener("touchcancel", end);
  box.addEventListener("mousedown", start);
  addEventListener("mousemove", move); addEventListener("mouseup", end);
  box.addEventListener("contextmenu", e => { if(e.target.closest(".sec-row")) e.preventDefault(); });
}
export async function renderShelf(k){
  const RD = await readIndex(), [, jp, en] = SHELVES.find(s => s[0] === k), items = RD.filter(x => (x.shelf || "article") === k);
  $("#pageTitle").textContent = jp;
  showScreen("shelf-" + k, createElement(Shelf, {tr, jp, en, items, onBack: () => renderReading()}));   // v162: React
}
export async function renderStory(id){
  let st; try{ st = await (await fetch(`data/stories/${id}.json`, {cache:"no-cache"})).json(); }catch(e){ return; }
  $("#pageTitle").textContent = st.title;
  showScreen("story-" + id, createElement(Story, {title: st.title, level: st.level, source: st.source, sentences: st.sentences,   // v162: React
    onBack: () => { $("#pageTitle").textContent = "Books"; renderReading(); }}));
}
