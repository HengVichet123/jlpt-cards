import { store, K, migrate } from "../data/store";
import * as SRS from "../practice/srs";
import * as Sess from "../practice/sessions";
import { createElement } from "react";
import { renderScreen, renderOverlay, removeOverlay, hasOverlay } from "../react/mount";
import { SettingsPanel, SettingsSheet } from "../screens/Settings";
import { CompleteList, SectionsToc, SectionPage } from "../screens/Lists";
import { PracticeHome } from "../screens/PracticeHome";
import { PracticeRun } from "../screens/PracticeRun";
import { PLAYER, PLAY_ICO, PAUSE_ICO } from "../audio/player";
import { TestList, ReadTest, VocabTest, ListenTest } from "../screens/Tests";
import { Home } from "../screens/Home";
migrate();


/* =========================================================
   APP VERSION
   ========================================================= */

const APP_VERSION = "v161";


/* =========================================================
   HELPERS
   ========================================================= */

const $ = s =>
  document.querySelector(s);


const esc = s =>
  String(s ?? "").replace(
    /[&<>"]/g,
    c => ({
      "&":"&amp;",
      "<":"&lt;",
      ">":"&gt;",
      '"':"&quot;"
    }[c])
  );


function hl(text,targets){

  let out = esc(text);

  for(
    const t of [].concat(targets)
      .filter(Boolean)
      .sort((a,b) => b.length-a.length)
  ){

    const e = esc(t);

    if(out.includes(e)){

      out =
        out.split(e).join(
          `<b class="hl">${e}</b>`
        );

      break;

    }

  }

  return out;

}


/* =========================================================
   LOCAL STORAGE
   ========================================================= */

// v154: all saved data goes through src/data/store.ts (same keys, same behaviour)
/* v155+: React screens. Same key = updated in place, so the page-slide flags are reset here (innerHTML did that before). */
function showScreen(key, node){ if(renderScreen($("#list"), key, node)){ NAV_SAME = false; NAV_DIR = "fwd"; SWIPE_FROM = 0; } }
const tr = t => (isJa() && jaText(t)) || t;   // app text in Japanese-only mode (what jaWalk does to plain pages)


/* =========================================================
   GLOBAL STATE
   ========================================================= */

let INDEX = [];

let DATA = null;

let TAB =
  new URLSearchParams(location.search)
    .get("tab")
  ||
  store.get(
    "jc:tab",
    "words"
  );

let ONLY_WEAK =
  store.get(
    "jc:weak",
    false
  );


/* =========================================================
   DOTS
   ========================================================= */

function dotsKey(type,no){

  return `jc:dots:${DATA.level}:${type}:${no}`;

}


function dotsHTML(type,no){

  const v =
    store.get(
      dotsKey(type,no),
      [0,0,0]
    );

  return `

    <div
      class="dots"
      data-type="${type}"
      data-no="${no}"
    >

      ${
        v.map(
          (on,i) =>
            `<div
              class="dot${on ? " on" : ""}"
              data-i="${i}"
            ></div>`
        ).join("")
      }

    </div>

  `;

}


/* =========================================================
   EXAMPLES
   ========================================================= */

/* compact 例 line (his preferred style): 「例： sentence」, tap shows English */
function exLine(e, target){
  const src = e.url ? ` <a class="exsrc" href="${esc(e.url)}" target="_blank" rel="noopener" onclick="event.stopPropagation()">${e.src && e.src.startsWith("Wikipedia") ? "Wikipedia" : esc(e.src || "source")}</a>` : "";
  return `<div class="ex exc"><span class="rei">例：</span>${hl(e.jp, target)}${e.en || src ? `<div class="tr">${e.en ? esc(e.en) : ""}${src}</div>` : ""}</div>`;
}

function exHTML(e,targets){


  const tr =
    e.en
      ? esc(e.en)
      : "-";


  const src =
    e.url
      ? ` · <a
            href="${esc(e.url)}"
            target="_blank"
            rel="noopener"
          >${esc(e.src||"source")}</a>`
      : "";


  return `

    <div class="ex">

      <span class="tip">
        EN
      </span>

      ${
        e.src &&
        e.src.startsWith("Wikipedia")
          ? "🌐 "
          : ""
      }

      ${hl(e.jp,targets)}

      <div class="tr">
        ${tr}${src}
      </div>

    </div>

  `;

}


function srcLine(label,url){

  return `

    <div class="src">

      ${esc(label)}

      ${
        url
          ? ` · <a
                href="${esc(url)}"
                target="_blank"
                rel="noopener"
              >link</a>`
          : ""
      }

    </div>

  `;

}


/* =========================================================
   WORD CARD
   ========================================================= */

/* 大辞泉 entries can be very long (手 = 1,468 chars). Show meaning 1 only (cut before 「２」), capped ~120 chars
   at a sentence end; the full verbatim entry stays one tap away. Nothing is rewritten. */
function defHTML(text, target){
  return `<div class="jp">${hl(text, target)}</div>`;
}

function wordCard(c){

  const back = [

    c.img
      ? `<img
          class="img"
          loading="lazy"
          src="${esc(c.img)}"
          alt=""
        >`
      : "",


    `<h4>English</h4>

     <div class="en">
       ${esc(c.en)}
     </div>`,


    c.jp
      ? `<h4>大辞泉</h4>

         ${defHTML(c.jp, c.word)}

         ${srcLine(
           "デジタル大辞泉 (Kotobank)",
           c.jpUrl
         )}`
      : "",


    (c.ex && c.ex.length) || c.use
      ? `<h4>例文</h4>
         ${[...(c.ex || []), ...(c.use ? [c.use] : [])].map(e => exLine(e, c.word)).join("")}`
      : ""

  ].join("");


  return card(
    "w",
    c.no,

    `<div class="rd">
       ${esc(c.reading)}
     </div>

     <div class="big">
       ${esc(c.word)}${sayIcon(c.word)}
     </div>`,

    back,

    c.level
  );

}


/* =========================================================
   KANJI CARD
   ========================================================= */

function kanjiCard(c){

  const words =
    c.words.length

      ? `<h4>言葉</h4>

         <ul class="w">

           ${
             c.words.map(
               w =>
                 `<li>

                    ${hl(
                      w.w,
                      c.kanji
                    )}

                    （${esc(w.r)}）
                    : ${esc(w.m)}

                    ${
                      w.ex
                        ? exLine({jp:w.ex, en:w.exEn, url:w.exUrl, src:w.exUrl ? "Tatoeba" : ""}, c.kanji).replace('class="ex exc"', 'class="ex exc exl"')
                        : ""
                    }

                  </li>`
             ).join("")
           }

         </ul>`

      : "";


  const back = [

    `<h4>読み</h4>

     <div>

       音
       <b>
         ${esc(
           c.on.join("・") || "-"
         )}
       </b>

      　
       訓
       <b>
         ${esc(
           c.kun.join("・") || "-"
         )}
       </b>

      　
       <span class="src">
         ${c.strokes}画
       </span>

     </div>`,


    `<h4>意味</h4>

     <div class="en">
       ${esc(c.en)}
     </div>`,


    c.jp
      ? `${defHTML(c.jp, c.kanji)}

         ${srcLine(
           "デジタル大辞泉［漢字項目］",
           c.jpUrl
         )}`
      : "",


    words,


    c.use
      ? `<h4>例文</h4>
         ${exLine(
           c.use,
           c.kanji
         )}`
      : ""

  ].join("");


  const rd =
    [
      c.on.join("・"),
      c.kun.join("・")
    ]
    .filter(Boolean)
    .join(" · ");


  return card(
    "k",
    c.no,

    `<div class="rd">
       ${esc(rd)}
     </div>

     <div class="big">
       ${esc(c.kanji)}
     </div>`,

    back,

    c.level
  );

}


/* =========================================================
   GRAMMAR CARD
   ========================================================= */

function grammarCard(c){

  const back = [

    c.en
      ? `<h4>English</h4>

         <div class="en">
           ${esc(c.en)}
         </div>`
      : "",


    c.imi.length
      ? `<h4>意味</h4>

         ${
           c.imi
             .map(
               x =>
                 `<div>${esc(x)}</div>`
             )
             .join("")
         }`
      : "",


    c.setsuzoku.length
      ? `<h4>接続</h4>

         <code>
           ${esc(
             c.setsuzoku.join(" / ")
           )}
         </code>`
      : "",


    c.rei.length
      ? `<h4>
           例文
           <span class="src">
             (tap for English)
           </span>
         </h4>

         ${
           c.rei
             .map(
               e =>
                 exLine(
                   e,
                   c.variants
                 )
             )
             .join("")
         }`
      : "",


    srcLine(
      "日本語教師NET",
      c.url
    )

  ].join("");


  return card(
    "g",
    c.no,

    `<div class="rd"></div>

     <div class="big">
       ${esc(c.pattern)}
     </div>`,

    back,

    c.level
  );

}


/* =========================================================
   CARD
   ========================================================= */

function card(
  t,
  no,
  head,
  back,
  level
){

  const type = {
    w:"words",
    k:"kanji",
    g:"grammar"
  }[t];


  return `

    <div
      class="card ${t}"
      data-type="${type}"
      data-no="${no}"
    >

      <div class="front">

        <div class="head">

          ${
            head.replace(
              '<div class="rd">',
              `<div class="rd">

                 <span class="num">
                   #${t.toUpperCase()}${no}
                 </span>　

               `
            )
          }

        </div>


        ${dotsOrButtons(type,no)}

      </div>


      <div class="back">
        ${back}
      </div>

    </div>

  `;

}


/* =========================================================
   PLAYGROUND DATA
   ========================================================= */

const PG = {
  pool:{},
  now:() => Date.now()
};


/* v156: review rules, undo and sessions live in src/practice/ (srs.ts, sessions.ts) */
const pgCanUndo = () => SRS.canUndo(pgState().sid);
function pgUndo(){ if(SRS.undo(pgState().sid)){ NAV_SAME = true; renderPG(); } }
function pgRate(lvl, type, no, m){   // Again / Hard / Easy on the running card
  SRS.snapshot(lvl, type, no, pgState().sid);   // for undo
  SRS.rate(lvl, type, no, m);
  if(m === SRS.EASY) Sess.markDone([lvl, type, no]);
  renderPG();
}
const pgKey = K.due, profileKey = K.profile;
const pgProfile = SRS.profile;


const PG_LOADING = {};
function pgPool(level){   // one load per level, shared by everyone asking while it runs
  if(PG.pool[level]) return Promise.resolve(PG.pool[level]);
  return PG_LOADING[level] || (PG_LOADING[level] = pgPoolLoad(level).finally(() => delete PG_LOADING[level]));
}
async function pgPoolLoad(level){

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
  const files = INDEX.filter(i => i.level === level);
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
let SECTIONS = null;
async function loadSections(){
  if(!SECTIONS){ try{ SECTIONS = await (await fetch("data/sections.json", {cache:"no-cache"})).json(); }catch(e){ SECTIONS = {N1:[], N2:[]}; } }
  return SECTIONS;
}
/* Pre-learn readings: a real text + the list of our cards it uses */
const READINGS = {};
async function loadReading(id){
  if(!READINGS[id]) READINGS[id] = await (await fetch(`data/readings/${id}.json`, {cache:"no-cache"})).json();
  return READINGS[id];
}
const secSeen = (lvl, s) => s.words.filter(no => pgProfile(lvl, "words", no).reviews).length;

const pgState = Sess.state;


/* =========================================================
   NEW PLAYGROUND SESSION
   ========================================================= */

/* Saved sessions (this device): every started Practice is kept until all its cards are done, so it can be continued */
const sessList = Sess.list, sessTodo = Sess.todo, sessOpen = Sess.open, sessSave = Sess.save, sessDrop = Sess.drop;
function sessResume(id){
  const se = sessList().find(x => x.id === id); if(!se) return;
  const st = pgState(); Object.assign(st, {level: se.level, from: se.from, section: se.section, reading: se.reading, ids: sessTodo(se), sid: se.id});
  store.set("jc:pg", st); se.at = Date.now(); sessSave(se);
  PG_RUNNING = true; renderPG(); document.body.classList.remove("clean");
}
let PG_NEW = false, SESS_EDIT = null, SESS_UNDO = null, SESS_ALL = false;   // SESS_ALL: Continue list expanded   // on the New session page? which row is being renamed? last deleted (for Undo)
const sessName = Sess.name;
const sessDay = () => { const d = new Date(); return `${d.getMonth() + 1}/${d.getDate()}`; };
function sessAutoName(title){ const st = pgState();
  return `${title || (st.from === "section" ? (isJa() ? "分野" : "Section") : (isJa() ? "全カード" : "All cards"))} ${sessDay()}`; }
const pgDueIds = () => SRS.dueIds(50);
async function pgQuickIds(n){ const pool = await pgPool("ALL"), ids = [];
  for(const c of pool.words){ if(!pgProfile(c.level, "words", c.no).reviews){ ids.push([c.level, "words", c.no]); if(ids.length >= n) break; } }
  return ids; }
function pgStartWith(ids, label){
  if(!ids.length) return;
  const st = pgState(); Object.assign(st, {level: "ALL", from: "all", ids, sid: "s" + Date.now()});
  sessSave({id: st.sid, name: "", start: Date.now(), at: Date.now(), label, level: "ALL", from: "all", ids});
  store.set("jc:pg", st); PG_NEW = false; SESS_EDIT = null; PG_RUNNING = true; renderPG(); document.body.classList.remove("clean");
}
const sessCounts = Sess.counts;
function pgSheetClose(instant){
  const sh = $("#pgSheet"), sc = $("#pgScrim"); if(!sh) return;
  document.body.classList.remove("sheet-open");
  const gone = () => { sh.remove(); sc && sc.remove(); };
  if(instant || calmMotion()) gone(); else setTimeout(gone, 320);
}
function pgDockLift(){   // move the bottom dock out of #list (page transitions transform #list, which drags fixed children along)
  document.querySelectorAll("body > .pg-dock").forEach(d => d.remove());
  const d = $("#list .pg-dock"); if(d) document.body.appendChild(d);
}
function pgDockDrop(){ document.querySelectorAll("body > .pg-dock").forEach(d => d.remove()); if(PG_RUNNING || CURRENT !== "playground") pgSheetClose(true); }
function sessWhen(t){ const d = new Date(t); return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`; }
async function pgNew(name = ""){   // level and card counts are saved as they are tapped (jc:pg)

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
  st.sid = "s" + Date.now(); PG_NEW = false; SESS_EDIT = null;
  const nm = name;
  if(st.ids.length) sessSave({id: st.sid, name: nm, start: Date.now(), at: Date.now(), label: sessAutoName(label === (isJa() ? "全カード" : "All cards") ? null : label), level: st.level, from: st.from, section: st.section, reading: st.reading, ids: st.ids});
  store.set("jc:pg", st);
  PG_RUNNING = true;

  renderPG();

}


/* =========================================================
   RENDER PLAYGROUND
   ========================================================= */

async function renderPG(){
  pgDockDrop();

  document.body.classList.toggle(
    "playing",
    PLAY && PG_RUNNING
  );


  const st =
    pgState();


  const pool =
    await pgPool(
      st.level
    );


  const now =
    PG.now();


  if(!PG_RUNNING){

    DATA = {
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
    const redraw = () => { NAV_SAME = true; renderPG(); };
    const saveSt = f => { const cur = pgState(); f(cur); store.set("jc:pg", cur); redraw(); };
    $("#count").textContent = `Practice · ${st.level}`;
    $("#pageTitle").textContent = "Practice";
    showScreen("pg-home", createElement(PracticeHome, {   // v157: Practice home is a React screen (src/screens/PracticeHome.tsx)
      ja: isJa(), tr, calm: calmMotion(), sheetOpen: PG_NEW, origin: PG_RETURN ? PG_RETURN.label : null,
      sheet: {level: st.level, from: st.from || "all", hasReading: !!st.reading, n: {...st.n},
        newLeft: PG_NEW ? {words: newLeft("words"), kanji: newLeft("kanji"), grammar: newLeft("grammar")} : {words: 0, kanji: 0, grammar: 0},
        sections, section: st.section,
        reading: inRead ? {title: rdInfo.title, words: rdInfo.words.length, kanji: rdInfo.kanji.length, grammar: rdInfo.grammar.length} : null,
        placeholder: sessAutoName(inRead ? rdInfo.title : null)},
      onOrigin: () => PG_RETURN && PG_RETURN.go(),
      onResume: id => sessResume(id),
      onQuick: async () => pgStartWith(await pgQuickIds(10), `${isJa() ? "クイック10" : "Quick 10"} ${sessDay()}`),
      onSheet: open => { PG_NEW = open; SESS_EDIT = null; if(open || !PG_RETURN) redraw(); },   // closing from Cards/a section leaves Practice instead
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


  DATA = {
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
    onExit: () => { PG_RUNNING = false; renderPG(); },
  }));


  document.body.classList.remove("clean");

}


function pgExit(){

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

function prefetchPools(){   // warm the Complete list / Playground pool while the user looks at Home
  const lv = store.get("jc:clevel", "N1") === "N2" ? "N2" : "N1";
  const go = () => pgPool(lv);
  "requestIdleCallback" in window ? requestIdleCallback(go, {timeout: 3000}) : setTimeout(go, 800);
}
/* ---------- Settings: appearance, voice, list options (saved on this device) ---------- */
const JA = {"Home":"ホーム","Back":"戻る","Study":"学習","Side projects":"寄り道","Playground":"練習","Practice":"練習","Sound":"音声","Listen":"聞く","Pause":"一時停止","Complete list":"一覧","Reading":"読解",
  "Settings":"設定","Novels":"名作","Movies":"映画","Library":"ライブラリ","Listening":"聴解","Vocab & Grammar":"言語知識","言語知識 tests":"言語知識テスト","Tests with audio":"音声つきテスト","Sessions":"セッション","Pictures":"図鑑","Illustrations":"イラスト","Sections":"分野","Use it":"使う","Scenes":"情景","Photos":"写真","Explorer":"探検","Business":"ビジネス",
  "Appearance":"表示","Auto":"自動","Light":"ライト","Dark":"ダーク","Voice":"音声","Japanese voice":"端末の声","Slow":"ゆっくり","Normal":"ふつう",
  "Familiarity bars":"習熟度バー","Practice answer":"練習の答え","Continue":"続きから","New session":"新しいセッション","Start":"始める","Review due":"復習","Quick 10":"クイック10","Done":"完了","Cancel":"キャンセル","Undo":"元に戻す","Name":"名前","Edit":"編集","Save":"保存","Delete session":"セッションを削除","Delete":"削除","Keep":"残す","Short":"簡潔","Full":"詳細","Language":"言語","With English":"英語あり","Japanese only":"日本語のみ","Recorded voice":"収録音声","Cards":"カード","Device voice":"端末の声","Your phone's own voice":"スマホ本体の声",
  "Level":"レベル","From":"範囲","All cards":"すべて","Section":"分野","Cards per session":"1回の枚数","Words":"単語","Kanji":"漢字","Grammar":"文法","ALL":"全部",
  "Again":"もう一度","Hard":"難しい","Easy":"簡単","3 min":"3分","10 min":"10分","1 day":"1日","Cards":"カード","Start":"始める","Photo credits":"写真の出典",
  "Study this section":"この分野を練習","Study these":"練習する","Read 本文":"本文を読む","Session complete":"今日はここまで","All cards are resting.":"すべてのカードが休憩中です。",
  "Play 現像":"再生 現像","Recorded voice: Microsoft Nanami. Words without a recording use the device voice above.":"収録音声：Microsoft Nanami。収録のない語は端末の声で読みます。","Show all":"すべて表示","Learn, then read":"覚えてから読む","Start with new cards":"新しいカードから始める"};
const JA_RX = [
  [/^(\d+) cards$/, "$1枚"], [/^(\d+) books$/, "$1冊"], [/^(\d+) words$/, "$1語"], [/^(\d+) new left$/, "未学習 $1"],
  [/^Start · (\d+) cards$/, "始める・$1枚"], [/^(\d+) cards? ready to review$/, "復習 $1枚"], [/^Next review in (\d+) min$/, "次の復習まで $1分"],
  [/^Next review in (\d+) h$/, "次の復習まで $1時間"], [/^Next review in (\d+) d$/, "次の復習まで $1日"], [/^to go$/, "枚 残り"], [/^(\d+) coming back$/, "あとで $1枚"],
  [/^Female · (.+)$/, "女性・$1"], [/^Male · (.+)$/, "男性・$1"],
  [/^(\d+) words · (\d+) kanji · (\d+) grammar$/, "単語 $1・漢字 $2・文法 $3"], [/^[A-Za-z &]+ · (\d+)$/, "$1語"], [/^‹ (.+)$/, m => "‹ " + (JA[m.slice(2)] || m.slice(2))]];
const isJa = () => store.get("jc:lang", "en") === "ja";
function jaText(t){ const k = t.trim(); if(!k) return null;
  if(JA[k]) return t.replace(k, JA[k]);
  for(const [rx, to] of JA_RX) if(rx.test(k)) return t.replace(k, typeof to === "function" ? to(k) : k.replace(rx, to));
  return null; }
function jaWalk(root){
  if(!isJa() || !root) return;
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let n;
  while((n = w.nextNode())){ if(n.parentNode && n.parentNode.closest("select,option,textarea,script,style")) continue;   // never touch form values
    const r = jaText(n.nodeValue); if(r !== null && r !== n.nodeValue) n.nodeValue = r; }
}
function applyLang(){
  const ja = isJa(); document.body.classList.toggle("ja", ja); document.documentElement.lang = ja ? "ja" : "en";
  jaWalk(document.querySelector("header")); jaWalk($("#list"));
}
/* one optional action on the right of the header, owned by the page that set it */
function setHeaderAction(label, fn){ const b = $("#hdrAct"); b.textContent = label; b.onclick = fn; b.hidden = false; b._owner = $("#list").firstElementChild; jaWalk(b); }
function syncHeaderAction(){ const b = $("#hdrAct"); if(b && !b.hidden && !(b._owner && document.body.contains(b._owner))) b.hidden = true; }
function applyTheme(){
  const t = store.get("jc:theme", "auto");
  if(t === "auto") document.documentElement.removeAttribute("data-theme"); else document.documentElement.setAttribute("data-theme", t);
}
function jaVoices(){ try{ return speechSynthesis.getVoices().filter(v => /^ja/i.test(v.lang)); }catch(e){ return []; } }
function bestVoice(){   // the saved choice, else the most natural-sounding Japanese voice on this device
  const vs = jaVoices(), saved = store.get("jc:voice", "");
  return vs.find(v => v.name === saved) ||
    vs.find(v => /natural|neural|online|enhanced|premium|siri/i.test(v.name)) ||
    vs.find(v => /google/i.test(v.name)) || vs.find(v => /kyoko|o-ren|nanami|haruka/i.test(v.name)) || vs[0] || null;
}
let KEEP_SETTINGS = false;   // true while the page under the Settings sheet is redrawn (language switch)
let SETTINGS_CLOSING = false;
/* v160: Settings is React (src/screens/Settings.tsx): a sheet over the page (gear) or its own page */
function settingsProps(){
  return {ja: isJa(), tr, version: APP_VERSION, theme: store.get("jc:theme", "auto"), lang: store.get("jc:lang", "en"),
    answer: store.get("jc:answer", "full"), sound: soundOn(), fam: store.get("jc:showfam", false),
    onTheme: v => { store.set("jc:theme", v); applyTheme(); drawSettings(); },
    onLang: v => { store.set("jc:lang", v);
      if(hasOverlay("settings")){ NAV_SAME = true; KEEP_SETTINGS = true; pick(CURRENT); KEEP_SETTINGS = false; applyLang(); drawSettings(); return; }
      if(v === "en"){ pick("settings"); applyLang(); } else { applyLang(); drawSettings(); } },
    onAnswer: v => { store.set("jc:answer", v); drawSettings(); },
    onSound: on => store.set("jc:sound", on),
    onFam: on => { store.set("jc:showfam", on); document.body.classList.toggle("showfam", on); }};
}
function drawSettings(){
  if(hasOverlay("settings")) renderOverlay("settings", createElement(SettingsSheet, {...settingsProps(), calm: calmMotion(), closing: SETTINGS_CLOSING, onClose: () => closeSettingsSheet()}));
  else if(CURRENT === "settings") showScreen("settings", createElement(SettingsPanel, settingsProps()));
}
function openSettingsSheet(){   // Settings = a card sliding in from the right, Home nudged aside behind it
  if(hasOverlay("settings")) return;
  SETTINGS_CLOSING = false;
  renderOverlay("settings", createElement(SettingsSheet, {...settingsProps(), calm: calmMotion(), closing: false, onClose: () => closeSettingsSheet()}));
}
function closeSettingsSheet(instant){
  if(!hasOverlay("settings")) return;
  if(instant || calmMotion()){ document.body.classList.remove("sheet-open"); removeOverlay("settings"); return; }
  SETTINGS_CLOSING = true; drawSettings();
  setTimeout(() => { SETTINGS_CLOSING = false; removeOverlay("settings"); }, 320);
}
function renderSettings(){
  document.body.classList.remove("playing");
  showScreen("settings", createElement(SettingsPanel, settingsProps()));
}
function dueLine(){   // real numbers from this phone's review marks (jc:due:*)
  const {due, later} = SRS.dueCounts();
  return due ? `${due} card${due === 1 ? "" : "s"} ready to review` : later ? `Next review ${nextDueIn()}` : "Start with new cards";
}
function nextDueIn(){
  const m = SRS.minutesToNext();
  return !isFinite(m) ? "soon" : m < 60 ? `in ${m} min` : m < 1440 ? `in ${Math.round(m / 60)} h` : `in ${Math.round(m / 1440)} d`;
}
function renderHome(){
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

async function renderComplete(){

  document.body.classList.remove(
    "playing"
  );


  const LVL = store.get("jc:clevel", "N1") === "N2" ? "N2" : "N1";   // one level at a time
  if(!PG.pool[LVL]) $("#list").innerHTML = `<p class="loading-note">Loading ${LVL} cards…</p>`;   // never look frozen
  const pool =
    await pgPool(LVL);
  if(CURRENT !== "complete") return;   // user left while it was loading


  showScreen("complete", createElement(CompleteList, {   // v161: React (src/screens/Lists.tsx); tabs are switched by the app-wide .tab handler
    tr, level: LVL, tab: TAB, pool, html: (t, c) => miniFor(t, c, c.level),
    onLevel: l => { store.set("jc:clevel", l); renderComplete(); }}));
  $("#count").textContent = "Complete list";
}


/* =========================================================
   DOTS / PLAYGROUND
   ========================================================= */

/* Open/close with motion: the word glides to its new place (FLIP),
   the back drops down like a curtain. */
/* Desktop keyboard in Playground: Space/Enter = flip, 1/2/3 = Again/Hard/Easy */
addEventListener("keydown", e => { const sp = e.target.closest && e.target.closest(".say-i");   // speaker icons work from the keyboard
  if(sp && (e.key === "Enter" || e.key === " ")){ e.preventDefault(); speak(sp.dataset.say); return; } });
addEventListener("keydown", e => {
  if(!document.body.classList.contains("playing") || /INPUT|TEXTAREA|SELECT/.test((e.target.tagName || "")) || e.target.isContentEditable) return;
  if((e.key === "z" || e.key === "Z" || e.key === "Backspace") && !e.altKey && !e.shiftKey && document.querySelector(".play-screen")){ e.preventDefault(); pgUndo(); return; }
  if(e.metaKey || e.ctrlKey || e.altKey) return;
  const card = document.querySelector(".play-stage .card");
  if((e.key === " " || e.key === "Enter") && card){
    e.preventDefault();
    const hit = card.classList.contains("open") ? card.querySelector(".front") : card;
    (hit || card).dispatchEvent(new MouseEvent("click", {bubbles:true}));
    return;
  }
  const m = {"1":"3", "2":"10", "3":"1440"}[e.key];
  const btn = m && document.querySelector(`.play-ratings button[data-m="${m}"]`);
  if(btn){ e.preventDefault(); btn.click(); }
});

const calmMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
function unfoldBack(back){   // paper unfold: the answer hangs from the fold under the headword and swings down flat
  if(!back || calmMotion()) return;
  back.animate([{transform:"perspective(900px) rotateX(-88deg)", opacity:.35},
                {transform:"perspective(900px) rotateX(8deg)", opacity:1, offset:.72},
                {transform:"perspective(900px) rotateX(0deg)", opacity:1}],
               {duration:520, delay:60, easing:"cubic-bezier(.22,.9,.3,1)", fill:"backwards"});
  back.animate([{boxShadow:"inset 0 60px 40px -30px rgba(0,0,0,.18)"},{boxShadow:"inset 0 0 0 0 rgba(0,0,0,0)"}],
               {duration:560, delay:60, easing:"ease-out", fill:"backwards"});
}
function foldBack(back, done){   // fold the paper back up under the headword, then continue
  if(!back || calmMotion()){ done(); return; }
  back.animate([{transform:"perspective(900px) rotateX(0deg)", opacity:1},{transform:"perspective(900px) rotateX(-88deg)", opacity:.2}],
               {duration:240, easing:"cubic-bezier(.5,0,.75,0)"}).onfinish = done;
}
function flipCard(card, open){
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const back = card.querySelector(".back");
  const move = () => {
    const b = card.getBoundingClientRect();
    card.classList.toggle("open", open);
    if(reduce) return;
    const a = card.getBoundingClientRect();
    card.animate([{transform:`translateY(${b.top - a.top}px)`},{transform:"none"}],
                 {duration:340, easing:"cubic-bezier(.2,.8,.2,1)"});
    if(open) unfoldBack(back);
  };
  if(!open && back && !reduce){
    foldBack(back, move);
  } else move();
}

let CARD_LVL = null;

/* ---------- Sound: the phone's Japanese voice (offline, no files) ---------- */
let AUDIO_MAP = null, AUDIO_NOW = null, VOICES = [];

const SILENT = "data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//OEwAAAAAAAAAAAAEluZm8AAAAPAAAACQAABCAARUVFRUVFRUVFRUVdXV1dXV1dXV1dXXR0dHR0dHR0dHR0i4uLi4uLi4uLi4uioqKioqKioqKiorq6urq6urq6urq60dHR0dHR0dHR0dHo6Ojo6Ojo6Ojo6P//////////////AAAAAExhdmM1OC4xMwAAAAAAAAAAAAAAACQD8AAAAAAAAAQgDea3ZwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//NExAAAAANIAAAAAExBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMu//NExFMAAANIAAAAADEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMu//NExKYAAANIAAAAADEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMu//NExKwAAANIAAAAADEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMu//NExKwAAANIAAAAADEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMu//NExKwAAANIAAAAADEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMu//NExKwAAANIAAAAADEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//NExKwAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//NExKwAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV";
try{ if(navigator.audioSession) navigator.audioSession.type = "playback"; }catch(e){}   // iPhone: play even with the silent switch on
// iPhone: an audio element may only play after a tap has "unlocked" it once with a real sound
function unlockAudio(){ removeEventListener("touchend", unlockAudio); removeEventListener("click", unlockAudio);
  if(PLAYER.src) return; PLAYER.src = SILENT; PLAYER.play().then(() => PLAYER.pause()).catch(() => {}); }
addEventListener("touchend", unlockAudio, {passive: true}); addEventListener("click", unlockAudio);
const soundOn = () => store.get("jc:sound", true);
let SAY_ON = null;   // the speaker icon currently playing (shown in the accent color)
const sayOff = () => { if(SAY_ON){ SAY_ON.classList.remove("playing"); SAY_ON = null; } };
PLAYER.addEventListener("ended", sayOff); PLAYER.addEventListener("pause", sayOff);
function soundNote(msg){   // only when every way of playing failed, so the cause can be reported
  let n = $("#soundNote"); if(!n){ n = document.createElement("div"); n.id = "soundNote"; n.className = "sound-note"; document.body.appendChild(n); }
  n.textContent = msg; n.hidden = false; clearTimeout(n._t); n._t = setTimeout(() => n.hidden = true, 6000);
}
fetch("data/audio/map.json", {cache:"no-cache"}).then(r => r.ok ? r.json() : {}).then(m => AUDIO_MAP = m).catch(() => AUDIO_MAP = {});
const speaker = () => "nanami";   // one voice for everything (keeps the app small as content grows)
function speak(text){
  try{ if(AUDIO_NOW) AUDIO_NOW.pause(); }catch(e){}
  const sp = speaker(), key = sp !== "device" && AUDIO_MAP && AUDIO_MAP[text];
  if(key){
    try{ if(AUDIO_NOW) AUDIO_NOW.pause(); speechSynthesis.cancel(); }catch(e){}
    const url = `data/audio/${sp}/${key}.mp3`, a = PLAYER; AUDIO_NOW = a;
    try{ if(navigator.audioSession) navigator.audioSession.type = "playback"; }catch(e){}
    a.src = url;
    a.play().catch(err1 =>   // route 2: load the whole file into memory and play it from there
      fetch(url).then(r => r.blob()).then(b => { a.src = URL.createObjectURL(b); return a.play(); })
        .catch(err2 => { sayOff(); speakDevice(text); soundNote(`No sound (${(err2 || err1).name || "error"}). Tell Claude this message.`); }));
    return;
  }
  speakDevice(text);
}
function speakDevice(text){
  try{
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "ja-JP"; u.rate = store.get("jc:rate", 0.9);
    const v = bestVoice();
    if(v) u.voice = v;
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  }catch(e){}
}
const SPK_OFF = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16.5 9.5l5 5M21.5 9.5l-5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
const SPK = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 9.5a3.5 3.5 0 0 1 0 5M18.5 7a7 7 0 0 1 0 10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
const sayIcon = text => `<span class="say say-i" role="button" tabindex="0" data-say="${esc(text)}" aria-label="Play ${esc(text)}">${SPK}</span>`;
const sayBtn = text => `<button class="say" type="button" data-say="${esc(text)}" aria-label="Play sound">🔊</button>`;

/* ---------- Novels ---------- */
let NOVELS = null;
async function renderNovels(){
  document.body.classList.remove("playing");
  try{ NOVELS = NOVELS || await (await fetch("data/novels/index.json", {cache:"no-cache"})).json(); }
  catch(e){ $("#list").innerHTML = `<div class="empty">Could not load novels.</div>`; return; }
  $("#list").innerHTML = `<section class="reading">

    <div class="novel-grid">${NOVELS.map(x => `<button class="novel-tile" data-novel="${x.id}">
      <img src="data/novels/${x.id}.svg" alt="" loading="lazy"><b>${esc(x.title)}</b><span>${esc(x.titleEn)}</span></button>`).join("")}</div></section>`;
}
async function renderNovel(id){
  let st; try{ st = await (await fetch(`data/novels/${id}.json`, {cache:"no-cache"})).json(); }catch(e){ return; }
  if(st.scenes && st.scenes.length) return renderTheatre(st);
  $("#pageTitle").textContent = st.title;
  $("#list").innerHTML = `<section class="reading story">
    <div class="story-top"><button class="nav-btn" id="novelBack" data-back="Movies">Back</button>
      <button class="listen-btn" id="novelListen" type="button" aria-pressed="false"><span class="lb-ico">${PLAY_ICO}</span><span class="lb-t">Listen</span></button></div>
    <img class="novel-art" src="data/novels/${st.id}.svg" alt="">
    <h2 class="book-title">${esc(st.title)}<small>${esc(st.titleEn)} · ${esc(st.author)}</small></h2>
    <div class="story-meta">${esc(st.source)}</div>
    ${st.sentences.map(x => x.h ? `<h3 class="novel-ch">${esc(x.h)}<small>${esc(x.en || "")}</small></h3>`
      : `<div class="ex story-line"><span class="jpline">${esc(x.jp)}</span><div class="tr">${esc(x.en)}</div></div>`).join("")}
  </section>`;
  $("#novelBack").onclick = () => { stopStory(); $("#pageTitle").textContent = "Movies"; renderNovels(); };
  // listening: tap a sentence to hear it; Listen plays the story sentence by sentence (highlighted, kept in view)
  const lines = [...document.querySelectorAll(".story .story-line")], btn = $("#novelListen");
  const setBtn = on => { btn.setAttribute("aria-pressed", on); btn.querySelector(".lb-ico").innerHTML = on ? PAUSE_ICO : PLAY_ICO;
    btn.querySelector(".lb-t").textContent = on ? (isJa() ? "一時停止" : "Pause") : (isJa() ? "聞く" : "Listen"); };
  STORY.play = (i, cont) => {
    const line = lines[i]; if(!line) { stopStory(); return; }
    const text = line.querySelector(".jpline").textContent, key = AUDIO_MAP && AUDIO_MAP[text];
    lines.forEach(l => l.classList.toggle("speaking", l === line)); STORY.i = i; STORY.cont = cont; setBtn(cont);
    if(cont) line.scrollIntoView({block: "center", behavior: calmMotion() ? "auto" : "smooth"});
    const next = () => { if(STORY.cont && STORY.i === i) STORY.play(i + 1, true); else line.classList.remove("speaking"); };
    if(key){ PLAYER.onended = next; PLAYER.src = `data/audio/nanami/${key}.mp3`; PLAYER.play().catch(() => { speakDevice(text); }); }
    else { try{ const u = new SpeechSynthesisUtterance(text); u.lang = "ja-JP"; u.onend = next; speechSynthesis.cancel(); speechSynthesis.speak(u); }catch(e){} }
  };
  STORY.stopUI = () => { setBtn(false); lines.forEach(l => l.classList.remove("speaking")); };
  lines.forEach((l, i) => l.addEventListener("click", () => { if(!soundOn()) return; STORY.play(i, STORY.cont); }));
  btn.onclick = () => { if(STORY.cont){ stopStory(); return; } STORY.play(Math.max(0, STORY.i || 0), true); };
  STORY.i = 0; STORY.cont = false;
}
const STORY = {i: 0, cont: false, play: null, stopUI: null};
/* ---------- Theatre: a novel as a film. One picture per scene, the spoken line as a subtitle ---------- */
function renderTheatre(st){
  const L = st.sentences, sceneAt = i => { let k = 0; st.scenes.forEach((sc, j) => { if(sc.from <= i) k = j; }); return k; };
  document.body.classList.add("cinema"); NAV_SAME = true;
  const cc = () => store.get("jc:cc", true), enOn = () => store.get("jc:thEn", true);
  $("#list").innerHTML = `<div class="th${cc() ? "" : " no-cc"}${enOn() ? "" : " no-en"}" role="region" aria-label="${esc(st.title)}">
    <div class="th-top">
      <button class="th-exit" type="button">${isJa() ? "‹ 終了" : "‹ Exit"}</button>
      <div class="th-tg"><button class="th-cc" type="button" aria-pressed="${cc()}" aria-label="Subtitles">CC</button><button class="th-entg" type="button" aria-pressed="${enOn()}" aria-label="English line">EN</button></div>
    </div>
    <div class="th-stage"><div class="th-frame">
      <img class="th-img" alt=""><img class="th-img" alt="">
      <div class="th-card" hidden><b></b><small></small></div>
      <button class="th-big" type="button" aria-label="Play">${PLAY_ICO}</button>
    </div>
    <div class="th-sub" aria-live="polite"><div class="th-tip" hidden></div><p class="th-jp"></p><p class="th-en"></p></div></div>
    <div class="th-hud"><div class="th-seek"><input class="th-range" type="range" min="0" max="${L.length - 1}" step="1" value="0" aria-label="Line"><div class="th-bar" aria-hidden="true"><i></i></div></div>
    <div class="th-ctl">
      <div class="th-mid">
        <button class="th-btn th-play" type="button" aria-label="Play">${PLAY_ICO}</button>
        <button class="th-btn th-prev" type="button" aria-label="Previous line"><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M6 5h2v14H6zM20 5v14L9 12z" fill="currentColor"/></svg></button>
        <button class="th-btn th-next" type="button" aria-label="Next line"><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M16 5h2v14h-2zM4 5v14l11-7z" fill="currentColor"/></svg></button>
      </div>
      <span class="th-count"></span>
    </div></div></div>`;
  const subHTML = x => { if(!x.tk) return esc(x.jp); let h = "", at = 0;
    for(const [a, b, g, r, c, base] of x.tk){ if(a < at) continue; h += esc(x.jp.slice(at, a)) + `<span class="th-tk" data-g="${esc(g)}" data-r="${esc(r)}" data-b="${esc(base || "")}">${esc(x.jp.slice(a, b))}</span>`; at = b; }
    return h + esc(x.jp.slice(at)); };
  const imgs = [...document.querySelectorAll(".th-img")], card = $(".th-card"), big = $(".th-big"), playB = $(".th-play");
  let front = 0, shown = -1, timer = 0;
  const showScene = (k, instant) => {
    if(k === shown) return; shown = k;
    const nxt = imgs[1 - front]; nxt.src = `data/novels/${st.scenes[k].img}`;
    const swap = () => { imgs[front].classList.remove("on"); nxt.classList.remove("on"); void nxt.offsetWidth; nxt.classList.add("on"); front = 1 - front; };
    if(instant || nxt.complete) swap(); else nxt.onload = swap;
  };
  const setLine = i => {
    const x = L[i]; STORY.i = i; showScene(sceneAt(i), i === 0);
    card.hidden = !x.h; if(x.h){ card.querySelector("b").textContent = x.h; card.querySelector("small").textContent = x.en || ""; }
    $(".th-jp").innerHTML = x.h ? "" : subHTML(x); $(".th-en").textContent = x.h ? "" : (x.en || ""); $(".th-tip").hidden = true;
    $(".th-bar i").style.width = `${(i + 1) / L.length * 100}%`; $(".th-count").textContent = `${i + 1} / ${L.length}`; $(".th-range").value = i;
  };
  const setPlaying = on => { STORY.cont = on; big.hidden = on; playB.innerHTML = on ? PAUSE_ICO : PLAY_ICO; playB.setAttribute("aria-label", on ? "Pause" : "Play");
    document.querySelector(".th").classList.toggle("paused", !on); if(on){ const t = $(".th-tip"); if(t) t.hidden = true; } if(STORY.onPlaying) STORY.onPlaying(on); };
  STORY.play = (i, cont) => {
    clearTimeout(timer);
    if(i >= L.length){ stopStory(); setLine(L.length - 1); return; }
    setLine(i); setPlaying(cont); if(!cont) return;
    const text = L[i].h || L[i].jp, key = AUDIO_MAP && AUDIO_MAP[text];
    const next = () => { if(STORY.cont && STORY.i === i) timer = setTimeout(() => STORY.play(i + 1, true), L[i].h ? 900 : 350); };
    if(key){ PLAYER.onended = next; PLAYER.src = `data/audio/nanami/${key}.mp3`; PLAYER.play().catch(() => { timer = setTimeout(next, text.length * 160); }); }
    else timer = setTimeout(next, text.length * 160 + 800);
  };
  STORY.stopUI = () => { clearTimeout(timer); setPlaying(false); };
  const toggle = () => { if(STORY.cont){ stopStory(); return; } if(PLAYER.src && PLAYER.paused && PLAYER.currentTime > 0 && !PLAYER.ended && PLAYER.onended){ setPlaying(true); PLAYER.play().catch(() => {}); return; } STORY.play(STORY.i, true); };
  const go = d => { const i = Math.max(0, Math.min(L.length - 1, STORY.i + d)); try{ PLAYER.pause(); PLAYER.onended = null; }catch(e){} STORY.play(i, STORY.cont); };
  big.onclick = playB.onclick = toggle;
  $(".th-frame").addEventListener("click", e => { if(!e.target.closest(".th-big")) toggle(); });
  $(".th-prev").onclick = () => go(-1); $(".th-next").onclick = () => go(1);
  $(".th-sub").addEventListener("click", e => {
    const w = e.target.closest(".th-tk"), tip = $(".th-tip");
    document.querySelectorAll(".th-tk.on").forEach(x => x.classList.remove("on"));
    if(!w){ tip.hidden = true; return; }
    const wasOn = STORY.cont, line = STORY.i, thEl = $(".th"); if(wasOn){ thEl.classList.add("peek"); stopStory(); }
    w.classList.add("on");
    const short = (w.dataset.g || "").split(/[;；/]/)[0].replace(/\s*\(.*?\)\s*/g, " ").trim();
    tip.innerHTML = (w.dataset.r ? `<span class="tip-rd">${esc(w.dataset.r)}</span>` : "") + (short ? `<span class="tip-en">${esc(short)}</span>` : "");
    tip.hidden = false;
    if(soundOn()) speak(w.textContent);   // hear it as written in the line
    clearTimeout(tip._t);
    tip._t = setTimeout(() => { tip.hidden = true; w.classList.remove("on"); thEl.classList.remove("peek"); if(wasOn && STORY.i === line && !STORY.cont) STORY.play(line, true); }, 2000);
    const r = w.getBoundingClientRect(), br = $(".th-sub").getBoundingClientRect();
    tip.style.left = Math.max(0, Math.min(br.width - tip.offsetWidth, r.left - br.left + r.width / 2 - tip.offsetWidth / 2)) + "px";
    tip.style.top = (r.top - br.top - tip.offsetHeight - 8) + "px";
  });
  $(".th-cc").onclick = () => { const on = !cc(); store.set("jc:cc", on); $(".th-cc").setAttribute("aria-pressed", on); $(".th").classList.toggle("no-cc", !on); };
  $(".th-entg").onclick = () => { const on = !enOn(); store.set("jc:thEn", on); $(".th-entg").setAttribute("aria-pressed", on); $(".th").classList.toggle("no-en", !on); };
  const rg = $(".th-range");   // drag = preview picture + line, release = play from there
  rg.oninput = () => { clearTimeout(timer); try{ PLAYER.pause(); PLAYER.onended = null; }catch(e){} setLine(+rg.value); };
  rg.onchange = () => STORY.play(+rg.value, STORY.cont || th.dataset.was === "1");
  rg.onpointerdown = () => { th.dataset.was = STORY.cont ? "1" : "0"; };
  // 2. controls fade out while playing; any movement brings them back (first tap on a phone only reveals them)
  const th = $(".th"); let idleT = 0;
  const wake = () => { th.classList.remove("idle"); clearTimeout(idleT); idleT = setTimeout(() => { if(STORY.cont && document.body.classList.contains("cinema")) th.classList.add("idle"); }, 2600); };
  th.addEventListener("pointermove", e => { if(e.pointerType === "mouse") wake(); });
  th.addEventListener("pointerdown", e => { if(th.classList.contains("idle") && e.pointerType !== "mouse"){ e.preventDefault(); e.stopPropagation(); th.dataset.swallow = "1"; } wake(); }, true);
  th.addEventListener("click", e => { if(th.dataset.swallow === "1"){ th.dataset.swallow = ""; e.stopPropagation(); e.preventDefault(); } }, true);
  addEventListener("keydown", wake);
  let wasOn = false;
  STORY.onPlaying = on => { if(on === wasOn) return; wasOn = on; if(on) wake(); else { clearTimeout(idleT); th.classList.remove("idle"); } };
  $(".th-exit").onclick = () => { stopStory(); document.body.classList.remove("cinema"); $("#pageTitle").textContent = "Movies"; NAV_DIR = "back"; renderNovels(); };
  STORY.i = 0; STORY.cont = false; setLine(0); setPlaying(false); card.hidden = true;   // poster: picture + title only
  $(".th-jp").textContent = st.title; $(".th-en").textContent = `${st.titleEn} · ${st.author}`;
}
addEventListener("keydown", e => { if(!document.body.classList.contains("cinema") || e.target.closest("input,textarea")) return;
  if(e.key === " "){ e.preventDefault(); $(".th-play") && $(".th-play").click(); }
  else if(e.key === "ArrowRight") $(".th-next") && $(".th-next").click();
  else if(e.key === "ArrowLeft") $(".th-prev") && $(".th-prev").click();
  else if(e.key === "Escape") $(".th-exit") && $(".th-exit").click(); });
function stopStory(){ STORY.cont = false; try{ PLAYER.pause(); PLAYER.onended = null; speechSynthesis.cancel(); }catch(e){} if(STORY.stopUI) STORY.stopUI(); }



/* ---------- Scenes: learn words through pictures ---------- */
const loadScript = src => new Promise((ok, bad) => {
  if(document.querySelector(`script[data-src="${src}"]`)) return ok();
  const el = document.createElement("script"); el.src = src; el.dataset.src = src; el.onload = ok; el.onerror = bad;
  document.head.appendChild(el);
});
let SCENE_DIR = "scenes";   // Scenes = flat pictures; Explorer = zoomable places (data/explore)
async function renderScenes(){
  document.body.classList.remove("playing");
  let list; try{ list = await (await fetch(`data/${SCENE_DIR}/index.json`, {cache:"no-cache"})).json(); }
  catch(e){ $("#list").innerHTML = `<div class="empty">Could not load scenes.</div>`; return; }
  $("#pageTitle").textContent = SCENE_DIR === "photos" ? "Photos" : "Scenes";
  $("#list").innerHTML = `<section class="reading">

    <div class="story-list">${list.map(x => `<button class="home-card story-item" data-scene="${x.id}">
      <b>${esc(x.title)}</b><span>${esc(x.titleEn)} · ${x.count} words</span></button>`).join("")}</div></section>`;
}
async function renderScene(id, arrive){
  let sc, svg;
  try{
    sc = await (await fetch(`data/${SCENE_DIR}/${id}.json`, {cache:"no-cache"})).json();
    if(sc.photo){   // real photo + invisible tap boxes, drawn as an SVG so labels/Show all work the same
      const [W, H] = sc.size;
      svg = `<svg viewBox="0 0 ${W} ${H}" class="photo-scene" role="img" aria-label="${esc(sc.titleEn)}">
        <image href="data/${SCENE_DIR}/${sc.photo}" width="${W}" height="${H}"/>
        ${Object.entries(sc.items).filter(([k,v]) => v.box).map(([k,v]) => `<g class="spot" data-id="${k}"><rect class="hit" x="${v.box[0]}" y="${v.box[1]}" width="${v.box[2]}" height="${v.box[3]}" rx="${W/100}"/></g>`).join("")}</svg>`;
    }
    else svg = await (await fetch(`data/${SCENE_DIR}/${sc.svg}`, {cache:"no-cache"})).text();
  }catch(e){ return; }
  $("#pageTitle").textContent = sc.title;
  if(sc.parent){ try{ const par = await (await fetch(`data/${SCENE_DIR}/${sc.parent}.json`, {cache:"no-cache"})).json(); $("#pageTitle").textContent = `${par.title} › ${sc.title}`; }catch(e){} }
  const open = store.get("jc:scenewords", true);
  $("#list").innerHTML = `<section class="scene">
    <div class="story-top"><button class="nav-btn" id="sceneBack" data-back="${sc.parent ? "Zoom out" : SCENE_DIR === "explore" ? "Home" : SCENE_DIR === "photos" ? "Photos" : "Scenes"}">${sc.parent ? "Zoom out" : SCENE_DIR === "explore" ? "Home" : "Back"}</button><button class="nav-btn" id="showAll" aria-pressed="false">Show all</button></div>
    ${sc.three ? `<div class="scene-3d" id="scene3d"></div>` : `<div class="scene-zoom" id="sceneZoom"><div class="scene-canvas" id="sceneCanvas">${svg}</div></div>`}
    <div class="scene-info" id="sceneInfo"><div class="scene-hint">${SCENE_DIR === "explore" ? "Tap anything to learn its name. 🔍 = you can zoom in." : "Tap anything in the picture."}</div></div>
    <details class="scene-words"${open ? " open" : ""}><summary>Words in this scene · ${Object.keys(sc.items).length}</summary>
      <div class="scene-list">${Object.entries(sc.items).map(([k,v]) => `<button class="scene-row" data-spot="${k}">
        <b>${esc(v.jp)}</b><span class="rd">${esc(v.reading)}</span><span class="en">${esc(v.en)}</span></button>`).join("")}</div>
    </details>
    <div class="story-meta">${sc.sourceUrl ? `<a href="${sc.sourceUrl}" target="_blank" rel="noopener">${esc(sc.source)}</a>` : esc(sc.source)}</div>
  </section>`;
  const svgEl = document.querySelector("#sceneCanvas svg");
  let view3d = null;
  if(sc.three){
    try{
      await loadScript("vendor/three.min.js"); await loadScript("vendor/OrbitControls.js"); await loadScript("scene3d.js?" + APP_VERSION);
      if(window.__scene3d) window.__scene3d.dispose();
      view3d = window.__scene3d = mountKonbini3D($("#scene3d"), k => show(k));
    }catch(e){ $("#scene3d").innerHTML = `<div class="empty">3D could not start on this device.</div>`; }
  }
  // labels drawn on the SVG: one for the selected item, or all of them ("Show all"); overlaps relaxed apart
  let allOn = false, cur = null;
  const tags = () => {
    if(!svgEl) return;
    svgEl.querySelectorAll(".tag").forEach(t => t.remove());
    const keys = allOn ? Object.keys(sc.items) : (cur ? [cur] : []);
    const ns = "http://www.w3.org/2000/svg", VW = svgEl.viewBox.baseVal.width, VH = svgEl.viewBox.baseVal.height;
    const u = VW/400;
    const P = keys.map(k => {
      const g = svgEl.querySelector(`.spot[data-id="${k}"]`); if(!g) return null;
      const bb = g.getBBox(), t = document.createElementNS(ns, "g"), label = document.createElementNS(ns, "text");
      t.setAttribute("class", "tag"); label.textContent = sc.items[k].jp + (sc.items[k].zoom ? " 🔍" : "");
      label.setAttribute("font-size", (allOn ? 10.5 : 12)*u); label.setAttribute("font-weight", "700");
      label.setAttribute("text-anchor", "middle"); label.setAttribute("fill", "#fff");
      t.appendChild(label); svgEl.appendChild(t);
      const w = label.getComputedTextLength() + 10*u, h = (allOn ? 15 : 18)*u;
      const x = bb.x + bb.width/2, y = allOn ? bb.y + Math.min(bb.height/2, 18*u) : bb.y - 4*u;
      return {k, t, label, w, h, ax:x, ay:y, x, y};
    }).filter(Boolean);
    for(let it = 0; it < 120 && P.length > 1; it++){
      for(let i = 0; i < P.length; i++) for(let j = i + 1; j < P.length; j++){
        const p = P[i], q = P[j];
        const ox = (p.w + q.w)/2 + 2*u - Math.abs(p.x - q.x), oy = (p.h + q.h)/2 + u - Math.abs(p.y - q.y);
        if(ox <= 0 || oy <= 0) continue;
        if(oy < ox){ const s = p.y <= q.y ? -1 : 1; p.y += s*oy/2; q.y -= s*oy/2; }
        else { const s = p.x <= q.x ? -1 : 1; p.x += s*ox/2; q.x -= s*ox/2; }
      }
      for(const p of P){ p.x += (p.ax - p.x)*.02; p.y += (p.ay - p.y)*.02; }
    }
    for(const p of P){
      p.x = Math.max(p.w/2 + 2*u, Math.min(VW - p.w/2 - 2*u, p.x)); p.y = Math.max(p.h + u, Math.min(VH - 2*u, p.y));
      const r = document.createElementNS(ns, "rect");
      r.setAttribute("x", p.x - p.w/2); r.setAttribute("y", p.y - p.h + 3); r.setAttribute("width", p.w); r.setAttribute("height", p.h);
      r.setAttribute("rx", 4*u); r.setAttribute("fill", p.k === cur || !allOn ? "var(--shu)" : "rgba(43,36,52,.8)");
      p.t.insertBefore(r, p.label); p.label.setAttribute("x", p.x); p.label.setAttribute("y", p.y - (allOn ? 1 : 0)*u);
      p.t.style.pointerEvents = "none";
    }
  };
  const setAll = on => { allOn = on; $("#showAll").setAttribute("aria-pressed", on); store.set("jc:scenelabels", on); if(svgEl) svgEl.classList.toggle("all", on);
    if(view3d && view3d.showAll) view3d.showAll(Object.fromEntries(Object.entries(sc.items).map(([k,v]) => [k, v.jp])), on); tags(); };
  $("#showAll").onclick = () => setAll($("#showAll").getAttribute("aria-pressed") !== "true");
  const show = k => {
    const v = sc.items[k]; if(!v) return;
    const g = svgEl ? svgEl.querySelector(`.spot[data-id="${k}"]`) : null;
    if(svgEl) svgEl.querySelectorAll(".spot").forEach(x => x.classList.toggle("on", x === g));
    if(view3d){ view3d.select(k, true); view3d.setLabel(v.jp); }
    document.querySelectorAll(".scene-row").forEach(c => c.classList.toggle("on", c.dataset.spot === k));
    cur = k; tags();
    speak(v.jp);
    $("#sceneInfo").innerHTML = `<div class="scene-word">${esc(v.jp)} ${sayBtn(v.jp)}</div>
      <div class="rd">${esc(v.reading)}</div><div class="en">${esc(v.en)}</div>
      <div class="ex"><span class="jpline">${esc(v.phrase)}</span><div class="tr">${esc(v.phraseEn)}</div></div>
      ${v.zoom ? `<button class="nav-btn zoom-in" id="zoomIn">Zoom in</button>` : ""}`;
    if(v.zoom) $("#zoomIn").onclick = () => zoomTo(k);
  };
  setAll(store.get("jc:scenelabels", false));
  if(svgEl) svgEl.querySelectorAll(".spot").forEach(g => g.addEventListener("click", ev => { ev.stopPropagation(); show(g.dataset.id); }));
  document.querySelectorAll(".scene-row").forEach(c => c.onclick = () => { show(c.dataset.spot); (document.querySelector("#scene3d, #sceneZoom")).scrollIntoView({behavior:"smooth", block:"start"}); });
  document.querySelector(".scene-words").addEventListener("toggle", e => store.set("jc:scenewords", e.target.open));
  // zoom: fly into a spot, then open the closer scene; zoom out flies back from it
  const canvas = $("#sceneCanvas"), VB = svgEl && svgEl.viewBox.baseVal;
  const focus = k => {
    const g = svgEl && svgEl.querySelector(`.spot[data-id="${k}"]`); if(!g) return null;
    const bb = g.getBBox();
    return {ox: (bb.x + bb.width/2)/VB.width*100, oy: (bb.y + bb.height/2)/VB.height*100,
            s: Math.min(4, .9*Math.min(VB.width/bb.width, VB.height/bb.height))};
  };
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const play = (frames, opt) => { const an = canvas.animate(frames, opt);
    return Promise.race([an.finished, new Promise(r => setTimeout(r, opt.duration + 60))]); };
  async function zoomTo(k){
    const f = focus(k), next = sc.items[k].zoom;
    if(f && !still && canvas.animate){
      canvas.style.transformOrigin = `${f.ox}% ${f.oy}%`;
      await play([{transform:"scale(1)", opacity:1}, {transform:`scale(${f.s})`, opacity:0}],
        {duration:480, easing:"cubic-bezier(.5,0,.8,.4)", fill:"forwards"});
    }
    renderScene(next, {dir:"in"});
  }
  if(arrive && canvas && !still && canvas.animate){
    const f = arrive.dir === "out" && arrive.spot ? focus(arrive.spot) : null;
    if(f){ canvas.style.transformOrigin = `${f.ox}% ${f.oy}%`;
      canvas.animate([{transform:`scale(${f.s})`, opacity:0}, {transform:"scale(1)", opacity:1}], {duration:480, easing:"cubic-bezier(.2,.6,.3,1)"}); }
    else canvas.animate([{transform:"scale(.85)", opacity:0}, {transform:"scale(1)", opacity:1}], {duration:380, easing:"cubic-bezier(.2,.6,.3,1)"});
  }
  if(sc.parent) $("#sceneBack").onclick = async () => {
    if(canvas && !still && canvas.animate){ canvas.style.transformOrigin = "50% 50%";
      await play([{transform:"scale(1)", opacity:1}, {transform:"scale(.7)", opacity:0}], {duration:320, easing:"ease-in", fill:"forwards"}); }
    const par = await (await fetch(`data/${SCENE_DIR}/${sc.parent}.json`, {cache:"no-cache"})).json();
    renderScene(sc.parent, {dir:"out", spot: Object.keys(par.items).find(x => par.items[x].zoom === id)});
  };
  else $("#sceneBack").onclick = () => { if(window.__scene3d){ window.__scene3d.dispose(); window.__scene3d = null; }
    if(SCENE_DIR === "explore") pick("home"); else renderScenes(); };
}

/* ---------- Sections: topic chapters ---------- */
const SEC_PARTS = {"1":["関係","Relations & abstract ideas"],"2":["人間","People & society"],"3":["活動","Actions, mind & life"],
  "4":["生産物","Things people make"],"5":["自然","Nature"],"x":["その他","Other words"]};
async function renderSections(){
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
/* ===== Cards outside Playground: MINI by default, tap = full card, tap its top = back to mini =====
   MINI.reg holds the card objects so any list (Complete list, sections, readings) can swap mini <-> full. */
const MINI = {reg: new Map()};
const miniKey = (t, lv, no) => `${t}:${lv}:${no}`;
function miniCard(c, lv){ return miniFor("words", c, lv); }
function miniFor(t, c, lv){
  lv = lv || c.level;
  return cardFront(t, c, lv);
  MINI.reg.set(miniKey(t, lv, c.no), c);
  const tag = {words:"W", kanji:"K", grammar:"G"}[t];
  let head = "", en = "", e = null, target = "";
  if(t === "words"){
    head = `<b class="mini-w">${esc(c.word)}</b><span class="mini-rd">${esc(c.reading)}</span>${sayIcon(c.word)}`;
    en = (c.en || "").split(" / ")[0]; e = (c.ex && c.ex[0]) || c.use; target = c.word;
  }else if(t === "kanji"){
    head = `<b class="mini-w">${esc(c.kanji)}</b><span class="mini-rd">${esc([(c.on || []).join("・"), (c.kun || []).join("・")].filter(Boolean).join(" ／ "))}</span>`;
    en = c.en || ""; const w = (c.words || [])[0];
    e = w ? {jp: `${w.w}（${w.r}）${w.m ? ": " + w.m : ""}`} : null; target = c.kanji;
  }else{
    head = `<b class="mini-w">${esc(c.pattern)}</b>`;
    en = c.en || ""; e = (c.rei || [])[0]; target = c.variants || c.pattern;
  }
  return `<button class="mini mini-${t}" data-mt="${t}" data-mlv="${lv}" data-no="${c.no}">
    <span class="mini-top"><span class="mini-no">#${tag}${c.no}</span>${head}</span>
    ${en ? `<span class="mini-en">${esc(en)}</span>` : ""}
    ${e ? `<span class="mini-ex">${t === "kanji" ? "" : `<span class="rei">例：</span>`}${t === "kanji" ? esc(e.jp) : hl(e.jp, target)}</span>` : ""}
  </button>`;
}
function peekFor(t, c){   // the short meaning + first example shown under a closed card in lists
  let en = "", e = null, target = "";
  if(t === "words"){ en = (c.en || "").split(" / ")[0]; e = (c.ex && c.ex[0]) || c.use; target = c.word; }
  else if(t === "kanji"){ en = c.en || ""; const w = (c.words || [])[0]; e = w ? {jp: `${w.w}（${w.r}）${w.m ? ": " + w.m : ""}`} : null; target = c.kanji; }
  else { en = c.en || ""; e = (c.rei || [])[0]; target = c.variants || c.pattern; }
  return `<div class="card-peek">${en ? `<span class="mini-en">${esc(en)}</span>` : ""}${e ? `<span class="mini-ex">${t === "kanji" ? esc(e.jp) : `<span class="rei">例：</span>${hl(e.jp, target)}`}</span>` : ""}</div>`;
}
function shortAnswer(t, c, html){   // Settings → Answer: Short = reveal only the meaning + one example (the mini card's content)
  if(store.get("jc:answer", "full") !== "short") return html;
  const i = html.indexOf('<div class="back">');
  return html.slice(0, i) + `<div class="back back-short">${peekFor(t, c)}</div></div>`;
}
function cardFront(t, c, lv){   // closed list card: identical front to the opened card, no answer part
  MINI.reg.set(miniKey(t, lv, c.no), c); CARD_LVL = lv;
  const html = {words:wordCard, kanji:kanjiCard, grammar:grammarCard}[t](c), i = html.indexOf('<div class="back">');
  return html.slice(0, i).replace(/class="card (\w)"/, `class="card $1 list-card" data-mt="${t}" data-mlv="${lv}" tabindex="0" role="button"`) + peekFor(t, c) + "</div>";
}
function fullFor(t, c, lv){
  CARD_LVL = lv;
  const html = {words:wordCard, kanji:kanjiCard, grammar:grammarCard}[t](c), i = html.indexOf('<div class="back">');
  return (html.slice(0, i) + peekFor(t, c) + html.slice(i)).replace(/class="card (\w)"/, `class="card $1 list-card open" data-mt="${t}" data-mlv="${lv}"`);
}
// one handler for every mini list on any page (Playground never renders minis)
document.addEventListener("click", e => {
  if(e.target.closest(".say")) return;   // speaker icon: play only
  const word = e.target.closest(".card .big");   // the headword itself = hear it, the card stays as it is
  if(word && word.closest(".play-stage")){   // Practice: a quick second tap on the word = reveal
    const now = Date.now(), card = word.closest(".card");
    if(now - (word._t || 0) < 350 && !card.classList.contains("open")){ e.stopPropagation(); word._t = 0; flipCard(card, true); return; }
    word._t = now; }
  if(word && soundOn()){ const cd = word.closest(".card"), c = cd && MINI.reg.get(miniKey(cd.dataset.mt, cd.dataset.mlv, cd.dataset.no));
    const text = (c && c.word) || (cd && cd.dataset.type === "words" ? word.textContent.trim() : "");
    if(text && AUDIO_MAP && AUDIO_MAP[text]){ e.stopPropagation(); e.preventDefault(); word.animate([{transform:"scale(.97)"},{transform:"none"}], {duration:180}); speak(text); return; } }
  const m = e.target.closest(".list-card[data-mt]:not(.open)");
  if(m && !e.target.closest("a")){
    const c = MINI.reg.get(miniKey(m.dataset.mt, m.dataset.mlv, m.dataset.no));
    if(c){ e.stopPropagation();
      const tmp = document.createElement("div"); tmp.innerHTML = fullFor(m.dataset.mt, c, m.dataset.mlv).trim();
      const full = tmp.firstElementChild; m.replaceWith(full); unfoldBack(full.querySelector(".back")); }
    return;
  }
  const f = e.target.closest(".list-card.open[data-mt] .front");
  if(f){
    const card = f.closest(".card"), c = MINI.reg.get(miniKey(card.dataset.mt, card.dataset.mlv, card.dataset.no));
    if(c){ e.stopPropagation(); foldBack(card.querySelector(".back"), () => { card.outerHTML = miniFor(card.dataset.mt, c, card.dataset.mlv); }); }
  }
}, true);

async function renderSection(id){
  const S = await loadSections(), lv = id.split("-")[0], idx = S[lv].findIndex(x => x.id === id), s = S[lv][idx];
  const pool = await pgPool(lv), set = new Set(s.words);
  const cards = pool.words.filter(c => set.has(c.no));
  $("#pageTitle").textContent = s.name;
  showScreen("section-" + id, createElement(SectionPage, {   // v161: React (src/screens/Lists.tsx)
    tr, name: s.name, en: s.en, meta: `${lv} · section ${idx + 1} · ${cards.length} words`, cardsHtml: cards.map(c => miniCard(c, lv)).join(""),
    onBack: () => renderSections(),
    onStudy: () => { const cur = pgState(); cur.from = "section"; cur.section = id; cur.level = lv; store.set("jc:pg", cur);
      const name = s.name; pick("playground"); PG_NEW = true; PG_RETURN = {label: name, go: () => leavePracticeTo("sections", () => renderSection(id))}; renderPG(); }}));
}

/* ---------- Pre-learn reading page ---------- */
async function renderPrelearn(id){
  document.body.classList.remove("playing");
  const R = await loadReading(id);
  // the reading file carries its own cards, so the page opens without loading the whole database
  const get = (t, lv, no) => ((R.cards || {})[t] || []).find(c => c.level === lv && c.no === no);
  const studied = R.words.filter(([lv, no]) => pgProfile(lv, "words", no).reviews).length;
  let html = "", at = 0;
  for(const [s, e, t, lv, no] of R.spans){
    if(s < at) continue;
    html += esc(R.text.slice(at, s)) + `<mark class="pw pw-${t}" data-t="${t}" data-lv="${lv}" data-no="${no}">${esc(R.text.slice(s, e))}</mark>`;
    at = e;
  }
  html += esc(R.text.slice(at));
  html = html.split("\n").map(p => `<p>${p}</p>`).join("");
  const list = (t, rows) => rows.map(([lv, no]) => { const c = get(t, lv, no); return c ? miniFor(t, c, lv) : ""; }).join("");
  $("#pageTitle").textContent = R.title;
  $("#list").innerHTML = `<section class="reading prelearn">
    <div class="story-top"><button class="nav-btn" id="preBack" data-back="本文">Back</button><button class="nav-btn pre-read" id="preReadBtn" hidden>Read 本文</button></div>
    <div class="pre-head"><h2 class="sec-title">${esc(R.title)}<em>${esc(R.titleEn)}</em><small>${R.level} · about ${Math.max(1, Math.round(R.text.length / 400))} min read · ${studied}/${R.words.length} words studied</small></h2>
      <button class="nav-btn pre-study" id="preStudy">Study these</button></div>
    <h3 class="pre-part">言葉 <small>${R.words.length} words</small></h3>
    <div class="complete-cards">${list("words", R.words)}</div>
    ${R.grammar.length ? `<h3 class="pre-part">文法 <small>${R.grammar.length} grammar</small></h3><div class="complete-cards">${list("grammar", R.grammar)}</div>` : ""}
    ${R.kanji.length ? `<h3 class="pre-part">漢字 <small>${R.kanji.length} kanji</small></h3><div class="complete-cards">${list("kanji", R.kanji)}</div>` : ""}
    <p class="story-meta"><a href="${esc(R.sourceUrl)}" target="_blank" rel="noopener">${esc(R.source)}</a>${R.imgCredit ? ` · <a href="${esc(R.imgUrl || R.sourceUrl)}" target="_blank" rel="noopener">${esc(R.imgCredit)}</a>` : ""}</p>
  </section>`;
  $("#preReadBtn").onclick = () => { renderReader(id); scrollTo(0, 0); };
  $("#preBack").onclick = () => { renderReader(id); scrollTo(0, 0); };
  $("#preStudy").onclick = () => { const cur = pgState(); cur.from = "reading"; cur.reading = id; cur.level = "ALL";
    cur.n.words = R.words.length; cur.n.kanji = R.kanji.length; cur.n.grammar = R.grammar.length; store.set("jc:pg", cur);
    pick("playground"); PG_NEW = true; PG_RETURN = {label: "Cards", go: () => leavePracticeTo("reading", () => renderPrelearn(id))}; renderPG(); };

}

/* ---------- Clean reader: only the text; tap any word = quick English ---------- */
async function renderReader(id){
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
  $("#list").innerHTML = `<section class="reader">
    <div class="story-top"><span class="pre-btns"><button class="nav-btn" id="rdShelf" data-back="${esc(((SHELVES.find(x => x[0] === (R.shelf || "article")) || [])[1]) || "Reading")}">Back</button><button class="nav-btn" id="rdBack" hidden>Cards</button></span><button class="rd-voice" id="rdVoice" aria-pressed="${store.get("jc:tapvoice", true)}" aria-label="Voice on tap">
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/>
      <path class="wv" d="M16 9.5a3.5 3.5 0 0 1 0 5M18.5 7a7 7 0 0 1 0 10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button></div>
    <h1 class="reader-title">${esc(R.title)}</h1>
    <div class="reader-text">${html.split("\n").map(p => p.startsWith("§") ? `<h3 class="reader-ch">${p.slice(1)}</h3>` : `<p>${p}</p>`).join("")}</div>
    <p class="story-meta"><a href="${esc(R.sourceUrl)}" target="_blank" rel="noopener">${esc(R.source)}</a> · tap a word for English</p>
    <div class="tip-bubble" id="tipB" hidden></div>
  </section>`;
  $("#rdBack").onclick = () => { renderPrelearn(id); scrollTo(0, 0); };
  setHeaderAction("Cards", () => { renderPrelearn(id); scrollTo(0, 0); });
  $("#rdShelf").onclick = () => { renderShelf(R.shelf || "article"); scrollTo(0, 0); };
  $("#rdVoice").onclick = e => { e.stopPropagation(); const on = !store.get("jc:tapvoice", true); store.set("jc:tapvoice", on); $("#rdVoice").setAttribute("aria-pressed", on); };
  const tip = $("#tipB"), box = document.querySelector(".reader");
  box.onclick = e => {
    const w = e.target.closest(".tk");
    document.querySelectorAll(".tk.on").forEach(x => x.classList.remove("on"));
    if(!w){ tip.hidden = true; return; }
    w.classList.add("on");
    tip.innerHTML = (w.dataset.r ? `<span class="tip-rd">${esc(w.dataset.r)}</span>` : "") + (w.dataset.g ? `<span class="tip-en">${esc(w.dataset.g)}</span>` : "");
    tip.hidden = false;
    if(store.get("jc:tapvoice", true)) speak(w.textContent);   // hear the word as written in the text
    clearTimeout(tip._t);   // quick look: disappears by itself after 2 s
    tip._t = setTimeout(() => { tip.hidden = true; w.classList.remove("on"); }, 2000);
    const r = w.getBoundingClientRect(), br = box.getBoundingClientRect();
    tip.style.left = Math.max(0, Math.min(br.width - tip.offsetWidth, r.left - br.left + r.width / 2 - tip.offsetWidth / 2)) + "px";
    tip.style.top = (r.top - br.top - tip.offsetHeight - 8) + "px";
  };
}

/* ---------- Use it: write a message that uses the target words; Claude replies (and corrects misuse) ----------
   Skeleton: Send unlocks only when every target word is in the message; Hint fills a real example (logged as a hint).
   The user's own API key stays in this browser (localStorage). Log: jc:uselog [{ts, words, hint, text}]. */
const USE = {words: [], hinted: new Set(), history: [], client: null};
const SDK_URL = "https://cdn.jsdelivr.net/npm/@anthropic-ai/sdk@0.128.0/+esm";
function usesWord(msg, c){
  const w = c.word.replace(/[（(].*?[）)]|[〜～]/g, "").trim();
  if(msg.includes(w)) return true;
  // conjugated verbs / i-adjectives: accept the stem when it keeps a kanji (掲げる -> 掲げ, 著しい -> 著し)
  if(/[\u4e00-\u9fff]/.test(w) && /[うくぐすつぬぶむるい]$/.test(w) && w.length >= 2){
    const stem = w.slice(0, -1);
    if(/[\u4e00-\u9fff]/.test(stem) && msg.includes(stem)) return true;
  }
  return false;
}
async function pickUseWords(){
  const affix = c => /[〜～]/.test(c.word + (c.reading || ""));   // suffix/prefix entries (～宛, ～化) are not usable on their own
  const all = [...(await pgPool("N1")).words, ...(await pgPool("N2")).words].filter(c => !affix(c));
  const studied = all.filter(c => pgProfile(c.level, "words", c.no).reviews);
  const from = studied.length >= 2 ? studied : all.filter(c => c.level === "N1");
  const out = []; while(out.length < 2){ const c = from[Math.floor(Math.random() * from.length)]; if(!out.includes(c)) out.push(c); }
  USE.words = out; USE.hinted = new Set(); return studied.length >= 2;
}
async function renderUseIt(){
  document.body.classList.remove("playing");
  const key = store.get("jc:apikey", "");
  if(!key && USE.wantKey){
    $("#list").innerHTML = `<section class="useit">
      <h2 class="sec-title">使ってみる<em>Use your words in a message</em></h2>
      <p class="set-lead">This practice talks to Claude with your own Anthropic API key. The key is saved only in this browser.</p>
      <label class="set-label" for="useKey">Anthropic API key</label>
      <input id="useKey" class="use-key" type="password" autocomplete="off" placeholder="sk-ant-…">
      <button class="go start" id="useKeySave">Save key</button><button class="use-keyx" id="useNoKey">Back to Claude-app mode</button></section>`;
    $("#useNoKey").onclick = () => { USE.wantKey = false; renderUseIt(); };
    $("#useKeySave").onclick = () => { const v = $("#useKey").value.trim(); if(v){ store.set("jc:apikey", v); USE.client = null; renderUseIt(); } };
    return;
  }
  if(!USE.words.length) USE.fromStudied = await pickUseWords();
  const chips = USE.words.map((c, i) => `<span class="use-chip" data-i="${i}"><b>${esc(c.word)}</b><small>${esc(c.reading)} · ${esc((c.en || "").split(" / ")[0].split(";")[0])}</small></span>`).join("");
  $("#list").innerHTML = `<section class="useit">
    <div class="use-task">
      <div class="use-h">Write a message using ${USE.words.length === 1 ? "this word" : "both words"}${USE.fromStudied ? "" : " <small>(random N1 words: study some in Playground first)</small>"}</div>
      <div class="use-chips">${chips}</div>
      <div class="use-tools"><button class="nav-btn" id="useHint">Hint</button><button class="nav-btn" id="useNew">New words</button><button class="use-keyx" id="useKeyReset">${key ? "Remove API key" : "Use an API key"}</button></div>
    </div>
    <div class="use-log" id="useLog">${USE.history.map(m => `<div class="use-msg ${m.role}">${esc(m.content)}</div>`).join("")}</div>
    <div class="use-input"><textarea id="useText" rows="3" placeholder="日本語で書いてみよう…"></textarea>
      <button class="go start" id="useSend" disabled>${key ? "Send" : "Ask Claude ↗"}</button></div>
    ${key ? "" : `<p class="use-note">Opens Claude with your sentence ready. It uses your Claude plan, no API key.</p>`}
  </section>`;
  const ta = $("#useText"), send = $("#useSend");
  const check = () => {
    const ok = USE.words.map(c => usesWord(ta.value, c));
    document.querySelectorAll(".use-chip").forEach((el, i) => el.classList.toggle("ok", ok[i]));
    send.disabled = !ok.every(Boolean) || !ta.value.trim();
  };
  ta.oninput = check;
  $("#useNew").onclick = async () => { USE.fromStudied = await pickUseWords(); renderUseIt(); };
  $("#useKeyReset").onclick = () => { if(key){ store.set("jc:apikey", ""); USE.client = null; USE.wantKey = false; } else USE.wantKey = true; renderUseIt(); };
  $("#useHint").onclick = () => {
    // cheat mode: a real example sentence from the cards (logged)
    const parts = USE.words.map(c => { USE.hinted.add(c.no + c.level); const e = (c.ex && c.ex[0]) || c.use; return e ? e.jp : `${c.word}を使ってみました。`; });
    ta.value = parts.join(""); check(); ta.focus();
  };
  send.onclick = async () => {
    const text = ta.value.trim(); if(!text) return;
    const log0 = store.get("jc:uselog", []);
    if(!key){
      log0.push({ts: Date.now(), words: USE.words.map(c => [c.level, c.no, c.word]), hint: USE.words.some(c => USE.hinted.has(c.no + c.level)), text, via: "claude-app"});
      store.set("jc:uselog", log0.slice(-500));
      const words = USE.words.map(c => `${c.word}（${c.reading}）= ${(c.en || "").split(" / ")[0]}`).join(" / ");
      const prompt = `I'm learning Japanese for JLPT N1. I wrote a message that uses these target words: ${words}\n\nMy message:「${text}」\n\n`
        + `1) If a target word is used wrongly or unnaturally, correct it in one line: ✎ 「wrong part」→「better」— short English reason. If it's fine, skip this.\n`
        + `2) Then reply to my message naturally in Japanese (2–4 sentences, about N2 level), as if we're chatting.`;
      try{ await navigator.clipboard.writeText(prompt); }catch(e){}
      window.open("https://claude.ai/new?q=" + encodeURIComponent(prompt), "_blank", "noopener");
      $("#useLog").insertAdjacentHTML("beforeend", `<div class="use-msg user">${esc(text)}</div><div class="use-msg assistant">Opened in Claude ↗ (also copied, in case you need to paste)</div>`);
      USE.history.push({role: "user", content: text}, {role: "assistant", content: "Opened in Claude ↗"});
      USE.fromStudied = await pickUseWords(); const keep = [...USE.history]; renderUseIt(); USE.history = keep;
      return;
    }
    const log = log0;
    log.push({ts: Date.now(), words: USE.words.map(c => [c.level, c.no, c.word]), hint: USE.words.some(c => USE.hinted.has(c.no + c.level)), text});
    store.set("jc:uselog", log.slice(-500));
    USE.history.push({role: "user", content: text});
    $("#useLog").insertAdjacentHTML("beforeend", `<div class="use-msg user">${esc(text)}</div><div class="use-msg assistant pending" id="usePending">…</div>`);
    ta.value = ""; check(); send.disabled = true;
    const pend = $("#usePending"); pend.removeAttribute("id");
    try{
      if(!USE.client){ const { default: Anthropic } = await import(SDK_URL);
        USE.client = new Anthropic({apiKey: store.get("jc:apikey", ""), dangerouslyAllowBrowser: true}); USE.Anthropic = Anthropic; }
      const target = USE.words.map(c => `${c.word}（${c.reading}）: ${(c.en || "").split(" / ")[0]}`).join("\n");
      const response = await USE.client.beta.messages.create({
        model: "claude-opus-5",
        max_tokens: 1024,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: {effort: "low"},
        system: `You are a friendly Japanese conversation partner for a JLPT N1/N2 learner.
The learner's message had to use these target words:
${target}
Reply in natural Japanese, 2 to 4 short sentences, at about N2 level, continuing the conversation.
If a target word is used incorrectly or unnaturally, begin with one correction line in this form:
✎ 「wrong part」→「better phrasing」— one short English explanation
then continue the conversation. If the usage is fine, do not comment on it; just reply naturally.`,
        messages: USE.history,
      });
      if(response.stop_reason === "refusal"){ pend.textContent = "The model declined to answer this message. Try writing it differently."; USE.history.pop(); return; }
      const reply = response.content.filter(b => b.type === "text").map(b => b.text).join("").trim();
      USE.history.push({role: "assistant", content: reply});
      pend.classList.remove("pending"); pend.textContent = reply;
      USE.fromStudied = await pickUseWords();   // next round: new words
      const keep = [...USE.history]; renderUseIt(); USE.history = keep;
      document.querySelector("#useLog").scrollTop = 1e9;
    }catch(err){
      USE.history.pop();
      const A = USE.Anthropic;
      pend.classList.add("err");
      pend.textContent = A && err instanceof A.AuthenticationError ? "The API key was rejected. Tap “Change key” and enter a valid key."
        : A && err instanceof A.RateLimitError ? "Too many requests right now. Wait a moment and send again."
        : A && err instanceof A.APIConnectionError ? "No connection to the API. Check your internet and send again."
        : `Could not get a reply: ${err.message || err}`;
    }
  };
  check();
}

