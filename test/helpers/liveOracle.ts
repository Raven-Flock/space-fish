// The differential oracle: the exact game bundle GitHub Pages serves today
// (assets/index-9xaohcOn.js at the repo root, main 1c9c028), loaded in Node.
// It is one self-contained Vite bundle (React inlined), so the loader:
//   1. refuses any bytes but the pinned sha256,
//   2. drops the modulepreload polyfill and the final hydrateRoot() call,
//   3. swaps the bundled React and JSX runtime for the test's react and
//      react/jsx-runtime (one React copy, so hooks and renderToString work),
//   4. exports the internals tests drive, by their minified names.
// Every edit is an exact-string anchor that must match exactly once, so a
// different bundle can never be patched by accident.
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = join(HERE, "..", "..");
export const LIVE_COMMIT = "1c9c028";
export const LIVE_CHUNK = join(REPO_ROOT, "assets", "index-9xaohcOn.js");
/** sha256 of the live 1c9c028 bundle (283,526 bytes); the oracle refuses any other bytes. */
export const LIVE_CHUNK_SHA256 = "f9d17fdbd5208677b00c5059d95cbcd1f93e47f8f53fed0fb2d62003a283f019";

const PRELOAD_START = "(function(){let e=document.createElement(`link`).relList;";
const PRELOAD_END = "fetch(e.href,n)}})();";
const EDITS: Array<[string, string]> = [
  // bundled React + react-dom/client -> the test's react (react-dom/client is only used by hydrate)
  ["n(),t.exports=s()})),l=n(),u=c(),d=`spacefish-v1`", "n(),t.exports=s()})),l=__react,u=null,d=`spacefish-v1`"],
  // bundled react/jsx-runtime -> the test's
  ["k=e(((e,t)=>{t.exports=Ne()}))();function Pe(", "k=__jsx;function Pe("],
  // no auto-mount
  [
    "(0,l.startTransition)(()=>{(0,u.hydrateRoot)(document.getElementById(`root`),(0,k.jsx)(l.StrictMode,{children:(0,k.jsx)(ze,{})}))});",
    "",
  ],
];
// minified name -> what tests call it
const EXPORTS =
  "export { O as Game, m as AudioDirector, d as SAVE_KEY, f as MUSIC_KEY, Se as BUILD_COST, Te as CUTSCENES, p as initialSnap, Re as SpaceFishApp, ze as Root, Ce as BUILD_LABEL, x as clamp, S as hyp, ae as segmentHitsRect, oe as circleHitsRect, Ae as stickOut, je as phoneTouch, w as FISH, ge as PLAYER };\n";

function once(src: string, needle: string): number {
  const i = src.indexOf(needle);
  if (i < 0 || src.indexOf(needle, i + 1) >= 0) throw new Error(`oracle anchor not unique: ${needle.slice(0, 60)}`);
  return i;
}

export function liveModuleSource(src: string = readFileSync(LIVE_CHUNK, "utf8")): string {
  const sha = createHash("sha256").update(src).digest("hex");
  if (sha !== LIVE_CHUNK_SHA256) throw new Error(`live bundle changed: ${sha}`);
  const a = once(src, PRELOAD_START);
  const b = once(src, PRELOAD_END) + PRELOAD_END.length;
  if (a !== src.indexOf("(function(){") || b <= a) throw new Error("live bundle preload polyfill not recognised");
  src = src.slice(0, a) + src.slice(b);
  for (const [from, to] of EDITS) {
    const i = once(src, from);
    src = src.slice(0, i) + to + src.slice(i + from.length);
  }
  return (
    'import * as __react from "react";\n' +
    'import * as __jsx from "react/jsx-runtime";\n' +
    src +
    "\n" +
    EXPORTS
  );
}

export async function loadLive(): Promise<any> {
  const out = join(REPO_ROOT, "test", ".oracle", "index.live.mjs");
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, liveModuleSource());
  return import(/* @vite-ignore */ out);
}
