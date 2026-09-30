/* app/practice.js: part of the app split out of the old single file (v166). Imports generated from use. */
import { K, store } from "../data/store";
import { PracticeHome } from "../screens/PracticeHome";
import { PracticeRun } from "../screens/PracticeRun";
import * as SRS from "../practice/srs";
import * as Sess from "../practice/sessions";
import { St } from "../app/state";
import { createElement } from "react";
import { $ } from "../app/core.js";
import { calmMotion, grammarCard, kanjiCard, shortAnswer, wordCard } from "../cards/cards.js";
import { isJa, tr } from "../app/i18n.js";
import { pick, render, showScreen } from "../app/shell.js";

/* =========================================================
   PLAYGROUND DATA
   ========================================================= */

export const PG = {
  pool:{},
  now:() => Date.now()
};


/* v156: review rules, undo and sessions live in src/practice/ (srs.ts, sessions.ts) */
export const pgCanUndo = () => SRS.canUndo(pgState().sid);
export function pgUndo(){ if(SRS.undo(pgState().sid)){ St.NAV_SAME = true; renderPG(); } }
export function pgRate(lvl, type, no, m){   // Again / Hard / Easy on the running card
  SRS.snapshot(lvl, type, no, pgState().sid);   // for undo
  SRS.rate(lvl, type, no, m);
  if(m === SRS.EASY) Sess.markDone([lvl, type, no]);
  renderPG();
}
export const pgKey = K.due, profileKey = K.profile;
export const pgProfile = SRS.profile;


export const PG_LOADING = {};
export function pgPool(level){   // one load per level, shared by everyone asking while it runs
  if(PG.pool[level]) return Promise.resolve(PG.pool[level]);
  return PG_LOADING[level] || (PG_LOADING[level] = pgPoolLoad(level).finally(() => delete PG_LOADING[level]));
}
export async function pgPoolLoad(level){

  if(level === "ALL"){   // build from the per-level pools (loaded once each)
    const a = await pgPool("N1"), b = await pgPool("N2"), m = {};
    for(const t of ["words","kanji","grammar"]) m[t] = [...a[t], ...b[t]];
    return PG.pool.ALL = m;
  }


  const pool = {
    words:[],
    kanji:[],
    grammar:[]
  };


  // all lesson files of the level in parallel (was one-by-one: ~30 round trips in a row on a phone)
  const files = St.INDEX.filter(i => i.level === level);
  const got = await Promise.all(files.map(x =>
    fetch(`data/${x.id}.json`, {cache:"no-cache"})   // revalidate: card updates show up right away
      .then(r => r.json()).then(d => [x, d]).catch(() => null)));
  for(const g of got){
    if(!g) continue;
    const [x, d] = g;
    for(const t of ["words","kanji","grammar"])
      pool[t].push(...(d[t] || []).map(c => ({...c, level:x.level})));
  }


  for(const t of ["words","kanji","grammar"])
    pool[t].sort((a, b) => a.level.localeCompare(b.level) || a.no - b.no);

  return PG.pool[level] =
    pool;

}


/* Sections: N1/N2 words grouped by meaning (分類語彙表), like chapters in a textbook */
export async function loadSections(){
  if(!St.SECTIONS){ try{ St.SECTIONS = await (await fetch("data/sections.json", {cache:"no-cache"})).json(); }catch(e){ St.SECTIONS = {N1:[], N2:[]}; } }
  return St.SECTIONS;
}
/* Pre-learn readings: a real text + the list of our cards it uses */
export const READINGS = {};
export async function loadReading(id){
  if(!READINGS[id]) READINGS[id] = await (await fetch(`data/readings/${id}.json`, {cache:"no-cache"})).json();
  return READINGS[id];
}
export const secSeen = (lvl, s) => s.words.filter(no => pgProfile(lvl, "words", no).reviews).length;

export const pgState = Sess.state;


/* =========================================================
   NEW PLAYGROUND SESSION
   ========================================================= */

