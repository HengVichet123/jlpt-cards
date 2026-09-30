/* App-wide state shared by the page switcher, Practice, cards and screens (was 28 top-level variables). */
import { store } from "../data/store";

export const St: Record<string, any> = {
  INDEX: [], DATA: null,
  TAB: new URLSearchParams(location.search).get("tab") || store.get("jc:tab", "words"),   // Words / Kanji / Grammar tab
  ONLY_WEAK: store.get("jc:weak", false),
  SECTIONS: null, READ_INDEX: null, STORIES: null, NOVELS: null, EXTRA_IDX: null,   // loaded once
  PLAY: false, CURRENT: "home",                     // current page id
  PG_RUNNING: false, PG_RETURN: null, PG_NEW: false, SESS_EDIT: null, SESS_UNDO: null, SESS_ALL: false,   // Practice
  KEEP_SETTINGS: false, SETTINGS_CLOSING: false,    // Settings sheet
  CARD_LVL: null,                                   // level of the card being drawn
  AUDIO_MAP: null, AUDIO_NOW: null, VOICES: [], SAY_ON: null,   // sound
  SCENE_DIR: "scenes",                              // Scenes = flat pictures; Explorer = zoomable places; Photos
  NAV_DIR: "fwd", SWIPE_FROM: 0, NAV_SAME: false,   // page slide: direction, swipe offset, "same page redrawn"
};
