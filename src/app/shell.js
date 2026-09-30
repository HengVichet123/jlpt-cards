/* app/shell.js: part of the app split out of the old single file (v166). Imports generated from use. */
import { PLAYER } from "../audio/player";
import { STORY, stopStory } from "../movies/player";
import { St } from "../app/state";
import { renderScreen } from "../react/mount";
import { store } from "../data/store";
import { $, APP_VERSION, esc } from "../app/core.js";
import { applyLang, isJa, jaWalk } from "../app/i18n.js";
import { applyTheme, closeSettingsSheet, openSettingsSheet, renderSettings } from "../app/settings.js";
import { calmMotion, dotsKey, flipCard, grammarCard, kanjiCard, wordCard } from "../cards/cards.js";
import { pgDockDrop, pgNew, pgSheetClose, renderPG } from "../app/practice.js";
import { renderComplete, renderHome, renderIllust, renderListening, renderNovel, renderNovels, renderPictures, renderReadTests, renderReader, renderReading, renderScene, renderScenes, renderSections, renderStory, renderUseIt, renderVocabTests } from "../app/pages.js";
import { sayOff, speak } from "../audio/speech.js";

/* =========================================================
   LOCAL STORAGE
   ========================================================= */

// v154: all saved data goes through src/data/store.ts (same keys, same behaviour)
/* v155+: React screens. Same key = updated in place, so the page-slide flags are reset here (innerHTML did that before). */
export function showScreen(key, node){
  if(renderScreen($("#list"), key, node)){ St.NAV_SAME = false; St.NAV_DIR = "fwd"; St.SWIPE_FROM = 0; }   // same page redrawn in place: keep the position
  else scrollTo(0, 0);   // v169: every page opens at the top
}
/* one optional action on the right of the header, owned by the page that set it */
export function setHeaderAction(label, fn){ const b = $("#hdrAct"); b.textContent = label; b.onclick = fn; b.hidden = false; b._owner = $("#list").firstElementChild; jaWalk(b); }
export function syncHeaderAction(){ const b = $("#hdrAct"); if(b && !b.hidden && !(b._owner && document.body.contains(b._owner))) b.hidden = true; }


/* =========================================================
   NORMAL RENDER
   ========================================================= */

export function render(){

  document
    .querySelectorAll(".tab")
    .forEach(
      el =>
        el.classList.toggle(
          "on",
          el.dataset.t === St.TAB
        )
    );


  $("#filter").textContent =
    St.ONLY_WEAK
      ? "Weak only"
      : "All";


  $("#filter").classList.toggle(
    "on",
    St.ONLY_WEAK
  );


  if(!St.DATA)
    return;


  let items =
    St.DATA[St.TAB];


  if(St.ONLY_WEAK){

    items =
      items.filter(
        c =>
          store
            .get(
              dotsKey(
                St.TAB,
                c.no
              ),
              [0,0,0]
            )
            .filter(Boolean)
            .length < 3
      );

  }


  const make = {
    words:wordCard,
    kanji:kanjiCard,
    grammar:grammarCard
  }[St.TAB];


  $("#list").innerHTML =
    items.length

      ? items
          .map(make)
          .join("")

      : `

        <div class="empty">
          Nothing here.
        </div>

      `;


  $("#count").textContent =
    `${St.DATA.level} Day ${St.DATA.day} · ${items.length} cards`;

}


/* =========================================================
   CLICK HANDLING
   ========================================================= */

