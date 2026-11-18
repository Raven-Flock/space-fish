// v0.3 additions to PR #10, asserted on the real Game:
// F-01 per GD's Nov 18 ruling (Rim chase 140, a shovel hit breaks the chase: 1.2 s search,
// 3.0 s anti-lock, alert drains as usual), QA N-5 (click-repair reach), QA N-8 (facing
// lock cone), VP-PHONE-HUD-v0.1 copy, and Sound Design's shovel SFX (v0.3.1: the shovel
// cue trim from Sound's level correction, 0.48 on F-07's curve, and the cues primed at audio unlock).
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { Game } from "../src/game/Game";
import { FISH } from "../src/content/tuning/fish";
import { SHOVEL } from "../src/content/tuning/shovel";
import { AIM } from "../src/content/tuning/aim";
import { CLICK_REPAIR, REPAIR_HINT } from "../src/content/tuning/build";
import { SHOVEL_CUE_TRIM, SHOVEL_SFX } from "../src/content/tuning/sfx";
import { AUDIO } from "../src/content/tuning/audio";
import { HUD_HINT } from "../src/content/hud";
import { HUD_TIMING } from "../src/content/tuning/hud";
import { installEnv, type Env } from "./helpers/fakeEnv";
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
const toScreen = (g: any, wx: number, wy: number) => ({
  x: g.view.ox + (wx - g.camX) * g.view.scale,
  y: g.view.oy + (wy - g.camY) * g.view.scale,
});
function place(g: any, x: number, y: number, dir = 2) {
  g.player.x = x; g.player.y = y; g.dir = dir; g.fish = []; g.covers = [];
  g.updateCam();
}
function fishAt(g: any, dx: number, dy: number, hp = 1000) {
  const f = g.makeFish(g.player.x + dx, g.player.y + dy, []);
  f.hp = hp;
  g.fish.push(f);
  return f;
}
/** tick until the fish's stagger ends (or give up after 2 s) */
function untilStaggerEnds(g: any, f: any) {
  for (let i = 0; i < 120 && !(f.stagger > 0); i++) g.tick(DT);
  for (let i = 0; i < 120 && f.stagger > 0; i++) g.tick(DT);
}

