// The behaviour this PR changes on purpose, asserted directly on the real Game:
// N-1 touch aim, D-11 shovel melee (ADDENDUM §U.9, GD-locked numbers), N-6 Repair ahead.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { Game } from "../src/game/Game";
import { SHOVEL } from "../src/content/tuning/shovel";
import { installEnv, type Env } from "./helpers/fakeEnv";
import { makeAutopilot, runSim } from "./helpers/sim";
import { REPO_ROOT } from "./helpers/liveOracle";

const DT = 1 / 60;
let env: Env | null = null;
afterEach(() => {
  env?.restore();
  env = null;
});

function boot(phase: string, opts: { reducedMotion?: boolean } = {}) {
  env?.restore();
  env = installEnv({ seed: 1, ...opts });
  const g: any = new Game(() => {});
  g.attach(env.canvas);
  g.startPhase(phase);
  g.audio.unlock();
  return g;
}
const ticks = (g: any, n: number) => { for (let i = 0; i < n; i++) g.tick(DT); };
const secs = (g: any, s: number) => ticks(g, Math.round(s / DT));
/** world -> canvas client coords (inverse of eventToWorld at the current camera) */
const toScreen = (g: any, wx: number, wy: number) => ({
  x: g.view.ox + (wx - g.camX) * g.view.scale,
  y: g.view.oy + (wy - g.camY) * g.view.scale,
});
/** an open spot in the chapter with the player facing east (dir 2) */
function place(g: any, x: number, y: number, dir = 2) {
  g.player.x = x; g.player.y = y; g.dir = dir; g.fish = []; g.covers = [];
  g.updateCam();
}
/** stationary targets (QA's "stationary Gunner or fish") */
function freeze(g: any) {
  g.steerCombat = () => {};
  g.steerStealth = () => {};
}
function fishAt(g: any, dx: number, dy: number, hp = 1000) {
  const f = g.makeFish(g.player.x + dx, g.player.y + dy, []);
  f.hp = hp;
  g.fish.push(f);
  return f;
}
/** press Use once and run until the hit window is over */
function swingOnce(g: any) {
  g.pulseUse();
  ticks(g, 1);
  secs(g, SHOVEL.windup + SHOVEL.active + 0.02);
}
const audioCount = () => env!.audio.count;

describe("N-1 touch aim no longer sticks", () => {
  function touchAim(g: any, wx: number, wy: number) {
    const p = toScreen(g, wx, wy);
    env!.pointer("pointerdown", p.x, p.y, "touch");
  }
  it("QA repro: aim west, release Fire, walk east, hold Fire -> shoots east, not back at the old point", () => {
    const g = boot("rescue");
    place(g, 600, 518);
    g.setFire(true);
    touchAim(g, 450, 518);
    expect(g.aimPointer).toBe("touch");
    expect(g.aimAngle()).toBeCloseTo(Math.PI, 5);
    g.setFire(false);
    expect(g.aimOk).toBe(false);
    g.setStick(1, 0, true);
    secs(g, 1.2);
    g.setStick(0, 0, false);
    expect(g.player.x).toBeGreaterThan(600);
    g.fireCd = 0;
    g.bullets = [];
    g.setFire(true);
    ticks(g, 1);
    const b = g.bullets[g.bullets.length - 1];
    expect(b.vx).toBeGreaterThan(0);
    expect(Math.abs(b.vy)).toBeLessThan(1e-6);
  });
  it("moving the stick while Fire is held drops the touch aim (aim falls back to facing)", () => {
    const g = boot("rescue");
    place(g, 600, 518);
    g.setFire(true);
    touchAim(g, 600, 400);
    expect(g.aimAngle()).toBeCloseTo(-Math.PI / 2, 5);
    g.setStick(0, 0, true); // touching the stick inside the dead zone keeps it
    expect(g.aimOk).toBe(true);
    g.setStick(0.5, 0, true);
    expect(g.aimOk).toBe(false);
  });
  it("a new chapter or Retry clears a touch aim, but not a mouse aim", () => {
    const g = boot("rescue");
    place(g, 600, 518);
    g.setFire(true);
    touchAim(g, 450, 518);
    g.startPhase("base");
    expect(g.aimOk).toBe(false);
    env!.pointer("pointermove", 300, 200);
    expect(g.aimPointer).toBe("mouse");
    g.startPhase("base");
    expect(g.aimOk).toBe(true);
  });
  it("while Fire is held and the stick is still, the tap aim still works at any angle", () => {
    const g = boot("rescue");
    place(g, 600, 518);
    g.setFire(true);
    for (const deg of [0, 90, -45, 180]) {
      const r = (deg * Math.PI) / 180;
      touchAim(g, 600 + Math.cos(r) * 100, 518 + Math.sin(r) * 100);
      g.fireCd = 0;
      ticks(g, 1);
      const b = g.bullets[g.bullets.length - 1];
      expect(Math.atan2(b.vy, b.vx)).toBeCloseTo(Math.atan2(Math.sin(r), Math.cos(r)), 5);
    }
  });
});