document.addEventListener(
  "click",
  e => {

    const say = e.target.closest(".say");
    if(say){ e.stopPropagation(); sayOff(); speak(say.dataset.say); if(say.classList.contains("say-i") && PLAYER.src && !PLAYER.src.startsWith("data:")){ St.SAY_ON = say; say.classList.add("playing"); } return; }

    const scene = e.target.closest("[data-scene]");
    if(scene){ renderScene(scene.dataset.scene); window.scrollTo(0,0); return; }

    const novel = e.target.closest("[data-novel]");
    if(novel){ renderNovel(novel.dataset.novel); window.scrollTo(0,0); return; }

    const pre = e.target.closest("[data-prelearn]");
    if(pre){ renderReader(pre.dataset.prelearn); window.scrollTo(0,0); return; }   // a book opens straight into the text
    const story = e.target.closest("[data-story]");
    if(story){ renderStory(story.dataset.story); window.scrollTo(0,0); return; }


    /* ---------- Dots ---------- */

    const dot =
      e.target.closest(
        ".dot"
      );


    if(dot){

      const box =
        dot.parentElement;


      const k =
        dotsKey(
          box.dataset.type,
          box.dataset.no
        );


      const v =
        store.get(
          k,
          [0,0,0]
        );


      v[
        +dot.dataset.i
      ] =
        v[
          +dot.dataset.i
        ]
          ? 0
          : 1;


      store.set(
        k,
        v
      );


      dot.classList.toggle(
        "on",
        !!v[
          +dot.dataset.i
        ]
      );


      return;

    }


    /* ---------- Links ---------- */

    if(
      e.target.closest("a")
    )
      return;


    /* ---------- Example translation ---------- */

    const ex =
      e.target.closest(
        ".ex"
      );


    if(ex){

      ex.classList.toggle(
        "open"
      );

      return;

    }


    /* ---------- Playground card: tap anywhere to open, tap the top to close ---------- */

    const stageCard = e.target.closest(".play-stage .card") || (e.target.closest(".play-stage") && !e.target.closest("button") && $(".play-stage .card"));
    if(stageCard){   // anywhere in the practice area flips; examples keep their own tap (English)
      if(e.target.closest(".ex, a, .say")) return;
      flipCard(stageCard, !stageCard.classList.contains("open")); return;
    }


    /* ---------- Normal card ---------- */

    const front =
      e.target.closest(
        ".front"
      );


    if(front){

      front.parentElement
        .classList.toggle(
          "open"
        );

      return;

    }


    /* ---------- Home buttons ---------- */

    const home =
      e.target.closest(
        "[data-home]"
      );
    if(home && home.dataset.home === "settings"){ openSettingsSheet(); return; }


    if(home){

      $("#lesson").value =
        home.dataset.home;


      store.set(
        "jc:lesson",
        home.dataset.home
      );


      pick(
        home.dataset.home
      );


      return;

    }


    /* ---------- Lesson buttons ---------- */

    const lesson =
      e.target.closest(
        "[data-lesson]"
      );


    if(lesson){

      $("#lesson").value =
        lesson.dataset.lesson;


      store.set(
        "jc:lesson",
        lesson.dataset.lesson
      );


      pick(
        lesson.dataset.lesson
      );


      return;

    }


    /* ---------- Tabs ---------- */

    const tab =
      e.target.closest(
        ".tab"
      );


    if(tab){

      St.TAB =
        tab.dataset.t;


      store.set(
        "jc:tab",
        St.TAB
      );


      if(St.CURRENT === "complete"){ St.NAV_SAME = true; renderComplete(); }
      else render();


      window.scrollTo(
        0,
        0
      );

    }

  }
);

$("#famToggle").onclick = () => {
  const on = !document.body.classList.contains("showfam");
  document.body.classList.toggle("showfam", on); store.set("jc:showfam", on);
  $("#famToggle").setAttribute("aria-pressed", on);
};
/* one back link in the header: goes to the page's parent (its hidden [data-back] button), else Home */
$("#goHome").onclick = () => { St.NAV_DIR = "back"; const b = $("#list [data-back]"); if(b){ b.click(); scrollTo(0, 0); return; } store.set("jc:lesson","home"); pick("home"); };
export const syncBack = () => { const b = $("#list [data-back]"); $("#goHome").textContent = "‹ " + (b ? b.dataset.back : "Home"); };
new MutationObserver(() => { syncBack(); syncHeaderAction(); }).observe($("#list"), {childList: true});
/* page swap: every full page change goes through #list.innerHTML; the old page eases out while the new one eases in.
   Forward = new page from the right; back (header back / swipe) = from the left. */
