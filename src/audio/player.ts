/* The one <audio> element the app plays through (word audio, novel lines, listening tests).
   One element keeps iPhone's audio session unlocked after the first tap. */
export const PLAYER = new Audio();
PLAYER.preload = "auto";
PLAYER.setAttribute("playsinline", "");

export const PLAY_ICO = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M7 5v14l12-7z" fill="currentColor"/></svg>';
export const PAUSE_ICO = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M7 5h4v14H7zM13 5h4v14h-4z" fill="currentColor"/></svg>';