/* ---------- Pictures: one word, one photo (Wikidata label + Commons image, meaning-checked with JMdict) ---------- */
async function renderPictures(){
  document.body.classList.remove("playing");
  let idx = []; try{ idx = await (await fetch("data/pictures/index.json", {cache:"no-cache"})).json(); }catch(e){}
  $("#pageTitle").textContent = "Pictures";
  idx = idx.filter(x => x.group !== "illust");
  $("#list").innerHTML = `<section class="pics">
    <div class="pic-cats">${idx.map(picTile).join("")}</div>
    <details class="ps-credits pic-credits" id="picCredits"><summary>Photo credits</summary><ol id="picCreditList"></ol></details></section>`;
  document.querySelectorAll("[data-pcat]").forEach(b => b.onclick = () => { renderPicCat(b.dataset.pcat); scrollTo(0, 0); });
  $("#picCredits").addEventListener("toggle", async () => {   // all categories' credits, fetched on first open
    const ol = $("#picCreditList"); if(!$("#picCredits").open || ol.childElementCount) return;
    const cats = await Promise.all(idx.map(x => fetch(`data/pictures/${x.key}.json`).then(r => r.json()).catch(() => null)));
    ol.innerHTML = cats.filter(Boolean).flatMap(C => C.words.flatMap(w => { const P = picsOf(w);
      return P.map((p, k) => `<li>${esc(w.word)}${P.length > 1 ? ` (${k + 1})` : ""} : <a href="${esc(p.page)}" target="_blank" rel="noopener">${esc(p.credit)}</a></li>`); })).join("");
  });
}
const picTile = x => `<button class="pic-cat${x.group === "illust" ? " illust" : ""}" data-pcat="${x.key}">
      <span class="pic-cover"><img src="${picSrc(x.cover)}" alt="" loading="lazy"></span>
      <b>${esc(x.ja)}</b><span>${esc(x.en.replace(" (いらすとや)", ""))} · ${x.count}</span></button>`;