(() => {
  const LIST = $("#list"), d = Object.getOwnPropertyDescriptor(Element.prototype, "innerHTML");
  Object.defineProperty(LIST, "innerHTML", {get(){ return d.get.call(this); }, set(v){
    const dir = St.NAV_DIR, from = St.SWIPE_FROM, same = St.NAV_SAME; St.NAV_DIR = "fwd"; St.SWIPE_FROM = 0; St.NAV_SAME = false;
    const had = LIST.firstElementChild, practice = document.body.classList.contains("playing") || /play-screen/.test(v) || (had && had.classList && (had.classList.contains("play-screen") || !!had.querySelector(":scope > .play-screen")));
    if(calmMotion() || !had || practice || same){ d.set.call(this, v); return; }
    const r = LIST.getBoundingClientRect(), ghost = LIST.cloneNode(true);
    ghost.removeAttribute("id"); ghost.querySelectorAll("[id]").forEach(x => x.removeAttribute("id"));
    Object.assign(ghost.style, {position:"fixed", left: r.left + "px", top: r.top + "px", width: r.width + "px", margin:"0", pointerEvents:"none", zIndex:"0", transform:""});
    document.body.appendChild(ghost);
    d.set.call(this, v);
    // v168: a calm crossfade instead of a big slide: the old page fades out fast, the new one fades in with a small glide
    // (16 px in the direction of travel). Small moves also keep the page from ever being wider than the screen,
    // which made iPhone zoom out for a moment ("small, then resized to fit").
    const inn = dir === "back" ? -16 : 16;
    ghost.animate([{transform:`translateX(${from}px)`, opacity:1},{transform:`translateX(${from + (dir === "back" ? 24 : -8)}px)`, opacity:0}],
      {duration:170, easing:"ease-out", fill:"forwards"}).onfinish = () => ghost.remove();
    LIST.animate([{transform:`translateX(${inn}px)`, opacity:0},{transform:"none", opacity:1}], {duration:280, delay:60, easing:"cubic-bezier(.2,.8,.2,1)", fill:"backwards"});
  }});
})();
new MutationObserver(ms => {   // Practice: a new card pops in and stays put
  if(calmMotion() || !ms.some(m => m.removedNodes.length && m.addedNodes.length)) return;
  const pc = $("#list .play-stage .play-card");
  if(pc){ pc.animate([{opacity:0, transform:"scale(.96)"},{opacity:1, transform:"none"}], {duration:240, easing:"cubic-bezier(.2,.8,.2,1)"}); return; }
  return;
  $("#list").animate([{opacity:0, transform:"translateY(6px)"},{opacity:1, transform:"none"}], {duration:200, easing:"cubic-bezier(.2,.8,.2,1)"});
}).observe($("#list"), {childList: true});
applyTheme();
new MutationObserver(ms => { if(isJa()) for(const m of ms) m.addedNodes.forEach(n => jaWalk(n.nodeType === 1 ? n : n.parentNode)); })
  .observe($("#list"), {childList: true, subtree: true});
new MutationObserver(() => { if(isJa()) jaWalk(document.querySelector("header")); })
  .observe(document.querySelector("header"), {childList: true, subtree: true, characterData: true});
applyLang();
(() => { let x0 = 0, y0 = 0, t0 = 0, ok = false, drag = false, dx = 0;
  const L = () => $("#list");
  const inRun = () => document.body.classList.contains("playing") && !!$("#pgBack");   // Practice run: swipe right = Exit
  const inFilm = () => document.body.classList.contains("cinema") && !!$(".th-exit");      // Movies: swipe right = Exit to the Movies list
  addEventListener("touchstart", e => { const t = e.touches[0]; x0 = t.clientX; y0 = t.clientY; t0 = Date.now(); drag = false; dx = 0;
    ok = e.touches.length === 1 && St.CURRENT !== "home" && (inRun() || inFilm() || (!$("#top").hidden && !document.body.classList.contains("cinema") && !e.target.closest(".play-screen"))) &&
      !e.target.closest(".pv-track,.home-rail,input,select,textarea,.sec-rows.sorting,.reader,.seg,.th-seek,.pg-sheet"); }, {passive: true});
  addEventListener("touchmove", e => { if(!ok) return; const t = e.touches[0]; dx = t.clientX - x0; const dy = t.clientY - y0;
    if(!drag){ if(Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)){ ok = false; return; } if(dx > 14 && dx > Math.abs(dy) * 1.4) drag = true; else return; }
    if(e.cancelable) e.preventDefault();   // horizontal swipe: keep the page still (no scroll, no drag)
  }, {passive: false});
  addEventListener("touchend", () => { if(!ok || !drag){ ok = false; return; } ok = false;
    const v = dx / Math.max(1, Date.now() - t0), go = dx > innerWidth * .25 || (v > .4 && dx > 50);
    const l = L();
    if(go && inRun()){ St.NAV_DIR = "back"; $("#pgBack").click(); return; }
    if(go && inFilm()){ $(".th-exit").click(); return; }
    if(go){ St.NAV_DIR = "back"; $("#goHome").click(); }
  }, {passive: true});
})();


/* =========================================================
   FILTER
   ========================================================= */

$("#filter").onclick =
  () => {

    St.ONLY_WEAK =
      !St.ONLY_WEAK;


    store.set(
      "jc:weak",
      St.ONLY_WEAK
    );


    render();

  };


/* =========================================================
   LESSON SELECT
   ========================================================= */

$("#lesson").onchange =
  e => {

    if(
      e.target.value ===
      "playground"
    ){

      store.set(
        "jc:returnLesson",
        store.get(
          "jc:lesson",
          St.INDEX[0]?.id || ""
        )
      );

    }


    store.set(
      "jc:lesson",
      e.target.value
    );


    pick(
      e.target.value
    );

  };


/* =========================================================
   PICK VIEW
   ========================================================= */