describe("F-01 (GD ruling, Nov 18): Rim chase 140, a shovel hit breaks the chase, not the spot", () => {
  it("Rim chase speed is 140, read from content/tuning/fish.ts; combat and patrol speeds unchanged", () => {
    expect(FISH).toMatchObject({ chaseSpeed: 140, patrolSpeed: 74, rescueSpeed: 96, baseSpeed: 132, searchTime: 1.2, searchSpeedCap: 72, searchLockout: 3.0, sightRange: 236, sightRangeSneaking: 150, sightHalfAngle: 0.62, alertTime: 3.4 });
    const step = (override?: number) => {
      const g = boot("stealth");
      place(g, 300, 600);
      if (override != null) g.rimChaseSpeed = () => override;
      const f = fishAt(g, 300, 0); // east of the player, facing east (player behind it, unseen)
      f.facing = 0;
      g.alert = 3; g.alerted = true; g.lastSeen = { x: 1000, y: 600 };
      const x0 = f.x;
      ticks(g, 1);
      return f.x - x0;
    };
    expect(step()).toBeCloseTo(140 * DT, 6);
    expect(step(100)).toBeCloseTo(100 * DT, 6); // the chase reads rimChaseSpeed(), nothing hardcoded
  });

  it("after the 0.40 s stagger: 1.2 s of search toward the last-seen spot at <=72 px/s, no sight check, no alert refresh; then it re-spots honestly", () => {
    const g = boot("stealth");
    place(g, 600, 600, 2);
    const f = fishAt(g, 50, 0);
    f.facing = Math.PI;
    g.alert = FISH.alertTime; g.alerted = true; g.lastSeen = { x: 600, y: 600 };
    let searchTicks = 0;
    const fs0 = g.fishSearch.bind(g);
    g.fishSearch = (fish: any, dt: number) => { const r = fs0(fish, dt); if (r) searchTicks++; return r; };
    g.pulseUse();
    for (let i = 0; i < 30 && !(f.stagger > 0); i++) g.tick(DT);
    expect(f.hp).toBe(1000 - 12);
    expect(f.searchPending).toBe(true);
    // the player steps back west, still in the fish's cone and range
    g.player.x = 480; g.player.y = 590;
    let alertPrev = g.alert;
    while (f.stagger > 0) { g.tick(DT); expect(g.alert).toBeLessThanOrEqual(alertPrev); alertPrev = g.alert; }
    expect(f.search).toBeCloseTo(FISH.searchTime, 6);
    expect(f.searchLock).toBeCloseTo(FISH.searchLockout, 6);
    expect(g.fishSees(f, false)).toBe(true); // it *could* see you...
    expect(searchTicks).toBe(1); // search began on the tick the stagger ended
    let maxStep = 0;
    let respotted = false;
    while (f.search > 0) {
      const x = f.x, y = f.y;
      g.tick(DT);
      if (f.search > 0) {
        maxStep = Math.max(maxStep, Math.hypot(f.x - x, f.y - y));
        // ...but the alert only drains (never refreshed) while it searches
        expect(g.alert).toBeCloseTo(alertPrev - DT, 9);
        alertPrev = g.alert;
      } else {
        // the tick search ends, the normal sight check runs: you're still in its cone -> honest re-spot
        respotted = Math.abs(g.alert - (FISH.alertTime - DT)) < 1e-9;
      }
    }
    expect(searchTicks).toBe(Math.round(FISH.searchTime / DT)); // 1.2 s of search
    expect(maxStep).toBeLessThanOrEqual(FISH.searchSpeedCap * DT + 1e-9);
    expect(f.x).toBeLessThan(600 + 50 + SHOVEL.knockback - 60); // walked toward the last-seen spot
    expect(alertPrev).toBeGreaterThan(0); // a hit never zeroed the alert
    expect(respotted).toBe(true);
  });

  it("anti-lock: one search per 3.0 s; a hit inside the window still does damage, knockback and stagger (stagger keeps the 0.6 s immunity)", () => {
    const g = boot("stealth");
    place(g, 600, 600, 2);
    g.steerStealth = () => {}; // hold the fish in place; timers still run in tickShovel
    const f = fishAt(g, 50, 0);
    g.pulseUse();
    untilStaggerEnds(g, f);
    expect(f.search).toBeGreaterThan(1.1);
    // wait out the 0.6 s stagger immunity, then hit again inside the 3.0 s window
    secs(g, SHOVEL.staggerImmune + 0.05);
    expect(f.staggerImmune).toBe(0);
    f.x = g.player.x + 50; f.y = g.player.y;
    g.pulseUse();
    for (let i = 0; i < 30 && !(f.stagger > 0); i++) g.tick(DT);
    expect(f.hp).toBe(1000 - 24);
    expect(f.x).toBeCloseTo(g.player.x + 50 + SHOVEL.knockback, 6);
    expect(f.stagger).toBeGreaterThan(0);
    expect(f.searchPending).toBeFalsy();
    const lock = f.searchLock;
    untilStaggerEnds(g, f);
    expect(f.searchLock).toBeLessThan(lock); // not restarted
    // inside the immunity a hit damages but doesn't stagger
    f.x = g.player.x + 50; f.y = g.player.y;
    secs(g, 0.1);
    g.pulseUse();
    secs(g, 0.25);
    expect(f.hp).toBe(1000 - 36);
    expect(f.stagger).toBe(0);
    // once the window is over, a staggering hit starts a new search
    for (let i = 0; i < 400 && (f.searchLock > 0 || f.staggerImmune > 0); i++) g.tick(DT);
    f.x = g.player.x + 50; f.y = g.player.y;
    g.pulseUse();
    untilStaggerEnds(g, f);
    expect(f.search).toBeCloseTo(FISH.searchTime, 6);
    expect(f.searchLock).toBeCloseTo(FISH.searchLockout, 6);
  });

  it("alert drains at the live rate while no fish sees the player, and a hit never zeroes it", () => {
    const g = boot("stealth");
    place(g, 600, 600, 2);
    const f = fishAt(g, -300, 0); // behind the player, facing away
    f.facing = Math.PI;
    g.alert = 3; g.alerted = true; g.lastSeen = { x: 100, y: 600 };
    ticks(g, 30);
    expect(g.alert).toBeCloseTo(3 - 30 * DT, 9);
    // the hit itself never touches the alert (fish held still so none can look at the player)
    g.steerStealth = () => {};
    const t = fishAt(g, 50, 0);
    const a0 = g.alert;
    g.pulseUse();
    let frozen = 0;
    for (let i = 0; i < 40; i++) { const hs = g.hitStop > 0; g.tick(DT); if (hs) frozen++; }
    expect(t.hp).toBe(988);
    expect(g.alert).toBeCloseTo(a0 - (40 - frozen) * DT, 9); // drained every unfrozen tick, never reset or zeroed
  });

  it("search is Rim only: a staggering hit in Holdouts or the Pad starts no search", () => {
    for (const phase of ["rescue", "base"]) {
      const g = boot(phase);
      place(g, 600, 518);
      g.steerCombat = () => {};
      const f = fishAt(g, 50, 0);
      g.pulseUse();
      untilStaggerEnds(g, f);
      expect(f.hp, phase).toBe(988);
      expect(f.searchPending, phase).toBeFalsy();
      expect(f.search ?? 0, phase).toBe(0);
    }
  });

  // QA F-01 scenario on open ground: a fish chases a spotted player. With a hit, the player
  // stands, lands one swing when it is in reach, then walks away; without one, the player
  // walks away at once. "Escaped" = the alert clears without the player taking damage.
  function chase(i: number, swing: boolean) {
    const g = boot("stealth");
    const ang = [0, 0.3, -0.3, 0.6, -0.6][i];
    place(g, 260, 550 - Math.sin(ang) * 300, 1);
    const f = g.makeFish(g.player.x - 90 - i * 6, g.player.y + (i - 2) * 5, []);
    f.facing = 0;
    g.fish.push(f);
    const hp0 = g.player.hp;
    let swung = false;
    let t0 = -1;
    for (let k = 0; k < 60 * 20; k++) {
      const t = k * DT;
      const d = Math.hypot(f.x - g.player.x, f.y - g.player.y);
      if (swing && !swung) {
        g.setStick(0, 0, false);
        if (g.alert > 0 && d < 50) { g.dir = 1; g.pulseUse(); swung = true; t0 = t; }
      } else {
        if (t0 < 0) t0 = t;
        g.setStick(Math.cos(ang), Math.sin(ang), true);
      }
      g.tick(DT);
      if (g.player.hp < hp0) return { ok: false, t: null as number | null };
      if (t0 >= 0 && g.alerted && g.alert <= 0) return { ok: true, t: +(t - t0).toFixed(2) };
    }
    return { ok: false, t: null as number | null };
  }
  it("QA bar: one hit then escape a single chaser in >=4/5 with the alert clearing; reported next to the no-hit numbers, and clearly better", () => {
    const hit = [0, 1, 2, 3, 4].map((i) => chase(i, true));
    const none = [0, 1, 2, 3, 4].map((i) => chase(i, false));
    const rate = (r: any[]) => r.filter((x) => x.ok).length;
    const mean = (r: any[]) => { const ok = r.filter((x) => x.ok); return ok.length ? ok.reduce((s, x) => s + x.t, 0) / ok.length : Infinity; };
    // eslint-disable-next-line no-console
    console.log(`F-01 one hit: ${rate(hit)}/5 escaped, mean ${mean(hit).toFixed(2)} s ${JSON.stringify(hit)}; no hit: ${rate(none)}/5, mean ${mean(none).toFixed(2)} s ${JSON.stringify(none)}`);
    expect(rate(hit)).toBeGreaterThanOrEqual(4);
    // GD amendment: a no-hit player may sometimes out-walk the 140 chase; the hit must be clearly faster or more reliable
    expect(rate(hit) > rate(none) || mean(hit) + 2 <= mean(none)).toBe(true);
  });

  it("fight-back still passes: a spotted player who stands and swings kills the chasing Rim fish (HP 40)", () => {
    const g = boot("stealth");
    place(g, 600, 600, 1);
    const f = g.makeFish(g.player.x - 120, g.player.y, []);
    f.facing = 0;
    g.fish.push(f);
    expect(f.hp).toBe(40);
    for (let k = 0; k < 60 * 10 && f.hp > 0; k++) {
      const d = Math.hypot(f.x - g.player.x, f.y - g.player.y);
      g.setStick(0, 0, false);
      g.dir = 1;
      if (d < SHOVEL.reach && g.swingCd <= 0) g.pulseUse();
      g.tick(DT);
    }
    expect(f.hp).toBeLessThanOrEqual(0);
    expect(g.player.hp).toBeGreaterThan(0);
  });

  it("Rim stealth (R-4) at 140: a sneaking player behind a patrolling fish is never spotted", () => {
    const g = boot("stealth");
    place(g, 600, 600, 2);
    const f = g.makeFish(700, 600, [{ x: 1400, y: 600 }]);
    g.fish.push(f);
    g.setQaKeys(["ShiftLeft", "KeyD"]);
    secs(g, 4);
    expect(g.alerted).toBe(false);
    expect(g.player.x).toBeGreaterThan(800);
  });
});

