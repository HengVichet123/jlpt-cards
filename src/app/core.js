/* app/core.js: part of the app split out of the old single file (v166). Imports generated from use. */
import { migrate } from "../data/store";

migrate();


/* =========================================================
   APP VERSION
   ========================================================= */

export const APP_VERSION = "v179";


/* =========================================================
   HELPERS
   ========================================================= */

export const $ = s =>
  document.querySelector(s);


export const esc = s =>
  String(s ?? "").replace(
    /[&<>"]/g,
    c => ({
      "&":"&amp;",
      "<":"&lt;",
      ">":"&gt;",
      '"':"&quot;"
    }[c])
  );


export function hl(text,targets){

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
