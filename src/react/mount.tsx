/* React screens inside the (still mostly legacy) app.
   A screen draws into a fresh <div> placed in #list, exactly where the old innerHTML pages go,
   so page switching, swipe back, page animations and Japanese-only mode keep working around it.
   When other code replaces #list's content, the screen is unmounted automatically. */
import type { ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { flushSync } from "react-dom";

let current: { root: Root; host: HTMLElement; key: string } | null = null;

function unmountCurrent() {
  if (!current) return;
  const c = current; current = null;
  queueMicrotask(() => c.root.unmount());   // never unmount during React's own render
}

// Whenever #list loses the React host (legacy page drawn over it), unmount that screen.
let watching = false;
function watch(list: HTMLElement) {
  if (watching) return; watching = true;
  new MutationObserver(() => { if (current && !list.contains(current.host)) unmountCurrent(); })
    .observe(list, { childList: true });
}

/** Show a React screen in #list. Same `key` as the screen already there = update it in place
    (keeps its state, no page slide) and return true; otherwise replace the page (with the slide). */
export function renderScreen(list: HTMLElement, key: string, node: ReactNode): boolean {
  if (current && current.key === key && list.contains(current.host)) {
    const r = current.root; flushSync(() => r.render(node)); return true;
  }
  mountScreen(list, node, key); return false;
}

/** Replace the page content with a React screen. Draws synchronously, like innerHTML did. */
export function mountScreen(list: HTMLElement, node: ReactNode, key = ""): void {
  unmountCurrent();
  list.innerHTML = '<div class="rx-screen"></div>';   // through innerHTML on purpose: the app's page-slide animation hooks it
  const host = list.firstElementChild as HTMLElement;
  watch(list);
  const root = createRoot(host);
  current = { root, host, key };
  flushSync(() => root.render(node));
}