describe("QA N-5 (GD, Nov 18): a press repairs only if (player within reach AND the press is on the wreck) or a repair kind is selected", () => {
  const wreck = (g: any) => g.structures.find((s: any) => s.kind === "turret" && s.x === 860 && s.y === 640);
  const ON = CLICK_REPAIR.wreckHitRadius + CLICK_REPAIR.tapSlop; // 52 px
  function press(standDy: number, tapDy: number, kind = "mouse", select: string | null = null) {
    const g = boot("base");
    const w = wreck(g);
    place(g, w.x, w.y - standDy, 0);
    g.fish = [];
    if (select) g.selectBuild(select);
    const scrap = g.scrap;
    const p = toScreen(g, w.x, w.y - tapDy);
    env!.pointer("pointerdown", p.x, p.y, kind);
    const repairedNow = w.repaired;
    ticks(g, 1);
    return { g, w, repairedNow, spent: scrap - g.scrap };
  }
  it("tuning: reach 150, wreck hit radius 28, tap slop 24", () => {
    expect(CLICK_REPAIR).toEqual({ reach: 150, wreckHitRadius: 28, tapSlop: 24 });
  });
  it("tap on the wreck with the player in reach repairs (same cost)", () => {
    const r = press(100, 0);
    expect(r.repairedNow).toBe(true);
    expect(r.spent).toBe(45);
  });
  it("tap off the wreck (inside live's 72 px pick radius, beyond 28 + 24) with the player in reach fires instead and spends nothing", () => {
    const r = press(100, 60);
    expect(r.w.repaired).toBe(false);
    expect(r.spent).toBe(0);
    expect(r.g.bullets.length).toBeGreaterThan(0);
  });
  it("the on-wreck edge is exactly hit radius + slop (52 px repairs, 53 px fires)", () => {
    expect(press(100, ON).repairedNow).toBe(true);
    const off = press(100, ON + 1);
    expect(off.w.repaired).toBe(false);
    expect(off.g.bullets.length).toBeGreaterThan(0);
  });
  it(`tap on the wreck with the player more than ${CLICK_REPAIR.reach} px away fires instead and spends nothing`, () => {
    const r = press(CLICK_REPAIR.reach + 10, 0);
    expect(r.w.repaired).toBe(false);
    expect(r.spent).toBe(0);
    expect(r.g.bullets.length).toBeGreaterThan(0);
  });
  it("with a repair kind selected, a tap near the wreck repairs from any distance (unchanged)", () => {
    const r = press(200, 60, "touch", "turret");
    expect(r.repairedNow).toBe(true);
  });
  it("a phone tap off the wreck walks (the live tap-to-walk path), never repairs", () => {
    const r = press(100, 60, "touch");
    expect(r.w.repaired).toBe(false);
    expect(r.g.tap).not.toBe(null);
  });
  it("the REPAIR hint copy is kept", () => {
    expect(REPAIR_HINT).toBe("Tap a wreck to repair it. Same scrap cost.");
  });
});

