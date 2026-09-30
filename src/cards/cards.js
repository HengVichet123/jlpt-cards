/* cards/cards.js: part of the app split out of the old single file (v166). Imports generated from use. */
import { St } from "../app/state";
import { store } from "../data/store";
import { esc, hl } from "../app/core.js";
import { pgUndo, profileKey } from "../app/practice.js";
import { sayIcon, soundOn, speak } from "../audio/speech.js";
import { tr } from "../app/i18n.js";
   // app text in Japanese-only mode (what jaWalk does to plain pages)


/* =========================================================
   GLOBAL STATE
   ========================================================= */






/* =========================================================
   DOTS
   ========================================================= */

export function dotsKey(type,no){

  return `jc:dots:${St.DATA.level}:${type}:${no}`;

}


export function dotsHTML(type,no){

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
export function exLine(e, target){
  const src = e.url ? ` <a class="exsrc" href="${esc(e.url)}" target="_blank" rel="noopener" onclick="event.stopPropagation()">${e.src && e.src.startsWith("Wikipedia") ? "Wikipedia" : esc(e.src || "source")}</a>` : "";
  return `<div class="ex exc"><span class="rei">例：</span>${hl(e.jp, target)}${e.en || src ? `<div class="tr">${e.en ? esc(e.en) : ""}${src}</div>` : ""}</div>`;
}

export function exHTML(e,targets){


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


export function srcLine(label,url){

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
export function defHTML(text, target){
  return `<div class="jp">${hl(text, target)}</div>`;
}

export function wordCard(c){

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

export function kanjiCard(c){

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

export function grammarCard(c){

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

export function card(
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

export const calmMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
export function unfoldBack(back){   // paper unfold: the answer hangs from the fold under the headword and swings down flat
  if(!back || calmMotion()) return;
  back.animate([{transform:"perspective(900px) rotateX(-88deg)", opacity:.35},
                {transform:"perspective(900px) rotateX(8deg)", opacity:1, offset:.72},
                {transform:"perspective(900px) rotateX(0deg)", opacity:1}],
               {duration:520, delay:60, easing:"cubic-bezier(.22,.9,.3,1)", fill:"backwards"});
  back.animate([{boxShadow:"inset 0 60px 40px -30px rgba(0,0,0,.18)"},{boxShadow:"inset 0 0 0 0 rgba(0,0,0,0)"}],
               {duration:560, delay:60, easing:"ease-out", fill:"backwards"});
}
export function foldBack(back, done){   // fold the paper back up under the headword, then continue
  if(!back || calmMotion()){ done(); return; }
  back.animate([{transform:"perspective(900px) rotateX(0deg)", opacity:1},{transform:"perspective(900px) rotateX(-88deg)", opacity:.2}],
               {duration:240, easing:"cubic-bezier(.5,0,.75,0)"}).onfinish = done;
}
export function flipCard(card, open){
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
/* ===== Cards outside Playground: MINI by default, tap = full card, tap its top = back to mini =====
   MINI.reg holds the card objects so any list (Complete list, sections, readings) can swap mini <-> full. */
export const MINI = {reg: new Map()};
export const miniKey = (t, lv, no) => `${t}:${lv}:${no}`;
export function miniCard(c, lv){ return miniFor("words", c, lv); }
export function miniFor(t, c, lv){
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
export function peekFor(t, c){   // the short meaning + first example shown under a closed card in lists
  let en = "", e = null, target = "";
  if(t === "words"){ en = (c.en || "").split(" / ")[0]; e = (c.ex && c.ex[0]) || c.use; target = c.word; }
  else if(t === "kanji"){ en = c.en || ""; const w = (c.words || [])[0]; e = w ? {jp: `${w.w}（${w.r}）${w.m ? ": " + w.m : ""}`} : null; target = c.kanji; }
  else { en = c.en || ""; e = (c.rei || [])[0]; target = c.variants || c.pattern; }
  return `<div class="card-peek">${en ? `<span class="mini-en">${esc(en)}</span>` : ""}${e ? `<span class="mini-ex">${t === "kanji" ? esc(e.jp) : `<span class="rei">例：</span>${hl(e.jp, target)}`}</span>` : ""}</div>`;
}
export function shortAnswer(t, c, html){   // Settings → Answer: Short = reveal only the meaning + one example (the mini card's content)
  if(store.get("jc:answer", "full") !== "short") return html;
  const i = html.indexOf('<div class="back">');
  return html.slice(0, i) + `<div class="back back-short">${peekFor(t, c)}</div></div>`;
}
export function cardFront(t, c, lv){   // closed list card: identical front to the opened card, no answer part
  MINI.reg.set(miniKey(t, lv, c.no), c); St.CARD_LVL = lv;
  const html = {words:wordCard, kanji:kanjiCard, grammar:grammarCard}[t](c), i = html.indexOf('<div class="back">');
  return html.slice(0, i).replace(/class="card (\w)"/, `class="card $1 list-card" data-mt="${t}" data-mlv="${lv}" tabindex="0" role="button"`) + peekFor(t, c) + "</div>";
}
export function fullFor(t, c, lv){
  St.CARD_LVL = lv;
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
    if(text && St.AUDIO_MAP && St.AUDIO_MAP[text]){ e.stopPropagation(); e.preventDefault(); word.animate([{transform:"scale(.97)"},{transform:"none"}], {duration:180}); speak(text); return; } }
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

export function famBar(lvl, t, no){
  const f = Math.max(0, Math.min(5, (store.get(profileKey(lvl, t, no), {familiarity:0}).familiarity || 0))) / 5;
  return `<div class="fam" style="--f:${f}" aria-label="familiarity ${Math.round(f*5)} of 5"><i></i></div>`;
}

export function dotsOrButtons(type,no){

  if(!St.PLAY)
    return famBar(St.CARD_LVL || (St.DATA && St.DATA.level), type, no);

  return "";

}
