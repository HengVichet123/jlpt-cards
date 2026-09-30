import { useLayoutEffect, useState } from "react";

/** A wrapper <div> in <body> for a screen's floating parts (docks, sheets), removed with the screen.
    Not a direct <body> child on purpose: the app's page switcher clears "body > .pg-dock". */
export function useBodyHost(): HTMLElement {
  const [el] = useState(() => { const d = document.createElement("div"); d.className = "rx-float"; return d; });
  useLayoutEffect(() => { document.body.appendChild(el); return () => el.remove(); }, [el]);
  return el;
}