describe("QA N-8 (GD, Nov 18): with no aim point, the in-cone target wins, else the nearest target in any direction", () => {
  it("tuning: 280 px, nest 340 px, ±0.55 cone, π fallback", () => {
    expect(AIM).toEqual({ lockRange: 280, nestLockRange: 340, lockHalfAngle: 0.55, facingFallbackHalfAngle: Math.PI });
  });
  it("keyboard only: prefers the target within ±0.55 of facing over a nearer one behind", () => {
    const g = boot("rescue");
    place(g, 600, 518, 2); // facing east, no mouse ever moved
    expect(g.facingAimLock()).toBe(true);
    fishAt(g, -100, 0); // nearer, behind
    const ahead = fishAt(g, 200, 20);
    expect(g.laserTarget(g.aimAngle())).toBe(ahead);
    // not vacuous: a one-pass π cone (no priority) would take the nearer one behind
    const onePass = g.lockTarget(g.aimAngle(), Math.PI);
    expect(onePass).not.toBe(ahead);
  });
  it("keyboard only: falls back to the nearest target anywhere within 280 px when the cone is empty", () => {
    const g = boot("rescue");
    place(g, 600, 518, 2);
    const behind = fishAt(g, -150, 0);
    fishAt(g, 0, -200); // farther, to the side
    expect(g.laserTarget(g.aimAngle())).toBe(behind);
    g.fish = [];
    const side = fishAt(g, 0, -150); // 90° off facing
    expect(g.laserTarget(g.aimAngle())).toBe(side);
    g.fish = [];
    fishAt(g, -300, 0); // out of range
    expect(g.laserTarget(g.aimAngle())).toBe(null);
  });
  it("phone Fire with no tap-aim uses the same facing rule", () => {
    const g = boot("rescue");
    place(g, 600, 518, 2);
    g.setFire(true);
    const behind = fishAt(g, -150, 0);
    expect(g.facingAimLock()).toBe(true);
    expect(g.laserTarget(g.aimAngle())).toBe(behind);
  });
  it("a mouse or touch aim point keeps live's ±0.55 rad cone only (no fallback)", () => {
    const g = boot("rescue");
    place(g, 600, 518, 2);
    const p = toScreen(g, 800, 518);
    env!.pointer("pointermove", p.x, p.y);
    expect(g.facingAimLock()).toBe(false);
    fishAt(g, 0, -150);
    expect(g.laserTarget(g.aimAngle())).toBe(null);
    const ahead = fishAt(g, 150, -30);
    expect(g.laserTarget(g.aimAngle())).toBe(ahead);
    g.setFire(true);
    const t = toScreen(g, 600, 300);
    env!.pointer("pointerdown", t.x, t.y, "touch");
    expect(g.aimPointer).toBe("touch");
    expect(g.facingAimLock()).toBe(false);
  });
});

