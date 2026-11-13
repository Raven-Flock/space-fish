// Copies the files GitHub Pages serves today from the repo root into dist/,
// byte for byte, and writes dist/404.html from the built index.html.
// R0 keeps every served path the same as live 69cf5be (minus the old bundle in assets/).
import { cpSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const DIST = join(ROOT, "dist");
const STATIC = [
  ".nojekyll",
  "favicon.svg",
  "og.jpg",
  "sw.js",
  "README.md",
  "music",
  "opening",
  "rim",
  "sprites",
];

for (const p of STATIC) {
  const from = join(ROOT, p);
  if (!existsSync(from)) throw new Error(`copy-static: missing ${p} at repo root`);
  cpSync(from, join(DIST, p), { recursive: true, dereference: true });
}

// Live serves a pre-rendered 404.html that points at /space-fish/assets/...
// Here it is the built shell with absolute asset URLs, so deep links still boot the game.
const index = readFileSync(join(DIST, "index.html"), "utf8");
const notFound = index
  .replace(/(href|src)="\.\/(assets\/[^"]+)"/g, '$1="/space-fish/$2"')
  .replace(/href="favicon\.svg"/, 'href="/space-fish/favicon.svg"');
writeFileSync(join(DIST, "404.html"), notFound);
console.log(`copy-static: copied ${STATIC.length} entries, wrote 404.html`);
