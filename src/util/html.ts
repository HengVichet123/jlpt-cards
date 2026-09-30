/** Escape text for HTML strings (card HTML and a few hand-built fragments). Same rules as the original app. */
export const esc = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