describe("VP-PHONE-HUD-v0.1 copy", () => {
  it("final touch hint strings; no 'walk' anywhere in Transit strings", () => {
    expect(HUD_HINT.touchWalk).toBe("Drag the stick to walk.");
    expect(HUD_HINT.touchTransit).toBe("Drag the stick to steer. Hold Fire to shoot.");
    expect(HUD_TIMING).toEqual({ walkHintHideAfter: 0.4, transitHintFireHeld: 2, transitHintMaxTime: 8, hintFadeMs: 300 });
    expect(HUD_HINT.touchTransit).not.toMatch(/walk/i);
    const g = boot("shooter");
    expect(g.objective()).not.toMatch(/walk/i);
    g.bossOn = true;
    expect(g.objective()).not.toMatch(/walk/i);
    const app = readFileSync(join(REPO_ROOT, "src", "app", "SpaceFishApp.tsx"), "utf8");
    expect(app).not.toContain("tap the ground to walk");
  });
});

describe("VP Transit touch hint timing (game side)", () => {
  it("hides after 8 s of Transit play with no Fire (not at 7.9 s)", () => {
    const g = boot("shooter");
    secs(g, 7.9);
    expect(g.transitHint.done).toBe(false);
    secs(g, 0.1);
    expect(g.transitHint.done).toBe(true);
  });
  it("hides once Fire has been held 2 s in total during Transit (holds add up)", () => {
    const g = boot("shooter");
    g.setFire(true); secs(g, 1.2); g.setFire(false);
    secs(g, 1);
    expect(g.transitHint.done).toBe(false);
    g.setFire(true); secs(g, 0.75);
    expect(g.transitHint.done).toBe(false);
    secs(g, 0.05);
    expect(g.transitHint.fire).toBeCloseTo(2, 6);
    expect(g.transitHint.done).toBe(true);
    expect(g.transitHint.t).toBeLessThan(HUD_TIMING.transitHintMaxTime);
  });
  it("pause and ground phases don't count; it doesn't return that run (Retry), and a new run (Start) resets it", () => {
    const g = boot("rescue");
    secs(g, 3);
    expect(g.transitHint).toBe(null);
    g.startPhase("shooter");
    g.mode = "pause";
    secs(g, 10);
    expect(g.transitHint).toBe(null);
    g.mode = "play";
    secs(g, 8);
    expect(g.transitHint.done).toBe(true);
    g.startPhase("shooter"); // Retry
    secs(g, 0.5);
    expect(g.transitHint.done).toBe(true);
    g.startNew();
    expect(g.transitHint).toBe(null);
  });
});

