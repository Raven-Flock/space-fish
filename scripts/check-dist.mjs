// Guard: the built site must contain only what Pages should serve.
// Fails on source, source maps, env files, package manifests or tests.
import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const DIST = join(process.cwd(), "dist");
const BAD = [
  /\.map$/i,
  /\.tsx?$/i,
  /\.jsx$/i,
  /(^|\/)\.env/i,
  /(^|\/)package(-lock)?\.json$/i,
  /(^|\/)tsconfig.*\.json$/i,
  /(^|\/)(src|test|scripts|node_modules|\.github)\//i,
  /\.test\./i,
  /sourceMappingURL/i,
];

const files = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else files.push(relative(DIST, p).split("\\").join("/"));
  }
})(DIST);

const bad = files.filter((f) => BAD.some((re) => re.test(f)));
if (!files.includes("index.html")) bad.push("(missing index.html)");
if (!files.includes("sw.js")) bad.push("(missing sw.js)");
if (bad.length) {
  console.error("check-dist: refusing to ship:\n  " + bad.join("\n  "));
  process.exit(1);
}
console.log(`check-dist: ${files.length} files OK`);