export function pick(id){
  pgDockDrop(); pgSheetClose(true); if(!St.KEEP_SETTINGS) closeSettingsSheet(true); document.body.classList.remove("cinema");
  if(id !== "playground") St.PG_RETURN = null;
  St.PG_NEW = false; St.SESS_EDIT = null;
  if(typeof stopStory === "function" && STORY.cont) stopStory();

  St.PLAY =
    id === "playground";

  St.PG_RUNNING = false;
  St.CURRENT = id;

  const T2 = (j, e) => `${j}<small class="pt-en">${e}</small>`;
  const titles = {settings:"Settings", home:"", playground:"Practice", complete:"Complete list", reading:"Books", readtests:"Reading tests", novels:"Movies", scenes:"Scenes", photos:"Photos", explore:"Explorer", sections:"Sections", useit:"Use it", pictures:"Pictures", illust:"Illustrations", listening:"Listening", vocab:"Vocab & Grammar"};
  const lessonName = (St.INDEX.find(x => x.id === id) || {});
  $("#pageTitle").innerHTML = id in titles ? titles[id] : `${lessonName.level||""} · Day ${lessonName.day||""}`;

  $("#top").hidden = id === "home";
  document.querySelector(".tabs").hidden = id in titles;   // Complete list has its own tabs in the page
  $("#filter").hidden = true;
  $("#ver").hidden = true;   // version lives in Settings only
  $("#famToggle").hidden = true;   // moved to Settings
  const showFam = store.get("jc:showfam", false);
  document.body.classList.toggle("showfam", showFam);
  $("#famToggle").setAttribute("aria-pressed", showFam);

  if(St.PLAY)
    renderPG();

  else if(id === "home")
    renderHome();

  else if(id === "settings")
    renderSettings();

  else if(id === "complete")
    renderComplete();

  else if(id === "readtests")   // v170: JLPT reading tests have their own Home tile
    renderReadTests();

  else if(id === "reading")
    renderReading();

  else if(id === "novels")
    renderNovels();

  else if(id === "scenes"){
    St.SCENE_DIR = "scenes"; renderScenes(); }

  else if(id === "sections")
    renderSections();

  else if(id === "useit")
    renderUseIt();

  else if(id === "pictures")
    renderPictures();

  else if(id === "illust")
    renderIllust();

  else if(id === "listening")
    renderListening();

  else if(id === "vocab")
    renderVocabTests();

  else if(id === "photos"){
    St.SCENE_DIR = "photos"; renderScenes(); }

  else if(id === "explore"){
    St.SCENE_DIR = "explore";
    fetch("data/explore/index.json", {cache:"no-cache"}).then(r => r.json()).then(x => renderScene(x.start)).catch(() => {}); }

  else
    load(id);

}


/* =========================================================
   LOAD LESSON
   ========================================================= */

export async function load(id){

  try{

    const r =
      await fetch(
        `data/${id}.json`,
        {
          cache:"no-cache"
        }
      );


    St.DATA =
      await r.json();


    render();


    window.scrollTo(
      0,
      0
    );

  }catch(err){

    $("#list").innerHTML =
      `<div class="empty">
        Could not load
        ${esc(id)}.
      </div>`;

  }

}


/* =========================================================
   INITIALIZATION
   ========================================================= */

(async function init(){

  $("#ver").textContent =
    APP_VERSION;


  try{

    St.INDEX =
      await (
        await fetch(
          "data/index.json",
          {
            cache:"no-cache"
          }
        )
      ).json();

  }catch(e){

    $("#list").innerHTML =
      `<div class="empty">
        Could not load lesson list.
      </div>`;

    return;

  }


  const sel =
    $("#lesson");


  sel.innerHTML = `

    <option value="home">
      ⌂ Home
    </option>

    <option value="playground">
      ▶ Playground
    </option>

    ${
      St.INDEX
        .map(
          x =>
            `<option value="${x.id}">
              ${x.level} · Day ${x.day}
              (${x.counts[0]}語
               ${x.counts[1]}字
               ${x.counts[2]}文法)
            </option>`
        )
        .join("")
    }

  `;


  const saved =
    store.get(
      "jc:lesson",
      null
    );


  sel.value = "home"; // always open on Home


  if(
    new URLSearchParams(
      location.search
    ).has("play")
  ){

    sel.value =
      "playground";

  }


  pick(
    sel.value
  );


  if(
    new URLSearchParams(
      location.search
    ).get("play") ===
    "new"
  ){

    setTimeout(
      pgNew,
      300
    );

  }

})();


/* =========================================================
   SERVICE WORKER
   ========================================================= */

if(
  "serviceWorker" in navigator
){

  navigator.serviceWorker
    .register("sw.js")
    .catch(
      () => {}
    );

}