describe("Sound Design shovel SFX", () => {
  const SHA: Record<string, string> = {
    "sfx/shovel-swing-a.m4a": "e0fc33d5a78d8b7a58555099068ab486ee56b9cffb35e47a26b96f0132eb2872",
    "sfx/shovel-swing-b.m4a": "27ad5d5d5b0f9d8e587f1568cdf83f2f88cd954a526674f7b126e394a7cf59ea",
    "sfx/shovel-swing-c.m4a": "2366fc4c7a329013d43a382f5f4ed2b7d4dbf5c48beb24c7d9a062a57eea7a41",
    "sfx/shovel-tonk-a.m4a": "b1868f36356ebfa3b935c19adf03ebdb62a0522d74e7a3115d0f2db925429cbc",
    "sfx/shovel-tonk-b.m4a": "c1797b0554963d21333260b9f2ea0d0715eb7335100060ddd9ff15e32746e8cc",
    "sfx/shovel-tonk-c.m4a": "1fa73a6868d83b9bd0b0a053c0470f3093032d0cb5e79fa17ba72d3a841dd29a",
  };
  it("the six committed files are byte-exact (sha256) and the tuning lists exactly them; CREDITS line present", () => {
    expect([...SHOVEL_SFX.swing, ...SHOVEL_SFX.tonk].sort()).toEqual(Object.keys(SHA).sort());
    for (const [p, sha] of Object.entries(SHA)) {
      expect(createHash("sha256").update(readFileSync(join(REPO_ROOT, p))).digest("hex"), p).toBe(sha);
    }
    expect(SHOVEL_SFX.gain).toBe(SHOVEL_CUE_TRIM);
    expect(SHOVEL_SFX.detune).toBe(0.03);
    const credits = readFileSync(join(REPO_ROOT, "CREDITS.md"), "utf8");
    expect(credits).toContain("shovel-swing-{a,b,c}.m4a, shovel-tonk-{a,b,c}.m4a — original, Raven Flock, synthesized procedurally (gen_shovel_sfx.py, 2026-11-18).");
  });
  // F-07: the shovel files play as decoded buffers on the SFX bus (see shovel-sfx-bus.test.ts),
  // so a cue shows up as a buf.start line once its file has decoded.
  const flush = async () => { for (let i = 0; i < 5; i++) await new Promise((r) => setTimeout(r, 0)); };
  const plays = (kind: string) => env!.audio.lines
    .filter((l: string) => l.startsWith(`buf.start(sfx/shovel-${kind}-`))
    .map((l: string) => l.charAt(`buf.start(sfx/shovel-${kind}-`.length));
  it("a swing sound on every swing, round-robin with no immediate repeat; tonk only on a hit", async () => {
    const g = boot("rescue");
    place(g, 600, 518);
    g.steerCombat = () => {};
    for (let i = 0; i < 7; i++) { g.pulseUse(); secs(g, SHOVEL.cooldown + 0.05); await flush(); } // 7 misses
    const sw = plays("swing");
    expect(sw.length).toBe(7);
    for (let i = 1; i < sw.length; i++) expect(sw[i]).not.toBe(sw[i - 1]);
    expect(plays("tonk").length).toBe(0);
    for (let i = 0; i < 4; i++) { g.fish = []; fishAt(g, 50, 0); g.pulseUse(); secs(g, SHOVEL.cooldown + SHOVEL.hitStop + 0.05); await flush(); } // 4 hits
    expect(plays("swing").length).toBe(11);
    const tk = plays("tonk");
    expect(tk.length).toBe(4);
    for (let i = 1; i < tk.length; i++) expect(tk[i]).not.toBe(tk[i - 1]);
  });
  it("cue trim, playbackRate within ±3% with pitch following; reduced motion leaves audio unchanged", async () => {
    const g = boot("rescue", { reducedMotion: true });
    place(g, 600, 518);
    fishAt(g, 50, 0);
    g.pulseUse(); secs(g, 0.3); await flush();
    expect(plays("swing").length).toBe(1);
    expect(plays("tonk").length).toBe(1);
    const starts = env!.audio.lines.filter((l: string) => l.startsWith("buf.start(sfx/"));
    for (const l of starts) {
      const rate = +(l.match(/rate=([\d.]+)/)?.[1] ?? 1);
      expect(Math.abs(rate - 1)).toBeLessThanOrEqual(SHOVEL_SFX.detune + 1e-12);
    }
    expect(env!.audio.lines.some((l: string) => l.startsWith("new Audio(sfx/") || l.startsWith("play(sfx/"))).toBe(false);
  });
  it("nothing plays before audio is unlocked, and menus load no SFX", async () => {
    env?.restore();
    env = installEnv({ seed: 1 });
    const g: any = new Game(() => {});
    g.attach(env.canvas);
    g.startPhase("rescue");
    g.audio.swing();
    await flush();
    expect(env.audio.lines.some((l: string) => l.includes("sfx/"))).toBe(false);
  });
  it("level correction (0.48 on F-07's curve): every shovel cue (swing and tonk, all variants) plays at cue trim 0.48, whatever the Music slider says", async () => {
    expect(SHOVEL_CUE_TRIM).toBe(0.48);
    const g = boot("rescue");
    place(g, 600, 518);
    g.steerCombat = () => {};
    await flush();
    // F-07: each cue is source -> its own gain node -> SFX bus (sfx bus 1.0 x shovel cue trim 0.48)
    const ac = g.audio.ac;
    const cues: any[] = [];
    const mk = ac.createGain.bind(ac);
    ac.createGain = () => {
      const n = mk();
      n.connect = (to: any) => { if (to === g.audio.bus.sfx) cues.push(n); };
      return n;
    };
    for (const music of [0, 0.35, 1]) {
      g.audio.setMusic(music);
      for (let i = 0; i < 3; i++) { g.pulseUse(); secs(g, SHOVEL.cooldown + 0.05); await flush(); } // misses: swing only
      for (let i = 0; i < 3; i++) { g.fish = []; fishAt(g, 50, 0); g.pulseUse(); secs(g, SHOVEL.cooldown + SHOVEL.hitStop + 0.05); await flush(); } // hits: swing + tonk
    }
    expect(plays("swing").length).toBe(18);
    expect(plays("tonk").length).toBe(9);
    expect(new Set(plays("swing"))).toEqual(new Set(["a", "b", "c"]));
    expect(new Set(plays("tonk"))).toEqual(new Set(["a", "b", "c"]));
    expect(cues.length).toBe(27);
    for (const n of cues) expect(n.gain.value).toBe(0.48);
    // the trim is per cue: the SFX bus stays at 1.0 and the synth beeps keep their own 0.22
    expect(g.audio.busGain("sfx")).toBe(1);
    expect(g.audio.bus.sfx.gain.value).toBe(1);
    expect(g.audio.synth.gain.value).toBe(AUDIO.synthTrim);
    expect(AUDIO.synthTrim).toBe(0.22);
  });
  it("v0.3.1 QA minor: the six shovel cues are created and loaded at audio unlock (once), not on the first swing", async () => {
    env?.restore();
    env = installEnv({ seed: 1 });
    const fetched: string[] = [];
    const f = (globalThis as any).fetch;
    (globalThis as any).fetch = (u: string) => { fetched.push(u); return f(u); };
    const sfx = () => fetched.filter((u) => u.startsWith("sfx/"));
    const g: any = new Game(() => {});
    g.attach(env.canvas);
    g.startPhase("rescue");
    await flush();
    expect(sfx()).toEqual([]);
    g.audio.unlock();
    await flush();
    expect(sfx()).toEqual([...SHOVEL_SFX.swing, ...SHOVEL_SFX.tonk]);
    expect(env.audio.lines.some((l: string) => l.startsWith("buf.start(sfx/"))).toBe(false);
    g.audio.unlock(); // Retry / Continue unlock again: nothing is fetched again
    place(g, 600, 518);
    g.pulseUse(); secs(g, 0.1); await flush();
    expect(plays("swing").length).toBe(1);
    expect(sfx().length).toBe(6);
  });
});