/* Saved sessions (this device): every started Practice is kept until all its cards are done, so it can be continued */
export const sessList = Sess.list, sessTodo = Sess.todo, sessOpen = Sess.open, sessSave = Sess.save, sessDrop = Sess.drop;
export function sessResume(id){
  const se = sessList().find(x => x.id === id); if(!se) return;
  const st = pgState(); Object.assign(st, {level: se.level, from: se.from, section: se.section, reading: se.reading, ids: sessTodo(se), sid: se.id});
  store.set("jc:pg", st); se.at = Date.now(); sessSave(se);
  St.PG_RUNNING = true; renderPG(); document.body.classList.remove("clean");
}
export const sessName = Sess.name;
export const sessDay = () => { const d = new Date(); return `${d.getMonth() + 1}/${d.getDate()}`; };
export function sessAutoName(title){ const st = pgState();
  return `${title || (st.from === "section" ? (isJa() ? "分野" : "Section") : (isJa() ? "全カード" : "All cards"))} ${sessDay()}`; }
export const pgDueIds = () => SRS.dueIds(50);
export async function pgQuickIds(n){ const pool = await pgPool("ALL"), ids = [];
  for(const c of pool.words){ if(!pgProfile(c.level, "words", c.no).reviews){ ids.push([c.level, "words", c.no]); if(ids.length >= n) break; } }
  return ids; }
