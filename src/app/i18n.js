/* app/i18n.js: part of the app split out of the old single file (v166). Imports generated from use. */
import { store } from "../data/store";
import { $ } from "../app/core.js";

export const tr = t => (isJa() && jaText(t)) || t;
/* ---------- Settings: appearance, voice, list options (saved on this device) ---------- */
export const JA = {"Home":"ホーム","Back":"戻る","Study":"学習","Side projects":"寄り道","Playground":"練習","Practice":"練習","Sound":"音声","Listen":"聞く","Pause":"一時停止","Complete list":"一覧","Reading":"読解","Books":"本","JLPT":"JLPT","Reading tests":"読解テスト",
  "Settings":"設定","Novels":"名作","Movies":"映画","Library":"ライブラリ","Listening":"聴解","Vocab & Grammar":"言語知識","言語知識 tests":"言語知識テスト","Tests with audio":"音声つきテスト","Sessions":"セッション","Pictures":"図鑑","Illustrations":"イラスト","Sections":"分野","Use it":"使う","Scenes":"情景","Photos":"写真","Explorer":"探検","Business":"ビジネス",
  "Appearance":"表示","Auto":"自動","Light":"ライト","Dark":"ダーク","Voice":"音声","Japanese voice":"端末の声","Slow":"ゆっくり","Normal":"ふつう",
  "Familiarity bars":"習熟度バー","Practice answer":"練習の答え","Continue":"続きから","New session":"新しいセッション","Start":"始める","Review due":"復習","Quick 10":"クイック10","Done":"完了","Cancel":"キャンセル","Undo":"元に戻す","Name":"名前","Edit":"編集","Save":"保存","Delete session":"セッションを削除","Delete":"削除","Keep":"残す","Short":"簡潔","Full":"詳細","Language":"言語","With English":"英語あり","Japanese only":"日本語のみ","Recorded voice":"収録音声","Cards":"カード","Device voice":"端末の声","Your phone's own voice":"スマホ本体の声",
  "Level":"レベル","From":"範囲","All cards":"すべて","Section":"分野","Cards per session":"1回の枚数","Words":"単語","Kanji":"漢字","Grammar":"文法","ALL":"全部",
  "Again":"もう一度","Hard":"難しい","Easy":"簡単","3 min":"3分","10 min":"10分","1 day":"1日","Cards":"カード","Start":"始める","Photo credits":"写真の出典",
  "Study this section":"この分野を練習","Study these":"練習する","Read 本文":"本文を読む","Session complete":"今日はここまで","All cards are resting.":"すべてのカードが休憩中です。",
  "Play 現像":"再生 現像","Recorded voice: Microsoft Nanami. Words without a recording use the device voice above.":"収録音声：Microsoft Nanami。収録のない語は端末の声で読みます。","Show all":"すべて表示","Learn, then read":"覚えてから読む","Start with new cards":"新しいカードから始める"};
export const JA_RX = [
  [/^(\d+) cards$/, "$1枚"], [/^(\d+) books$/, "$1冊"], [/^(\d+) words$/, "$1語"], [/^(\d+) new left$/, "未学習 $1"],
  [/^Start · (\d+) cards$/, "始める・$1枚"], [/^(\d+) cards? ready to review$/, "復習 $1枚"], [/^Next review in (\d+) min$/, "次の復習まで $1分"],
  [/^Next review in (\d+) h$/, "次の復習まで $1時間"], [/^Next review in (\d+) d$/, "次の復習まで $1日"], [/^to go$/, "枚 残り"], [/^(\d+) coming back$/, "あとで $1枚"],
  [/^Female · (.+)$/, "女性・$1"], [/^Male · (.+)$/, "男性・$1"],
  [/^(\d+) words · (\d+) kanji · (\d+) grammar$/, "単語 $1・漢字 $2・文法 $3"], [/^[A-Za-z &]+ · (\d+)$/, "$1語"], [/^‹ (.+)$/, m => "‹ " + (JA[m.slice(2)] || m.slice(2))]];
export const isJa = () => store.get("jc:lang", "en") === "ja";
export function jaText(t){ const k = t.trim(); if(!k) return null;
  if(JA[k]) return t.replace(k, JA[k]);
  for(const [rx, to] of JA_RX) if(rx.test(k)) return t.replace(k, typeof to === "function" ? to(k) : k.replace(rx, to));
  return null; }
export function jaWalk(root){
  if(!isJa() || !root) return;
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let n;
  while((n = w.nextNode())){ if(n.parentNode && n.parentNode.closest("select,option,textarea,script,style")) continue;   // never touch form values
    const r = jaText(n.nodeValue); if(r !== null && r !== n.nodeValue) n.nodeValue = r; }
}
export function applyLang(){
  const ja = isJa(); document.body.classList.toggle("ja", ja); document.documentElement.lang = ja ? "ja" : "en";
  jaWalk(document.querySelector("header")); jaWalk($("#list"));
}