let EXTRA_IDX = null;
async function extraIdx(){ if(!EXTRA_IDX){ try{ EXTRA_IDX = await (await fetch("data/pictures/extra/index.json", {cache:"no-cache"})).json(); }catch(e){ EXTRA_IDX = []; } } return EXTRA_IDX; }
async function extraThemes(){ const I = await extraIdx(), m = new Map();
  for(const x of I){ const t = m.get(x.theme) || {theme: x.theme, themeEn: x.themeEn, count: 0, cover: x.cover}; t.count += x.count; m.set(x.theme, t); }
  return [...m.values()]; }
async function renderExtraTheme(theme){   // one theme's extra sessions (150 pictures each)
  const S = (await extraIdx()).filter(x => x.theme === theme);
  $("#pageTitle").textContent = theme;
  $("#list").innerHTML = `<section class="pics xtheme">
    <button class="nav-btn" id="xBack" data-back="Illustrations">Back</button>
    <ul class="x-sessions">${S.map((x, i) => `<li><button type="button" class="x-sess" data-pcat="${x.key}"><span class="x-no">${i + 1}</span><span class="x-lab">${esc(x.labels.join("・"))}</span><span class="x-n">${x.count}</span></button></li>`).join("")}</ul>
    <p class="pic-by">Illustrations by <a href="https://www.irasutoya.com/" target="_blank" rel="noopener">いらすとや</a>. Meanings here are automatic (dictionary), so a few may be off.</p></section>`;
  $("#xBack").onclick = () => { renderIllust(); scrollTo(0, 0); };
  document.querySelectorAll(".x-sess").forEach(b => b.onclick = () => { renderPicCat(b.dataset.pcat); scrollTo(0, 0); });
}
/* ---------- Listening: JLPT-format tests (original scripts, several voices). Listen, pick an answer, check, read the script ---------- */
/* Test lists (Listening + Reading tests): level switch, one compact row per test with its scenes and best score */
/* v152: answers in a test are kept until it is finished or started over; reopening lands on the first unanswered question */
/* v159: tests are React screens (src/screens/Tests.tsx); answers/scores in src/tests/quiz.ts */
const TEST_KINDS = {
  lsn: {title: "Listening", index: "data/listening/index.json", back: null},
  rdt: {title: "Reading tests", index: "data/readtests/index.json", back: "Reading"},
  voc: {title: "Vocab & Grammar", index: "data/vocabtests/index.json", back: null},
};
async function renderTestList(kind){
  const K0 = TEST_KINDS[kind];
  let L = []; try{ L = await (await fetch(K0.index, {cache:"no-cache"})).json(); }catch(e){}
  const levels = [...new Set(L.map(t => t.level))].sort(), key = "jc:tlv:" + kind;
  let lv = store.get(key, levels.includes("N1") ? "N1" : levels[0]); if(!levels.includes(lv)) lv = levels[0];
  const v = kind === "lsn" ? [...new Set(L.flatMap(t => t.voices || []))].sort() : [];
  $("#pageTitle").textContent = K0.title;
  const draw = () => showScreen("tl-" + kind, createElement(TestList, {kind, idx: L, level: lv, tr, back: K0.back,
    credit: v.length ? "Voices: " + v.map(n => "VOICEVOX:" + n).join("、") + "、Microsoft Edge TTS (narrator)" : "",
    onLevel: l => { lv = l; store.set(key, l); NAV_SAME = true; draw(); },
    onOpen: id => renderTest(kind, id),
    onBack: () => { renderReading(); scrollTo(0, 0); }}));
  draw();
}
const renderListening = () => renderTestList("lsn"), renderReadTests = () => renderTestList("rdt"), renderVocabTests = () => renderTestList("voc");
async function renderTest(kind, id){
  const dir = {lsn: "listening", rdt: "readtests", voc: "vocabtests"}[kind];
  const T = await (await fetch(`data/${dir}/${id}.json`, {cache:"no-cache"})).json();
  const C = {lsn: ListenTest, rdt: ReadTest, voc: VocabTest}[kind];
  showScreen(`test-${kind}-${id}`, createElement(C, {id, T, tr, setTitle: t => { $("#pageTitle").textContent = t; },
    onBack: () => renderTestList(kind)}));
}
const renderReadTest = id => renderTest("rdt", id), renderVocabTest = id => renderTest("voc", id), renderListenTest = id => renderTest("lsn", id);
async function renderIllust(){   // いらすとや: one row per topic, sessions scroll sideways (words with pictures)
  document.body.classList.remove("playing");
  let idx = [], ext = [];
  try{ idx = (await (await fetch("data/pictures/index.json", {cache:"no-cache"})).json()).filter(x => x.group === "illust"); }catch(e){}
  ext = await extraIdx();
  for(const x of idx) if(!x.first) x.first = [];
  const rows = new Map(), themeOf = x => x.theme || x.ja.replace(/ \d+$/, "");
  for(const x of [...idx, ...ext]){ const t = themeOf(x); if(!rows.has(t)) rows.set(t, {en: (x.themeEn || x.en || "").replace(" (いらすとや)", ""), items: []}); rows.get(t).items.push(x); }
  const order = [...rows.keys()].sort((a, b) => (a === "その他") - (b === "その他"));
  $("#pageTitle").textContent = "Illustrations";
  $("#list").innerHTML = `<section class="pics ill-rows">
    ${order.map((t, ti) => { const R = rows.get(t), total = R.items.reduce((n, x) => n + x.count, 0);
      return `<div class="ill-row"><h2 class="ill-h"><span class="ill-no">${ti + 1}</span>${esc(t)}<small>${esc(R.en)} · ${total.toLocaleString()}</small></h2>
        <div class="ill-scroll">${R.items.map((x, i) => `<button type="button" class="ill-tile" data-pcat="${x.key}"><span class="ill-cover"><img src="${picSrc(x.cover)}" alt="" loading="lazy"></span><span class="ill-words">${esc((x.first || []).slice(0, 2).join("・"))}</span></button>`).join("")}</div></div>`; }).join("")}
    <p class="pic-by">Illustrations by <a href="https://www.irasutoya.com/" target="_blank" rel="noopener">いらすとや</a> (みふねたかし). Used for personal study, not for sale.</p></section>`;
  document.querySelectorAll("[data-pcat]").forEach(b => b.onclick = () => { renderPicCat(b.dataset.pcat); scrollTo(0, 0); });
  if(isJa()) jaWalk($("#list"));
}
const picSrc = f => /^https?:/.test(f) ? f : `data/pictures/${f}`;   // extras load from いらすとや directly
const picsOf = w => (w.imgs && w.imgs.length) ? w.imgs : [{img: w.img, credit: w.credit, page: w.page}];   // 1–3 photos per word
async function renderPicCat(key){
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
function picView(C, W, clean){
  const spk = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 9.5a3.5 3.5 0 0 1 0 5M18.5 7a7 7 0 0 1 0 10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  $("#list").innerHTML = `<section class="pv">
    <div class="pv-top"><button class="nav-btn" id="pvBack" data-back="${/^x/.test(C.key) || C.key.startsWith("ira_") ? "Illustrations" : "Pictures"}">Back</button><button class="pv-sound" id="pvSound" type="button" aria-pressed="${soundOn()}" aria-label="Sound">${soundOn() ? SPK : SPK_OFF}</button>
      <span class="pv-ctl"><button id="pvPrev" type="button" aria-label="Previous">‹</button><span class="pv-pos" id="pvPos"></span><button id="pvNext" type="button" aria-label="Next">›</button></span></div>
    <div class="pv-bar"><i id="pvBar"></i></div>
    <div class="pv-track" id="pvTrack">${W.map((w, n) => { const P = picsOf(w), ld = n < 3 ? "eager" : "lazy"; return `<div class="pv-slide" data-n="${n}">
      <button class="pv-photo${/irasutoya/.test(P[0].page || "") ? " illust" : ""}" type="button" data-n="${n}" aria-label="Hear ${esc(w.word)}"><img class="pv-bg" src="${picSrc(P[0].img)}" alt="" aria-hidden="true" loading="${ld}"><img class="pv-fg" src="${picSrc(P[0].img)}" alt="${esc(w.word)}" loading="${ld}"></button>
      ${P.length > 1 ? `<div class="pv-thumbs">${P.map((p, k) => `<button class="pv-thumb${k ? "" : " on"}" type="button" data-src="${esc(p.img)}" aria-label="Photo ${k + 1} of ${P.length}"><img src="${picSrc(p.img)}" alt="" loading="lazy"></button>`).join("")}</div>` : ""}
      <div class="pv-word"><b class="${w.word.length > 5 ? (w.word.length > 9 ? "longer" : "long") : ""}">${esc(w.word)}</b>${w.reading && w.reading !== w.word ? `<span class="pv-rd">${esc(w.reading)}</span>` : ""}<span class="pv-en">${esc(P[0].capEn || clean(w.en))}</span>${P[0].cap && P[0].cap !== w.word ? `<span class="pv-rei" role="button" tabindex="0">例：${esc(P[0].cap).replace(esc(w.word), `<em>${esc(w.word)}</em>`)}${P[0].exEn ? `<span class="pv-rei-en">${esc(P[0].exEn)}</span>` : ""}</span>` : ""}</div></div>`; }).join("")}</div>
  </section>`;
  const tr = $("#pvTrack"), slides = [...tr.querySelectorAll(".pv-slide")]; let i = 0, dragX = null, startLeft = 0, dragged = false;
  const mark = n => { i = n; $("#pvPos").textContent = `${i + 1} / ${W.length}`; $("#pvBar").style.width = `${(i + 1) / W.length * 100}%`;
    $("#pvPrev").disabled = i === 0; $("#pvNext").disabled = i === W.length - 1; };
  const go = n => { n = Math.max(0, Math.min(W.length - 1, n));
    slides[n].scrollIntoView({behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", inline: "start", block: "nearest"}); mark(n); };
  const io = new IntersectionObserver(es => es.forEach(e => { if(e.isIntersecting) mark(+e.target.dataset.n); }), {root: tr, threshold: .6});
  slides.forEach(s => io.observe(s));
  tr.addEventListener("click", e => { if(dragged){ dragged = false; return; }
    const t = e.target.closest(".pv-thumb");
    if(t){ const sl = t.closest(".pv-slide");   // switch this word's big photo
      sl.querySelectorAll(".pv-photo img").forEach(im => im.src = picSrc(t.dataset.src));
      sl.querySelectorAll(".pv-thumb").forEach(x => x.classList.toggle("on", x === t)); return; }
    const b = e.target.closest(".pv-photo"); if(!b) return;
    const n = +b.dataset.n;
    if(n !== i){ go(n); return; }
    b.animate([{transform:"scale(1)"},{transform:"scale(.97)"},{transform:"scale(1)"}], {duration:220, easing:"cubic-bezier(.2,.8,.2,1)"});   // press feedback
    if(soundOn()) speak(W[n].word); });
  $("#pvSound").onclick = () => { const on = !soundOn(); store.set("jc:sound", on);
    $("#pvSound").innerHTML = on ? SPK : SPK_OFF; $("#pvSound").setAttribute("aria-pressed", on); };
  tr.addEventListener("pointerdown", e => { if(e.pointerType !== "mouse") return; dragX = e.clientX; startLeft = tr.scrollLeft; dragged = false; });
  tr.addEventListener("pointermove", e => { if(dragX === null) return; const dx = e.clientX - dragX;
    if(!dragged && Math.abs(dx) > 6){ dragged = true; tr.style.scrollSnapType = "none"; tr.setPointerCapture(e.pointerId); }
    if(dragged) tr.scrollLeft = startLeft - dx; });
  tr.addEventListener("pointerup", e => { if(dragX === null) return; const dx = e.clientX - dragX; dragX = null;
    if(dragged){ tr.style.scrollSnapType = ""; go(Math.abs(dx) > 60 ? i + (dx < 0 ? 1 : -1) : i); } });
  $("#pvPrev").onclick = () => go(i - 1); $("#pvNext").onclick = () => go(i + 1);
  const keys = e => { if(!document.body.contains(tr)){ removeEventListener("keydown", keys); return; }
    if(e.key === "ArrowRight") go(i + 1); if(e.key === "ArrowLeft") go(i - 1); };
  addEventListener("keydown", keys);
  $("#pvBack").onclick = () => { (C.key.startsWith("ira_") || /^x/.test(C.key) ? renderIllust : renderPictures)(); scrollTo(0, 0); };
  const pv = document.querySelector(".pv"); pv.classList.toggle("extra", /^x/.test(C.key));
  tr.addEventListener("click", e => { const r = e.target.closest(".pv-rei"); if(r){ e.stopPropagation(); r.classList.toggle("show"); } }, true);
  mark(0);
}

/* ---------- Reading ---------- */
let STORIES = null;
/* Reading = a library: shelves of books, every book works the same (learn cards -> read -> tap a word) */
const SHELVES = [["article","記事","Articles","記"],["news","ニュース","News","報"],["novel","小説","Novels","小"],["story","物語","Short stories","物"],["literature","文学","Literature","文"]];
/* 文庫本 look: paper covers in slightly different tones; colour only on the spine + mark (muted traditional colours) */
const SPINE = {article:"#3A4F6B", news:"#66683A", novel:"#7A3E3E", story:"#3E3B38"};   // 藍 / 鶯 / 小豆 / 墨
const PAPER = ["var(--pp1)","var(--pp2)","var(--pp3)","var(--pp4)"];
let READ_INDEX = null;
async function readIndex(){
  if(!READ_INDEX){ try{ READ_INDEX = await (await fetch("data/readings/index.json", {cache:"no-cache"})).json(); }catch(e){ READ_INDEX = []; } }
  // News: newest first (by publish date); other shelves keep their order
  READ_INDEX.sort((a, b) => (a.shelf === "news" && b.shelf === "news") ? (b.date || "").localeCompare(a.date || "") : 0);
  return READ_INDEX;
}
function bookHTML(x){
  const mins = Math.max(1, Math.round(x.chars / 400));
  // the picture is the cover; without a free image, a typographic cover (the title's first kanji)
  const first = (x.title.match(/[\u4e00-\u9fff]/) || [x.title[0]])[0];
  return `<button class="book" data-prelearn="${x.id}" aria-label="${esc(x.title)}">
    <span class="bk-cover">${x.img ? `<img src="data/readings/${x.img}" alt="" loading="lazy">` : `<span class="bk-type">${esc(first)}</span>`}</span>
    <b class="bk-t">${esc(x.title)}</b>
    <span class="bk-meta">${x.date ? `${+x.date.slice(5, 7)}/${+x.date.slice(8, 10)} · ` : ""}${x.counts[0]}語 · ${mins}分</span>
  </button>`;
}
async function renderReading(){
  document.body.classList.remove("playing");
  READ_INDEX = null; const RD = await readIndex();
  $("#pageTitle").textContent = "Reading";
  // level 1: the sections only; each shows a small fan of its OWN covers (styles never mix)
  $("#list").innerHTML = `<section class="library">
    <button class="sec-row rdt-row" id="rdtOpen"><span class="sec-row-t"><b>読解テスト</b><span>JLPT-style reading tests</span></span><span class="sec-row-go" aria-hidden="true">›</span></button>
    <div class="sec-rows" id="secRows">${shelfOrder().filter(([k]) => RD.some(x => (x.shelf || "article") === k)).map(([k, jp, en]) => {
      const items = RD.filter(x => (x.shelf || "article") === k), fan = items.filter(x => x.img).slice(0, 3);
      return `<button class="sec-row" data-shelf="${k}">
        <span class="sec-row-t"><b>${jp}</b><span>${en}</span><em>${items.length} books</em></span>
        <span class="fan">${fan.map((x, i) => `<img src="data/readings/${x.img}" alt="" style="--i:${i}" loading="lazy">`).join("")}</span>
        <span class="sec-row-go" aria-hidden="true">›</span></button>`; }).join("")}</div>
  </section>`;
  document.querySelectorAll("[data-shelf]").forEach(b => b.onclick = () => { if(SEC_DRAG.justDropped) return; renderShelf(b.dataset.shelf); scrollTo(0, 0); });
  $("#rdtOpen").onclick = () => { renderReadTests(); scrollTo(0, 0); };
  secReorder($("#secRows"));
}
/* his order of the Reading sections (press-and-hold + drag); saved per device */
function shelfOrder(){
  const o = store.get(K.shelfOrder, []);
  const rank = k => { const i = o.indexOf(k); return i < 0 ? 99 + SHELVES.findIndex(s => s[0] === k) : i; };
  return [...SHELVES].sort((a, b) => rank(a[0]) - rank(b[0]));
}
const SEC_DRAG = {justDropped: false};
function secReorder(box){
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
async function renderShelf(k){
  const RD = await readIndex(), [, jp, en] = SHELVES.find(s => s[0] === k), items = RD.filter(x => (x.shelf || "article") === k);
  $("#pageTitle").textContent = jp;
  $("#list").innerHTML = `<section class="library">
    <div class="story-top"><button class="nav-btn" id="shelfBack" data-back="Reading">Back</button></div>
    <h2 class="sec-title">${jp}<em>${en}</em><small>${items.length} books</small></h2>
    <div class="shelf-grid">${items.map(x => bookHTML(x)).join("")}</div></section>`;
  $("#shelfBack").onclick = () => { renderReading(); scrollTo(0, 0); };
}
async function renderStory(id){
  let st; try{ st = await (await fetch(`data/stories/${id}.json`, {cache:"no-cache"})).json(); }catch(e){ return; }
  $("#pageTitle").textContent = st.title;
  $("#list").innerHTML = `<section class="reading story">
    <div class="story-top"><button class="nav-btn" id="storyBack" data-back="Reading">Back</button>${sayBtn(st.sentences.map(x=>x.jp).join(""))}</div>
    <div class="story-meta">${st.level} · ${esc(st.source)}</div>
    ${st.sentences.map(x => `<div class="ex story-line">${sayBtn(x.jp)}<span class="jpline">${esc(x.jp)}</span><div class="tr">${esc(x.en)}</div></div>`).join("")}
  </section>`;
  $("#storyBack").onclick = () => { $("#pageTitle").textContent = "Reading"; renderReading(); };
}

function famBar(lvl, t, no){
  const f = Math.max(0, Math.min(5, (store.get(profileKey(lvl, t, no), {familiarity:0}).familiarity || 0))) / 5;
  return `<div class="fam" style="--f:${f}" aria-label="familiarity ${Math.round(f*5)} of 5"><i></i></div>`;
}

function dotsOrButtons(type,no){

  if(!PLAY)
    return famBar(CARD_LVL || (DATA && DATA.level), type, no);

  return "";

}


let PLAY = false, CURRENT = "home";

let PG_RUNNING = false;
let PG_RETURN = null;   // {label, go}: where Practice goes back to when it was opened from a reading or a section
function leavePracticeTo(id, render){ pgDockDrop(); PLAY = false; PG_RUNNING = false; CURRENT = id; document.body.classList.remove("playing");
  document.querySelector(".tabs").hidden = true; const r = PG_RETURN; PG_RETURN = null; render(); }


setInterval(
  () => {

    if(PLAY && document.querySelector("#list .play-empty"))   // only the "come back later" screen; never reset a card on screen
      renderPG();

  },
  30000
);


/* =========================================================
   NORMAL RENDER
   ========================================================= */

function render(){

  document
    .querySelectorAll(".tab")
    .forEach(
      el =>
        el.classList.toggle(
          "on",
          el.dataset.t === TAB
        )
    );


  $("#filter").textContent =
    ONLY_WEAK
      ? "Weak only"
      : "All";


  $("#filter").classList.toggle(
    "on",
    ONLY_WEAK
  );


  if(!DATA)
    return;


  let items =
    DATA[TAB];


  if(ONLY_WEAK){

    items =
      items.filter(
        c =>
          store
            .get(
              dotsKey(
                TAB,
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
  }[TAB];


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
    `${DATA.level} Day ${DATA.day} · ${items.length} cards`;

}


/* =========================================================
   CLICK HANDLING
   ========================================================= */

document.addEventListener(
  "click",
  e => {

    const say = e.target.closest(".say");
    if(say){ e.stopPropagation(); sayOff(); speak(say.dataset.say); if(say.classList.contains("say-i") && PLAYER.src && !PLAYER.src.startsWith("data:")){ SAY_ON = say; say.classList.add("playing"); } return; }

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

      TAB =
        tab.dataset.t;


      store.set(
        "jc:tab",
        TAB
      );


      if(CURRENT === "complete"){ NAV_SAME = true; renderComplete(); }
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
$("#goHome").onclick = () => { NAV_DIR = "back"; const b = $("#list [data-back]"); if(b){ b.click(); scrollTo(0, 0); return; } store.set("jc:lesson","home"); pick("home"); };
const syncBack = () => { const b = $("#list [data-back]"); $("#goHome").textContent = "‹ " + (b ? b.dataset.back : "Home"); };
new MutationObserver(() => { syncBack(); syncHeaderAction(); }).observe($("#list"), {childList: true});
/* page swap: every full page change goes through #list.innerHTML; the old page eases out while the new one eases in.
   Forward = new page from the right; back (header back / swipe) = from the left. */
let NAV_DIR = "fwd", SWIPE_FROM = 0, NAV_SAME = false;   // NAV_SAME: same page redrawn in place, no page transition
(() => {
  const LIST = $("#list"), d = Object.getOwnPropertyDescriptor(Element.prototype, "innerHTML");
  Object.defineProperty(LIST, "innerHTML", {get(){ return d.get.call(this); }, set(v){
    const dir = NAV_DIR, from = SWIPE_FROM, same = NAV_SAME; NAV_DIR = "fwd"; SWIPE_FROM = 0; NAV_SAME = false;
    const had = LIST.firstElementChild, practice = document.body.classList.contains("playing") || /play-screen/.test(v) || (had && had.classList && (had.classList.contains("play-screen") || !!had.querySelector(":scope > .play-screen")));
    if(calmMotion() || !had || practice || same){ d.set.call(this, v); return; }
    const r = LIST.getBoundingClientRect(), ghost = LIST.cloneNode(true);
    ghost.removeAttribute("id"); ghost.querySelectorAll("[id]").forEach(x => x.removeAttribute("id"));
    Object.assign(ghost.style, {position:"fixed", left: r.left + "px", top: r.top + "px", width: r.width + "px", margin:"0", pointerEvents:"none", zIndex:"0", transform:""});
    document.body.appendChild(ghost);
    d.set.call(this, v);
    const w = Math.min(innerWidth, 900), out = dir === "back" ? w * .35 : -w * .18, inn = dir === "back" ? -w * .12 : w * .22;
    ghost.animate([{transform:`translateX(${from}px)`, opacity:1},{transform:`translateX(${dir === "back" ? Math.max(from, out) : out}px)`, opacity:0}],
      {duration:360, easing:"cubic-bezier(.4,0,.2,1)", fill:"forwards"}).onfinish = () => ghost.remove();
    LIST.animate([{transform:`translateX(${inn}px)`, opacity:0},{transform:"none", opacity:1}], {duration:440, delay:40, easing:"cubic-bezier(.2,.8,.2,1)", fill:"backwards"});
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
    ok = e.touches.length === 1 && CURRENT !== "home" && (inRun() || inFilm() || (!$("#top").hidden && !document.body.classList.contains("cinema") && !e.target.closest(".play-screen"))) &&
      !e.target.closest(".pv-track,.home-rail,input,select,textarea,.sec-rows.sorting,.reader,.seg,.th-seek,.pg-sheet"); }, {passive: true});
  addEventListener("touchmove", e => { if(!ok) return; const t = e.touches[0]; dx = t.clientX - x0; const dy = t.clientY - y0;
    if(!drag){ if(Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)){ ok = false; return; } if(dx > 14 && dx > Math.abs(dy) * 1.4) drag = true; else return; }
    if(e.cancelable) e.preventDefault();   // horizontal swipe: keep the page still (no scroll, no drag)
  }, {passive: false});
  addEventListener("touchend", () => { if(!ok || !drag){ ok = false; return; } ok = false;
    const v = dx / Math.max(1, Date.now() - t0), go = dx > innerWidth * .25 || (v > .4 && dx > 50);
    const l = L();
    if(go && inRun()){ NAV_DIR = "back"; $("#pgBack").click(); return; }
    if(go && inFilm()){ $(".th-exit").click(); return; }
    if(go){ NAV_DIR = "back"; $("#goHome").click(); }
  }, {passive: true});
})();


/* =========================================================
   FILTER
   ========================================================= */

$("#filter").onclick =
  () => {

    ONLY_WEAK =
      !ONLY_WEAK;


    store.set(
      "jc:weak",
      ONLY_WEAK
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
          INDEX[0]?.id || ""
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

function pick(id){
  pgDockDrop(); pgSheetClose(true); if(!KEEP_SETTINGS) closeSettingsSheet(true); document.body.classList.remove("cinema");
  if(id !== "playground") PG_RETURN = null;
  PG_NEW = false; SESS_EDIT = null;
  if(typeof stopStory === "function" && STORY.cont) stopStory();

  PLAY =
    id === "playground";

  PG_RUNNING = false;
  CURRENT = id;

  const T2 = (j, e) => `${j}<small class="pt-en">${e}</small>`;
  const titles = {settings:"Settings", home:"", playground:"Practice", complete:"Complete list", reading:"Reading", novels:"Movies", scenes:"Scenes", photos:"Photos", explore:"Explorer", sections:"Sections", useit:"Use it", pictures:"Pictures", illust:"Illustrations", listening:"Listening", vocab:"Vocab & Grammar"};
  const lessonName = (INDEX.find(x => x.id === id) || {});
  $("#pageTitle").innerHTML = id in titles ? titles[id] : `${lessonName.level||""} · Day ${lessonName.day||""}`;

  $("#top").hidden = id === "home";
  document.querySelector(".tabs").hidden = id in titles;   // Complete list has its own tabs in the page
  $("#filter").hidden = true;
  $("#ver").hidden = true;   // version lives in Settings only
  $("#famToggle").hidden = true;   // moved to Settings
  const showFam = store.get("jc:showfam", false);
  document.body.classList.toggle("showfam", showFam);
  $("#famToggle").setAttribute("aria-pressed", showFam);

  if(PLAY)
    renderPG();

  else if(id === "home")
    renderHome();

  else if(id === "settings")
    renderSettings();

  else if(id === "complete")
    renderComplete();

  else if(id === "reading")
    renderReading();

  else if(id === "novels")
    renderNovels();

  else if(id === "scenes"){
    SCENE_DIR = "scenes"; renderScenes(); }

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
    SCENE_DIR = "photos"; renderScenes(); }

  else if(id === "explore"){
    SCENE_DIR = "explore";
    fetch("data/explore/index.json", {cache:"no-cache"}).then(r => r.json()).then(x => renderScene(x.start)).catch(() => {}); }

  else
    load(id);

}


/* =========================================================
   LOAD LESSON
   ========================================================= */

async function load(id){

  try{

    const r =
      await fetch(
        `data/${id}.json`,
        {
          cache:"no-cache"
        }
      );


    DATA =
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

    INDEX =
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
      INDEX
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

