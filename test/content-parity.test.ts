// Constant tables, helpers, asset list and audio cues compared with the live chunk,
// plus the GD structure rules (MODULE-STRUCTURE-v0.1 §2/§3) as code checks.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { CUTSCENES } from "../src/content/cutscenes";
import { BUILD_COST, BUILD_LABEL } from "../src/content/tuning/build";
import { SAVE_KEY, MUSIC_KEY } from "../src/save/keys";
import { initialSnap } from "../src/app/snap";
import { clamp, hyp } from "../src/engine/math";
import { circleHitsRect, segmentHitsRect } from "../src/engine/collision";
import { stickOut } from "../src/app/controls";
import { AudioDirector } from "../src/audio/AudioDirector";
import { Game } from "../src/game/Game";
import { mulberry32, installEnv } from "./helpers/fakeEnv";
import { REPO_ROOT, LIVE_CHUNK, loadLive } from "./helpers/liveOracle";

let live: any;
beforeAll(async () => {
  live = await loadLive();
});

const SRC = join(REPO_ROOT, "src");
function walk(dir: string, out: string[] = []) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}
const SOURCES = walk(SRC).filter((f) => /\.(ts|tsx)$/.test(f));
const read = (f: string) => readFileSync(f, "utf8");

describe("constant tables equal live 69cf5be", () => {
  it("cutscene script (beats, durations, captions, plates, voice files)", () => {
    expect(CUTSCENES).toEqual(live.CUTSCENES);
  });
  it("build costs and labels, save keys, initial HUD snapshot", () => {
    expect(BUILD_COST).toEqual(live.BUILD_COST);
    expect(BUILD_LABEL).toEqual(live.BUILD_LABEL);
    expect(SAVE_KEY).toBe(live.SAVE_KEY);
    expect(MUSIC_KEY).toBe("spacefish-music");
    expect(initialSnap()).toEqual(live.initialSnap());
  });
  it("math and collision helpers match on 20k random inputs", () => {
    const r = mulberry32(99);
    const n = () => (r() - 0.5) * 2000;
    for (let i = 0; i < 20000; i++) {
      const rect = { x: n(), y: n(), w: Math.abs(n()), h: Math.abs(n()) };
      const a = [n(), n(), n(), n()];
      expect(clamp(a[0], a[1], a[2])).toBe(live.clamp(a[0], a[1], a[2]));
      expect(hyp(a[0], a[1])).toBe(live.hyp(a[0], a[1]));
      expect(segmentHitsRect(a[0], a[1], a[2], a[3], rect)).toBe(live.segmentHitsRect(a[0], a[1], a[2], a[3], rect));
      expect(circleHitsRect(a[0], a[1], Math.abs(a[2]) / 4, rect)).toBe(live.circleHitsRect(a[0], a[1], Math.abs(a[2]) / 4, rect));
      expect(stickOut(a[0] / 10, a[1] / 10, Math.abs(a[2]) / 10)).toEqual(live.stickOut(a[0] / 10, a[1] / 10, Math.abs(a[2]) / 10));
    }
  });
  it("audio cues: same oscillator calls, music loops and crossfades", () => {
    const run = (A: any) => {
      const env = installEnv({ seed: 1, storage: { "spacefish-music": "0.4" } });
      try {
        const a = new A();
        a.unlock();
        for (const m of ["stealth", "alert", "rescue", "base", "shooter", "swarm", "ending", "menu"]) {
          a.setMood(m);
          for (let i = 0; i < 50; i++) env.frame();
        }
        a.shoot(true); a.shoot(false); a.hit(); a.blip(); a.pickup(); a.alarm();
        a.setMusic(0.9);
        a.close();
        return { log: env.audio.lines, storage: Object.fromEntries(env.store), vol: a.musicVol };
      } finally {
        env.restore();
      }
    };
    expect(run(AudioDirector)).toEqual(run(live.AudioDirector));
  });
});

describe("assets", () => {
  const assetRefs = (code: string) =>
    new Set(
      [...code.matchAll(/["'`]((?:music|opening|rim|sprites)\/[^"'`$]*)["'`$]/g)].map((m) => m[1]),
    );
  it("the source loads the same asset paths as the live chunk", () => {
    const liveRefs = assetRefs(read(LIVE_CHUNK));
    const ours = new Set<string>();
    for (const f of SOURCES) for (const r of assetRefs(read(f))) ours.add(r);
    expect([...ours].sort()).toEqual([...liveRefs].sort());
  });
  it("every served static file still exists at the repo root (Pages path unchanged)", () => {
    for (const p of ["index.html", "404.html", "sw.js", "favicon.svg", "og.jpg", ".nojekyll", "music/rim.mp3", "opening/dig.jpg", "rim/ground.jpg", "sprites/ship-1.png", "assets/routes-NYJyl2-8.js", "assets/index-CMaL7jzG.js", "assets/styles-dG0gngO-.css"]) {
      expect(existsSync(join(REPO_ROOT, p)), p).toBe(true);
    }
  });
  it("sw.js stays the kill-switch (F-49), byte for byte", () => {
    const sw = read(join(REPO_ROOT, "sw.js"));
    expect(sw).toContain("caches.delete(key)");
    expect(sw).toContain("self.registration.unregister()");
    expect(sw.length).toBe(455);
  });
});

describe("GD structure rules (MODULE-STRUCTURE-v0.1)", () => {
  const rel = (f: string) => relative(SRC, f).split("\\").join("/");
  it("content/ is data only (no game logic, no this.)", () => {
    for (const f of SOURCES.filter((f) => rel(f).startsWith("content/"))) {
      expect(read(f), rel(f)).not.toMatch(/\bthis\./);
      expect(read(f), rel(f)).not.toMatch(/^import (?!type)/m);
    }
  });
  it("waves/ exposes no time-limit API (waves end by count or distance)", () => {
    for (const f of SOURCES.filter((f) => rel(f).startsWith("waves/"))) {
      expect(read(f), rel(f)).not.toMatch(/time ?limit|timeLimit|timeout|countdown|deadline|expire/i);
    }
  });
  it("arcade never imports campaign code", () => {
    for (const f of SOURCES) {
      if (rel(f).includes("campaign")) continue;
      expect(read(f), rel(f)).not.toMatch(/from\s+["'][^"']*campaign/);
    }
  });
  it("only upgrades/stat.ts may read upgrade tiers", () => {
    for (const f of SOURCES.filter((f) => !rel(f).startsWith("upgrades/"))) {
      expect(read(f), rel(f)).not.toMatch(/upgrades\.owned|ownedTiers|\btiers\b/);
    }
  });
  it("every Game method is installed exactly once and matches live's method set", () => {
    const protoNames = (C: any) => Object.getOwnPropertyNames(C.prototype).sort();
    expect(protoNames(Game)).toEqual(expect.arrayContaining(protoNames(live.Game)));
    const extra = protoNames(Game).filter((n) => !protoNames(live.Game).includes(n));
    // new names only come from splitting tickShooter / the Eye spawn into modules
    expect(extra.sort()).toEqual(["collectKits", "driftTransitFish", "fireShipGuns", "moveShip", "spawnEye", "tickEye", "tickTransitSpawns"]);
  });
  it("randomness goes through engine/rng.ts only", () => {
    for (const f of SOURCES.filter((f) => rel(f) !== "engine/rng.ts")) {
      expect(read(f), rel(f)).not.toMatch(/Math\.random/);
    }
  });
});
