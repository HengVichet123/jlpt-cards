import { defineConfig, type Plugin } from "vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { cpSync, existsSync } from "node:fs";
import { resolve } from "node:path";

// Files the app loads at runtime by URL. They stay where they are (content scripts in
// personal/japanese write into data/), and are copied next to the built app.
const STATIC = ["data"];   // small static files (icons, manifest, sw.js, vendor, scene3d.js) live in public/

const copyStatic = (): Plugin => ({
  name: "copy-static",
  apply: "build",
  closeBundle() {
    for (const p of STATIC) if (existsSync(p)) cpSync(p, resolve("dist", p), { recursive: true });
  },
});

export default defineConfig({
  base: "/jmp/",
  plugins: [react(), tailwindcss(), copyStatic()],
  build: { outDir: "dist", emptyOutDir: true, target: "es2020" },
  server: { host: true },
});