describe("D-11 shovel melee on Use (§U.9)", () => {
  it("uses the GD-locked numbers from content/tuning/shovel.ts, not stat()", () => {
    expect(SHOVEL).toMatchObject({ interactGate: 40, windup: 0.08, active: 0.12, cooldown: 0.55, reach: 52, arcDeg: 100, damage: 12, knockback: 40, hitStop: 0.06, stagger: 0.4, staggerImmune: 0.6, noiseRadius: 120 });
    const code = readFileSync(join(REPO_ROOT, "src", "game", "shovel.ts"), "utf8");
    expect(code).not.toMatch(/\bstat\(|upgrades\//);
  });

  it("arc and reach: hits inside 52 px and ±50° of facing, misses outside", () => {
    const cases: Array<[number, number, boolean]> = [
      [50, 0, true], [52, 0, true], [53, 0, false],
      [50, 49, true], [50, -49, true], [50, 51, false], [50, -51, false], [40, 180, false],
    ];
    for (const [d, deg, hit] of cases) {
      const g = boot("rescue");
      place(g, 600, 518);
      freeze(g);
      const r = (deg * Math.PI) / 180;
      const f = fishAt(g, Math.cos(r) * d, Math.sin(r) * d);
      swingOnce(g);
      expect(f.hp < 1000, `${d}px ${deg}°`).toBe(hit);
    }
  });

  it("a hit does 12 damage, knocks back 40 px and staggers; facing follows the 4-way direction", () => {
    const g = boot("rescue");
    place(g, 600, 518, 3); // facing north
    freeze(g);
    const f = fishAt(g, 0, -50);
    const behind = fishAt(g, 0, 45);
    swingOnce(g);
    expect(f.hp).toBe(1000 - 12);
    expect(f.y).toBeCloseTo(518 - 90, 5);
    expect(f.stagger).toBeGreaterThan(0);
    expect(behind.hp).toBe(1000);
  });

  it("10/10 swings register on a stationary fish at 50 px", () => {
    const g = boot("rescue");
    place(g, 600, 518);
    freeze(g);
    let hits = 0;
    for (let i = 0; i < 10; i++) {
      g.fish = [];
      const f = fishAt(g, 50, 0);
      swingOnce(g);
      if (f.hp < 1000) hits++;
      secs(g, SHOVEL.cooldown);
    }
    expect(hits).toBe(10);
  });

  it("timing: nothing lands during the 80 ms wind-up; cooldown is 0.55 s from swing start", () => {
    const g = boot("rescue");
    place(g, 600, 518);
    freeze(g);
    const f = fishAt(g, 50, 0);
    g.pulseUse();
    ticks(g, 1); // swing starts at the end of this tick
    ticks(g, 4); // 67 ms
    expect(f.hp).toBe(1000);
    ticks(g, 2); // 100 ms
    expect(f.hp).toBe(1000 - 12);
    // a second Use inside the cooldown does nothing
    secs(g, 0.2); // the first swing's hit window is over (hit-stop paused it 60 ms)
    expect(g.swing).toBe(null);
    g.fish = [];
    const f2 = fishAt(g, 50, 0);
    g.pulseUse();
    secs(g, 0.15);
    expect(f2.hp).toBe(1000);
    secs(g, 0.2); // now past 0.55 s of swing time from the first swing
    swingOnce(g);
    expect(f2.hp).toBe(1000 - 12);
  });

  it("hits every fish in the arc; hit-stop (60 ms) and the tonk fire once per swing", () => {
    const g = boot("rescue");
    place(g, 600, 518);
    const a = fishAt(g, 45, -15);
    const b = fishAt(g, 45, 15);
    let stops = 0;
    let tonks = 0;
    const tonk = g.audio.tonk.bind(g.audio);
    g.audio.tonk = () => { tonks++; tonk(); };
    g.pulseUse();
    for (let i = 0; i < 20; i++) { const before = g.hitStop; g.tick(DT); if (g.hitStop > before) stops++; }
    expect(a.hp).toBe(988);
    expect(b.hp).toBe(988);
    expect(stops).toBe(1);
    expect(tonks).toBe(1);
  });

  it("hit-stop holds the sim for 60 ms", () => {
    const g = boot("rescue");
    place(g, 600, 518);
    fishAt(g, 50, 0);
    g.pulseUse();
    ticks(g, 6);
    expect(g.hitStop).toBeCloseTo(0.06, 5);
    const x = g.player.x;
    g.setStick(1, 0, true);
    ticks(g, 3); // 50 ms: frozen
    expect(g.player.x).toBe(x);
    ticks(g, 2);
    expect(g.player.x).toBeGreaterThan(x);
  });

  it("stagger: 0.40 s with no move or chase, then 0.6 s immune so it can't be chained", () => {
    const g = boot("rescue");
    place(g, 600, 518);
    const f = fishAt(g, 50, 0);
    f.aggro = true;
    swingOnce(g); // ~0.22 s after Use; landed at ~0.1 s
    const x0 = f.x;
    secs(g, 0.2);
    expect(f.x).toBe(x0); // still staggered: not chasing
    secs(g, 0.15);
    expect(f.stagger).toBe(0);
    expect(f.staggerImmune).toBeGreaterThan(0);
    secs(g, 0.1);
    expect(f.x).toBeLessThan(x0); // chasing again
    // second swing lands inside the immunity window: damage, no new stagger
    f.x = g.player.x + 50; f.y = g.player.y;
    swingOnce(g);
    expect(f.hp).toBe(1000 - 24);
    expect(f.stagger).toBe(0);
    // after immunity runs out, a hit staggers again
    secs(g, 0.8);
    f.x = g.player.x + 50; f.y = g.player.y;
    expect(f.staggerImmune).toBe(0);
    swingOnce(g);
    expect(f.stagger).toBeGreaterThan(0);
  });

  it("Rim noise: a hit pings 120 px (fish there turn and get one sight check); a miss makes no ping; a hit never clears a spot", () => {
    // fish patrol away from the player (west) so only the ping can make them look
    const patrolFish = (g: any, dx: number, wpDx: number) => {
      const f = g.makeFish(g.player.x + dx, g.player.y, [{ x: g.player.x + wpDx, y: g.player.y }]);
      f.hp = 1000;
      f.facing = wpDx < dx ? Math.PI : 0;
      g.fish.push(f);
      return f;
    };
    // miss: nothing in the arc, a fish 100 px behind looking away -> never spotted
    let g = boot("stealth");
    place(g, 600, 945);
    patrolFish(g, -100, -600);
    g.pulseUse();
    secs(g, 0.5);
    expect(g.alerted).toBe(false);
    // hit: target in the arc (walking away east), same fish 100 px behind -> it looks and spots
    g = boot("stealth");
    place(g, 600, 945);
    const target = patrolFish(g, 44, 600);
    patrolFish(g, -100, -600);
    g.pulseUse();
    ticks(g, 6);
    expect(target.hp).toBe(988);
    ticks(g, 6); // hit-stop over, one sight check, still inside the target's stagger
    expect(g.alerted).toBe(true);
    // hit with the only other fish 130 px behind (outside the ping): not spotted during the stagger
    g = boot("stealth");
    place(g, 600, 945);
    const t2 = patrolFish(g, 44, 600);
    patrolFish(g, -130, -600);
    g.pulseUse();
    ticks(g, 12);
    expect(t2.hp).toBe(988);
    expect(g.alerted).toBe(false);
    // already spotted: the hit doesn't clear or lower the alert (it only runs down at the normal rate)
    g = boot("stealth");
    place(g, 600, 945);
    freeze(g);
    fishAt(g, 50, 0);
    g.alert = 3; g.alerted = true;
    g.pulseUse();
    ticks(g, 12);
    expect(g.alerted).toBe(true);
    expect(g.alert).toBeGreaterThan(3 - 13 * DT);
  });

  it("interactable gate: within 40 px Use interacts and never swings; beyond it, a Use that did nothing swings", () => {
    const g = boot("rescue");
    const h = g.holdouts[0];
    // fish guarding the holdout so tryFree refuses
    place(g, h.x, h.y + 30, 3);
    fishAt(g, 0, -20).x = h.x + 60;
    g.pulseUse(); ticks(g, 1);
    expect(g.swing).toBe(null);
    expect(h.freed).toBe(false);
    // 50 px away (still inside tryFree's 64 px, but guarded) -> swing
    g.player.y = h.y + 50;
    g.pulseUse(); ticks(g, 1);
    expect(g.swing).not.toBe(null);
  });

  it("Use still frees a holdout as today (64 px), with no swing", () => {
    const g = boot("rescue");
    const h = g.holdouts[0];
    place(g, h.x, h.y + 50, 3);
    g.pulseUse(); ticks(g, 1);
    expect(h.freed).toBe(true);
    expect(g.mode).toBe("cutscene");
    expect(g.swing).toBe(null);
  });

  it("Pad: Use on the ready launch pad launches, never swings; the nest takes shovel hits", () => {
    const g = boot("base");
    for (const s of g.structures) s.repaired = true;
    g.nest.hp = 0;
    g.fish = [];
    g.player.x = g.pad.x; g.player.y = g.pad.y + 20;
    g.pulseUse(); ticks(g, 1);
    expect(g.mode).toBe("cutscene");
    expect(g.cutId).toBe("launch");
    expect(g.swing).toBe(null);
    const g2 = boot("base");
    place(g2, g2.nest.x - g2.nest.r - 40, g2.nest.y);
    const hp = g2.nest.hp;
    swingOnce(g2);
    expect(g2.nest.hp).toBe(hp - 12);
  });

  it("on foot only: no swing in Transit", () => {
    const g = boot("shooter");
    g.pulseUse(); ticks(g, 2);
    expect(g.swing).toBe(null);
    expect(g.tryShovel()).toBe(false);
  });

  it("Rim Fire/Dig (phone touch path) swings like Use: hits a fish at 50 px", () => {
    const g = boot("stealth");
    place(g, 600, 945);
    freeze(g);
    const f = fishAt(g, 50, 0);
    g.setFire(true); ticks(g, 1); g.setFire(false);
    expect(g.swing).not.toBe(null);
    secs(g, SHOVEL.windup + SHOVEL.active + 0.1);
    expect(f.hp).toBe(988);
    expect(g.bullets.length).toBe(0);
  });

  it("Rim Fire/Dig digs (old animation, no swing) when a dig spot is within 40 px", () => {
    const g = boot("stealth");
    place(g, g.cache.x - 50, g.cache.y);
    g.useInteractableNear = (r: number) => r >= 40; // a dig spot within 40 px (the cache trigger itself fires at 46 px)
    g.setFire(true); ticks(g, 1); g.setFire(false);
    expect(g.swing).toBe(null);
    expect(g.shovelT).toBeGreaterThan(0.3);
  });

  it("holding Fire/Dig swings once per 0.55 s cooldown; a held Fire that misses never alerts (F-01 Space fix kept)", () => {
    const g = boot("stealth");
    place(g, 600, 945);
    let swings = 0;
    const t = g.tryShovel.bind(g);
    g.tryShovel = () => { const ok = t(); if (ok) swings++; return ok; };
    g.setFire(true);
    secs(g, 1.2);
    g.setFire(false);
    expect(swings).toBe(3); // at 0, 0.55, 1.1 s
    expect(g.alerted).toBe(false);
    expect(g.bullets.length).toBe(0);
  });

  it("reduced motion: no trail and no hit-stop (the hit itself still lands)", () => {
    const run = (reducedMotion: boolean) => {
      const g = boot("rescue", { reducedMotion });
      place(g, 600, 518);
      const f = fishAt(g, 50, 0);
      g.pulseUse(); ticks(g, 6);
      env!.draw.lines = [];
      g.drawShovelTrail(g.ctx);
      return { stop: g.hitStop, trailCalls: env!.draw.lines.length, hp: f.hp };
    };
    const on = run(false);
    expect(on.stop).toBeGreaterThan(0);
    expect(on.trailCalls).toBeGreaterThan(0);
    const off = run(true);
    expect(off).toEqual({ stop: 0, trailCalls: 0, hp: 988 });
  });

  it("a hit spawns ≤6 brass particles per target and no screen shake (flash budget)", () => {
    const g = boot("rescue");
    place(g, 600, 518);
    g.particles = [];
    fishAt(g, 50, 0);
    g.pulseUse(); ticks(g, 6);
    expect(g.particles.length).toBeLessThanOrEqual(SHOVEL.particlesPerHit);
    expect(g.particles.every((p: any) => p.color === "#d4a24a")).toBe(true);
    expect(g.shake).toBe(0);
  });

  it("swing and tonk play sound cues", () => {
    const g = boot("rescue");
    place(g, 600, 518);
    fishAt(g, 50, 0);
    // F-07: the shovel files decode asynchronously, so count the cues at the director
    const cues: string[] = [];
    const play = g.audio.playSfx.bind(g.audio);
    g.audio.playSfx = (k: string) => { cues.push(k); play(k); };
    g.pulseUse(); ticks(g, 1);
    expect(cues).toEqual(["swing"]);
    ticks(g, 5);
    expect(cues).toContain("tonk");
  });
});

// F-01 escape and counterplay tests moved to live-fixes-v03.test.ts (GD's Nov 18 ruling:
// Rim chase 140 + search state; the old "no-hit control is always caught" bar was retired).
describe("full clear with the fixes on", () => {
  it("full run start to victory with the real Game (zero upgrades)", () => {
    const ap = makeAutopilot();
    const r = runSim(Game, {
      seed: 11,
      frames: 60 * 400,
      sampleEvery: 600,
      start: (g: any) => g.startNew(),
      step: (g: any, e: any, f: number) => { if (f === 90) g.skipCutscene(); ap(g, e, f); },
      stopWhen: (g: any) => g.mode === "victory",
    });
    expect(r.final.s.mode).toBe("victory");
  });
});

describe("N-6 Repair ahead with no wreck in range is no longer silent", () => {
  it("plays the refusal blip and spends nothing", () => {
    const g = boot("base");
    place(g, 1000, 900);
    const scrap = g.scrap;
    const n0 = audioCount();
    g.dropBuild();
    expect(audioCount()).toBeGreaterThan(n0);
    expect(g.scrap).toBe(scrap);
    expect(g.structures.every((s: any) => !s.repaired)).toBe(true);
  });
});
