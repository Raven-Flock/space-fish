// The differential oracle: the exact game chunk GitHub Pages serves today
// (assets/routes-NYJyl2-8.js at the repo root, main 69cf5be), loaded in Node.
// Its only import is the React/vendor chunk, which is swapped for react and
// react/jsx-runtime, and its internals are exported so tests can drive them.
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = join(HERE, "..", "..");
export const LIVE_CHUNK = join(REPO_ROOT, "assets", "routes-NYJyl2-8.js");
/** sha256 of the live 69cf5be chunk; the oracle refuses any other bytes. */
export const LIVE_CHUNK_SHA256 = "810dd2828e7f1774244b10f5e2cffee44ea486502272fddf2fcb5bb7a0b389ad";

const HEADER = 'import { n as e, r as t, t as n } from "./index-CMaL7jzG.js";';

export async function loadLive(): Promise<any> {
  const src = readFileSync(LIVE_CHUNK, "utf8");
  const sha = createHash("sha256").update(src).digest("hex");
  if (sha !== LIVE_CHUNK_SHA256) throw new Error(`live chunk changed: ${sha}`);
  if (!src.startsWith(HEADER)) throw new Error("live chunk header not recognised");
  const body =
    'import * as __react from "react";\n' +
    'import * as __jsx from "react/jsx-runtime";\n' +
    "const e = () => __react, t = (mod) => mod, n = () => __jsx;\n" +
    src.slice(HEADER.length) +
    "\nexport { p as Game, i as AudioDirector, a as SAVE_KEY, o as BUILD_COST, s as CUTSCENES, f as initialSnap, h as SpaceFishApp, b as Root, _ as BUILD_LABEL, c as clamp, l as hyp, u as segmentHitsRect, d as circleHitsRect, stickOut, phoneTouch };\n";
  const out = join(REPO_ROOT, "test", ".oracle", "routes.live.mjs");
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, body);
  return import(/* @vite-ignore */ out);
}