export function pgStartWith(ids, label){
  if(!ids.length) return;
  const st = pgState(); Object.assign(st, {level: "ALL", from: "all", ids, sid: "s" + Date.now()});
  sessSave({id: st.sid, name: "", start: Date.now(), at: Date.now(), label, level: "ALL", from: "all", ids});
  store.set("jc:pg", st); St.PG_NEW = false; St.SESS_EDIT = null; St.PG_RUNNING = true; renderPG(); document.body.classList.remove("clean");
}
export const sessCounts = Sess.counts;
export function pgSheetClose(instant){
  const sh = $("#pgSheet"), sc = $("#pgScrim"); if(!sh) return;
  document.body.classList.remove("sheet-open");
  const gone = () => { sh.remove(); sc && sc.remove(); };
  if(instant || calmMotion()) gone(); else setTimeout(gone, 320);
}
export function pgDockLift(){   // move the bottom dock out of #list (page transitions transform #list, which drags fixed children along)
  document.querySelectorAll("body > .pg-dock").forEach(d => d.remove());
  const d = $("#list .pg-dock"); if(d) document.body.appendChild(d);
}
export function pgDockDrop(){ document.querySelectorAll("body > .pg-dock").forEach(d => d.remove()); if(St.PG_RUNNING || St.CURRENT !== "playground") pgSheetClose(true); }
export function sessWhen(t){ const d = new Date(t); return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`; }
export async function pgNew(name = ""){   // level and card counts are saved as they are tapped (jc:pg)

  const st =
    pgState();


  const pool =
    await pgPool(
      st.level
    );


  // Section mode: words only, from the chosen section
  let secNos = null, secPool = null;
  if(st.from === "section" && st.section){
    const S = await loadSections(), lv = st.section.split("-")[0], sec = (S[lv] || []).find(x => x.id === st.section);
    if(sec){ secNos = new Set(sec.words); st.level = lv; secPool = await pgPool(lv); }
  }

  let rdSet = null, rdPool = null;
  if(st.from === "reading" && st.reading){
    const R = await loadReading(st.reading);
    rdSet = {}; for(const t of ["words","kanji","grammar"]) rdSet[t] = new Set(R[t].map(x => x[0] + ":" + x[1]));
    rdPool = await pgPool("ALL");
  }

  st.ids = [];


  for(
    const t of [
      "words",
      "kanji",
      "grammar"
    ]
  ){

    if(secNos && t !== "words") continue;
    const candidates =
      (rdSet ? rdPool[t].filter(c => rdSet[t].has(c.level + ":" + c.no)) : secNos ? secPool[t].filter(c => secNos.has(c.no)) : pool[t])

        .filter(
          c => {

            const p =
              pgProfile(
                c.level,
                t,
                c.no
              );


            return (
              !p.dueAt ||
              p.dueAt <= PG.now()
            );

          }
        )

        .sort(
          (a,b) =>

            pgProfile(
              a.level,
              t,
              a.no
            ).familiarity

            -

            pgProfile(
              b.level,
              t,
              b.no
            ).familiarity
        );


    candidates
      .slice(0,st.n[t])
      .forEach(
        c =>
          st.ids.push([
            c.level,
            t,
            c.no
          ])
      );

  }


  let label = isJa() ? "全カード" : "All cards";
  if(st.from === "section" && st.section){ const sec = ((await loadSections())[st.section.split("-")[0]] || []).find(x => x.id === st.section); if(sec) label = sec.name; }
  if(st.from === "reading" && st.reading){ label = (await loadReading(st.reading)).title; }
  st.sid = "s" + Date.now(); St.PG_NEW = false; St.SESS_EDIT = null;
  const nm = name;
  if(st.ids.length) sessSave({id: st.sid, name: nm, start: Date.now(), at: Date.now(), label: sessAutoName(label === (isJa() ? "全カード" : "All cards") ? null : label), level: st.level, from: st.from, section: st.section, reading: st.reading, ids: st.ids});
  store.set("jc:pg", st);
  St.PG_RUNNING = true;

  renderPG();

}


/* =========================================================
   RENDER PLAYGROUND
   ========================================================= */

export async function renderPG(){
  pgDockDrop();

  document.body.classList.toggle(
    "playing",
    St.PLAY && St.PG_RUNNING
  );


  const st =
    pgState();


  const pool =
    await pgPool(
      st.level
    );


  const now =
    PG.now();


  if(!St.PG_RUNNING){

    St.DATA = {
      level:st.level
    };


    if(st.from === "section"){   // saved section may be gone (sections rebuilt) or from the other level -> first one
      const S0 = await loadSections(), lvls0 = st.level === "ALL" ? ["N1","N2"] : [st.level];
      const ok = st.section && lvls0.includes(st.section.split("-")[0]) && S0[st.section.split("-")[0]].some(x => x.id === st.section);
      if(!ok){ st.section = (S0[lvls0[0]][0] || {}).id; store.set("jc:pg", st); }
    }
    const secSet = st.from === "section" && st.section ? new Set(((await loadSections())[st.section.split("-")[0]].find(x => x.id === st.section) || {words:[]}).words) : null;
    const inRead = st.from === "reading" && st.reading;
    let rdInfo = null, rdKeys = null;
    if(inRead){
      rdInfo = await loadReading(st.reading);
      rdKeys = {}; for(const t of ["words","kanji","grammar"]) rdKeys[t] = new Set(rdInfo[t].map(x => x[0] + ":" + x[1]));
    }
    const pool2 = inRead ? await pgPool("ALL") : pool;
    const newLeft = t => inRead ? pool2[t].filter(c => rdKeys[t].has(c.level + ":" + c.no) && !pgProfile(c.level, t, c.no).reviews).length : pool[t].filter(c => (!secSet || (t === "words" && secSet.has(c.no) && c.level === st.section.split("-")[0])) && !pgProfile(c.level || st.level, t, c.no).reviews).length;
    const inSec = st.from === "section";
    let sections = null;
    if(inSec){
      const S = await loadSections();
      const lvls = st.level === "ALL" ? ["N1","N2"] : [st.level];
      if(!st.section || !lvls.includes(st.section.split("-")[0])){ st.section = (S[lvls[0]][0] || {}).id; store.set("jc:pg", st); }
      sections = lvls.map(lv => ({lv, items: S[lv].map((s, i) => ({id: s.id, label: `${i + 1}. ${s.name}${s.en ? ` (${s.en})` : ""} · ${secSeen(lv, s)}/${s.words.length}`}))}));
    }
    const redraw = () => { St.NAV_SAME = true; renderPG(); };
    const saveSt = f => { const cur = pgState(); f(cur); store.set("jc:pg", cur); redraw(); };
    $("#count").textContent = `Practice · ${st.level}`;
    $("#pageTitle").textContent = "Practice";
    showScreen("pg-home", createElement(PracticeHome, {   // v157: Practice home is a React screen (src/screens/PracticeHome.tsx)
      ja: isJa(), tr, calm: calmMotion(), sheetOpen: St.PG_NEW, origin: St.PG_RETURN ? St.PG_RETURN.label : null,
      sheet: {level: st.level, from: st.from || "all", hasReading: !!st.reading, n: {...st.n},
        newLeft: St.PG_NEW ? {words: newLeft("words"), kanji: newLeft("kanji"), grammar: newLeft("grammar")} : {words: 0, kanji: 0, grammar: 0},
        sections, section: st.section,
        reading: inRead ? {title: rdInfo.title, words: rdInfo.words.length, kanji: rdInfo.kanji.length, grammar: rdInfo.grammar.length} : null,
        placeholder: sessAutoName(inRead ? rdInfo.title : null)},
      onOrigin: () => St.PG_RETURN && St.PG_RETURN.go(),
      onResume: id => sessResume(id),
      onQuick: async () => pgStartWith(await pgQuickIds(10), `${isJa() ? "クイック10" : "Quick 10"} ${sessDay()}`),
      onSheet: open => { St.PG_NEW = open; St.SESS_EDIT = null; if(open || !St.PG_RETURN) redraw(); },   // closing from Cards/a section leaves Practice instead
      onLevel: l => saveSt(c => { c.level = l; }),
      onFrom: f => saveSt(c => { c.from = f; }),
      onSection: id => saveSt(c => { c.section = id; }),
      onStart: name => pgNew(name),
      onChanged: redraw,
    }));
    return;

  }


  const make = {
    words:wordCard,
    kanji:kanjiCard,
    grammar:grammarCard
  };


  const live = [];
  const later = [];


  for(
    const [lvl,t,no] of st.ids
  ){

    const c =
      pool[t].find(
        x =>
          x.level === lvl &&
          x.no === no
      );


    if(!c)
      continue;


    const due =
      pgProfile(
        lvl,
        t,
        no
      ).dueAt || 0;


    (
      due <= now
        ? live
        : later
    ).push([
      lvl,
      t,
      c,
      due
    ]);

  }


  St.DATA = {
    level:st.level
  };


  const current =
    live[0];


  const buckets = [

    [
      "Now",
      live.length
    ],

    [
      "3m",
      later.filter(
        x =>
          x[3] - now <=
          3 * 60000
      ).length
    ],

    [
      "10m",
      later.filter(
        x =>
          x[3] - now <=
          10 * 60000
      ).length
    ],

    [
      "1d",
      later.filter(
        x =>
          x[3] - now <=
          1440 * 60000
      ).length
    ]

  ];


  $("#count").textContent = `Practice · ${st.level}`;
  showScreen("pg-run", createElement(PracticeRun, {   // v158: the run screen is React (src/screens/PracticeRun.tsx); the card is the shared card HTML
    ja: isJa(), tr, calm: calmMotion(),
    card: current ? {key: `${current[0]}:${current[1]}:${current[2].no}:${current[2].__n = (current[2].__n || 0) + 1}`, level: current[0], type: current[1], no: current[2].no,
      html: shortAnswer(current[1], current[2], make[current[1]](current[2])).replace('<div class="card ', '<div class="card play-card ')} : null,
    live: live.length, later: later.length, canUndo: !!pgCanUndo(),
    onRate: m => pgRate(current[0], current[1], current[2].no, m),
    onUndo: pgUndo,
    onExit: () => { St.PG_RUNNING = false; renderPG(); },
  }));


  document.body.classList.remove("clean");

}


export function pgExit(){

  $("#lesson").value =
    "home";


  store.set(
    "jc:lesson",
    "home"
  );


  pick("home");

}


/* =========================================================
   HOME
   ========================================================= */

export function prefetchPools(){   // warm the Complete list / Playground pool while the user looks at Home
  const lv = store.get("jc:clevel", "N1") === "N2" ? "N2" : "N1";
  const go = () => pgPool(lv);
  "requestIdleCallback" in window ? requestIdleCallback(go, {timeout: 3000}) : setTimeout(go, 800);
}
export function dueLine(){   // real numbers from this phone's review marks (jc:due:*)
  const {due, later} = SRS.dueCounts();
  return due ? `${due} card${due === 1 ? "" : "s"} ready to review` : later ? `Next review ${nextDueIn()}` : "Start with new cards";
}
export function nextDueIn(){
  const m = SRS.minutesToNext();
  return !isFinite(m) ? "soon" : m < 60 ? `in ${m} min` : m < 1440 ? `in ${Math.round(m / 60)} h` : `in ${Math.round(m / 1440)} d`;
}



export function leavePracticeTo(id, render){ pgDockDrop(); St.PLAY = false; St.PG_RUNNING = false; St.CURRENT = id; document.body.classList.remove("playing");
  document.querySelector(".tabs").hidden = true; const r = St.PG_RETURN; St.PG_RETURN = null; render(); }


setInterval(
  () => {

    if(St.PLAY && document.querySelector("#list .play-empty"))   // only the "come back later" screen; never reset a card on screen
      renderPG();

  },
  30000
);
