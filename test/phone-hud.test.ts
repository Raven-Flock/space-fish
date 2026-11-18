// F-04 phone HUD (VP-PHONE-HUD-v0.1 §2 + v0.1.2): layout math and the game-side changes, asserted
// on the pure layout module and the real Game. The DOM side is in phone-hud-ui.test.tsx.
import { afterEach, describe, expect, it } from "vitest";
import { Game } from "../src/game/Game";
import { HUD } from "../src/content/tuning/hud";
import { bleedOf } from "../src/engine/view";
import { drawBleedImage } from "../src/render/bleed";
import {
  coverCapPct,
  coverPct,
  fireInBleed,
  fireSize,
  isWide,
  trayFlips,
  trayStep,
  gapBetween,
  hudRects,
  overlaps,
  safeEdge,
  shipGuardX,
  stage,
  stickZoneRight,
  type HudPhase,
} from "../src/app/hudLayout";
import { installEnv, type Env } from "./helpers/fakeEnv";

const PHASES: HudPhase[] = ["stealth", "rescue", "base", "shooter"];
// the footprint upper bounds per viewport (recorded; QA re-measures the DOM)
const BOUNDS: Record<string, number> = {
  "844x390 stealth": 11.38,
  "844x390 rescue": 10.55,
  "844x390 base": 11.95,
  "844x390 shooter": 10.65,
  "844x390 shooter+boss": 11.83,
  "844x390 base+tray": 20.52, // building: exempt (VP v0.1.2 §3)
  "667x375 stealth": 14.54,
  "667x375 rescue": 13.45,
  "667x375 base": 14.98,
  "667x375 shooter": 13.58,
  "667x375 shooter+boss": 14.4,
  "667x375 base+tray": 25.6, // building: exempt
};
const PHONES: Array<[number, number]> = [
  [844, 390],
  [667, 375],
];

describe("VP rule 1: extend-width stage, no pillarbox", () => {
  it("844x390 is 1168.6 logical px wide with a 75.3 px bleed each side and no bars", () => {
    const s = stage(844, 390);
    expect(s.scale).toBeCloseTo(390 / 540, 6);
    expect(s.logicalW).toBeCloseTo(1168.6, 1);
    expect(s.bleedPx).toBeCloseTo(75.33, 2);
    expect(s.oy).toBe(0);
    expect(s.pillarboxPx).toBe(0);
  });
  it("667x375 is effectively 16:9 (bleed 0.17 px); 960x540 has none; narrower than 16:9 letterboxes (VP v0.1.2 §5)", () => {
    expect(stage(667, 375).bleedPx).toBeCloseTo(0.17, 2);
    expect(stage(667, 375).letterboxPx).toBe(0);
    expect(stage(960, 540).bleedPx).toBe(0);
    const d = stage(1280, 800);
    expect(d.bleedPx).toBe(0);
    expect(d.letterboxPx).toBeCloseTo(40, 9);
  });
  it("letterboxed: the HUD sits inside the stage, max(bar + 12, inset) from its top and bottom", () => {
    const r = hudRects(1280, 800, "base", { touch: true });
    expect(r.hp.y).toBeCloseTo(52, 9);
    expect(r.pause.y).toBeCloseTo(52, 9);
    expect(r.stick.y + r.stick.h).toBeCloseTo(800 - 52, 9);
    expect(hudRects(1280, 800, "base", { touch: true, insets: { left: 0, top: 60, right: 0, bottom: 0 } }).hp.y).toBe(60);
    expect(safeEdge(0, 40)).toBe(52);
    expect(safeEdge(60, 40)).toBe(60);
  });
  it("the bars are #070B10: the frame clears the whole canvas to it before the stage transform", () => {
    const env = installEnv({ seed: 1, width: 1280, height: 800 });
    try {
      env.draw.lines = [];
      const g: any = new Game(() => {});
      g.attach(env.canvas);
      g.startLoop();
      env.frame(1000 / 60);
      const lines = env.draw.lines!;
      const i = lines.indexOf('fillStyle="#070b10"');
      expect(i).toBeGreaterThanOrEqual(0);
      expect(lines[i + 1]).toMatch(/^fillRect\(0,0,/);
      expect(lines.slice(i).some((l) => l.startsWith("setTransform("))).toBe(true);
      g.detach();
    } finally {
      env.restore();
    }
  });
  it("engine/view.ts bleedOf() agrees with the layout module", () => {
    for (const [w, h] of [...PHONES, [960, 540], [1280, 800], [915, 412]] as Array<[number, number]>) {
      const s = stage(w, h);
      expect(bleedOf({ ox: s.ox, oy: s.oy, scale: s.scale })).toBeCloseTo(s.bleed, 9);
    }
  });
});

describe("VP rule 2: safe areas, max(12px, env(safe-area-inset-*))", () => {
  it("edges are 12 px with no inset and the inset when it is larger", () => {
    expect(safeEdge(0)).toBe(12);
    expect(safeEdge(5)).toBe(12);
    expect(safeEdge(47)).toBe(47);
  });
  it("with safe-area-inset-left 47 px no HUD text starts at x < 59 (chip padding 12)", () => {
    const r = hudRects(844, 390, "base", { touch: true, insets: { left: 47, top: 0, right: 0, bottom: 0 } });
    for (const k of ["hp", "objective"]) expect(r[k].x + HUD.chipPadX).toBeGreaterThanOrEqual(59);
    expect(r.stick.x).toBe(47);
    expect(stickZoneRight({ left: 47, top: 0, right: 0, bottom: 0 })).toBe(167);
  });
  it("the build tray clears the home indicator: padding-bottom max(8px, inset-bottom)", () => {
    const r = hudRects(844, 390, "base", { touch: true, tray: true, insets: { left: 0, top: 0, right: 0, bottom: 21 } });
    expect(r.tray.y + r.tray.h).toBe(390);
    expect(r.tray.h).toBe(8 + 44 + 21);
  });
});

describe("VP rules 3-5: strip, sizes, footprint", () => {
  it("one top strip <= 36 px; chips fit inside it; Pause: a 36 px plate (r10) in the strip, its 44x44 hit box hanging 8 px below", () => {
    expect(HUD.stripMaxH).toBe(36);
    expect(HUD.chipH).toBeLessThanOrEqual(36);
    expect(HUD.bossRowH).toBeLessThanOrEqual(36);
    expect(HUD.pausePlate).toBe(36);
    expect(HUD.pause).toBe(44);
    const r = hudRects(844, 390, "base", { touch: true });
    // plate at max(12px, inset) from the top and right: x 796..832, y 12..48; hit box 4 px wider each side
    expect(r.pause).toEqual({ x: 844 - 12 + 4 - 44, y: 12, w: 44, h: 44 });
    expect(r.pause.y + r.pause.h - (12 + HUD.stripMaxH)).toBe(8);
    expect(gapBetween(r.base, r.pause)).toBeGreaterThanOrEqual(8);
    expect(gapBetween(r.base, r.objective)).toBeGreaterThanOrEqual(8);
  });
  it("the cap is by aspect (VP v0.1.2 §1): 12% at 2:1 or wider, 15% narrower; Fire 72, or 64 below 2:1", () => {
    expect(isWide(844, 390)).toBe(true);
    expect(isWide(780, 390)).toBe(true);
    expect(isWide(779, 390)).toBe(false);
    expect(coverCapPct(844, 390)).toBe(12);
    expect(coverCapPct(667, 375)).toBe(15);
    expect(fireSize(844, 390)).toBe(72);
    expect(fireSize(667, 375)).toBe(64);
    expect(HUD.fireNarrow).toBeGreaterThanOrEqual(64);
  });
  for (const [w, h] of PHONES) {
    it(`${w}x${h}: every control >= 44 px, Fire ${fireSize(w, h)}, Use 56, >= 8 px between targets`, () => {
      for (const p of PHASES) {
        const r = hudRects(w, h, p, { touch: true });
        const targets = ["stick", "fire", "use", "noise", "sneak", "pause"].filter((k) => r[k]);
        for (const k of targets) expect(Math.min(r[k].w, r[k].h), `${p} ${k}`).toBeGreaterThanOrEqual(44);
        expect(r.fire.w).toBe(fireSize(w, h));
        expect(r.fire.h).toBe(fireSize(w, h));
        if (r.use) expect([r.use.w, r.use.h]).toEqual([56, 56]);
        for (let i = 0; i < targets.length; i++)
          for (let j = i + 1; j < targets.length; j++)
            expect(gapBetween(r[targets[i]], r[targets[j]]), `${p} ${targets[i]}/${targets[j]}`).toBeGreaterThanOrEqual(8);
      }
    });
    it(`${w}x${h}: HUD + controls <= ${coverCapPct(w, h)}% in every phase (chips at their max-width caps; the tray while building is exempt)`, () => {
      const cap = coverCapPct(w, h);
      for (const p of PHASES) expect(coverPct(w, h, hudRects(w, h, p, { touch: true })), p).toBeLessThanOrEqual(cap);
      expect(coverPct(w, h, hudRects(w, h, "shooter", { touch: true, boss: true })), "boss").toBeLessThanOrEqual(cap);
      // the 47 px notch moves things but adds no area
      const ins = { left: 47, top: 0, right: 0, bottom: 0 };
      for (const p of PHASES) expect(coverPct(w, h, hudRects(w, h, p, { touch: true, insets: ins })), `${p} notch`).toBeLessThanOrEqual(cap);
    });
  }
  it("right stack (VP v0.1.2 §5): Fire in the corner above its label line, Use 56 up-left with a 12 px gap, Sneak/Noise above Fire with room for labels", () => {
    const r = hudRects(844, 390, "stealth", { touch: true });
    expect(r.fire).toEqual({ x: 844 - 12 - 72, y: 390 - 12 - HUD.labelLine - 72, w: 72, h: 72 });
    expect(r.use.x + r.use.w + HUD.stackGap).toBe(r.fire.x);
    expect(r.use.y + r.use.h + HUD.stackGap).toBe(r.fire.y);
    expect(r.sneak.y + r.sneak.h + HUD.labelLine + HUD.gap).toBe(r.fire.y);
    expect(r.noise.y + r.noise.h + HUD.labelLine + HUD.gap).toBe(r.sneak.y);
    expect(hudRects(844, 390, "shooter", { touch: true }).use).toBeUndefined();
    expect(HUD.labelUses).toBe(3);
  });
  it("records the bounds QA re-measures (844x390 and 667x375; tray open is reported, not capped)", () => {
    const out: Record<string, number> = {};
    for (const [w, h] of PHONES) {
      for (const p of PHASES) out[`${w}x${h} ${p}`] = +coverPct(w, h, hudRects(w, h, p, { touch: true })).toFixed(2);
      out[`${w}x${h} shooter+boss`] = +coverPct(w, h, hudRects(w, h, "shooter", { touch: true, boss: true })).toFixed(2);
      out[`${w}x${h} base+tray`] = +coverPct(w, h, hudRects(w, h, "base", { touch: true, tray: true, trayW: 470 })).toFixed(2);
    }
    // upper bounds (chips at their caps); real Chrome sums come out a little lower (brief §Measured)
    expect(out).toEqual(BOUNDS);
  });
});

describe("VP rule 6: what may overlap play", () => {
  it("Fire is fully in the right bleed when the bleed is >= 84 px (no notch), not at 844x390 (75.3)", () => {
    expect(fireInBleed(stage(844, 390).bleedPx)).toBe(false);
    expect(fireInBleed(84)).toBe(true);
    expect(fireInBleed(83.9)).toBe(false);
    expect(fireInBleed(118, 47)).toBe(false);
    expect(fireInBleed(119, 47)).toBe(true);
    // geometry: 915x412 has a 91.3 px bleed, so Fire sits right of the central column
    const s = stage(915, 412);
    const r = hudRects(915, 412, "shooter", { touch: true });
    expect(fireInBleed(s.bleedPx)).toBe(true);
    expect(r.fire.x).toBeGreaterThanOrEqual(s.ox + HUD.columnW * s.scale);
  });
  for (const [w, h] of PHONES) {
    it(`${w}x${h} Transit: only Fire may enter the enemy entry lane (right 12% of the column, y 30-90%)`, () => {
      const s = stage(w, h);
      const colR = s.ox + HUD.columnW * s.scale;
      const lane = { x: colR - HUD.laneFrac * HUD.columnW * s.scale, y: 0.3 * h, w: HUD.laneFrac * HUD.columnW * s.scale, h: 0.6 * h };
      const r = hudRects(w, h, "shooter", { touch: true, boss: true });
      for (const [k, rect] of Object.entries(r)) if (k !== "fire") expect(overlaps(rect, lane), k).toBe(false);
    });
  }
});

describe("VP rule 6: the ship is never under the stick in Transit (clamp x >= stick zone + 24 px)", () => {
  let env: Env | null = null;
  afterEach(() => {
    env?.restore();
    env = null;
  });
  function fly(w: number, h: number, insetLeft: number, guard: boolean) {
    env = installEnv({ seed: 3, width: w, height: h, coarse: true });
    const g: any = new Game(() => {});
    g.attach(env.canvas);
    g.startPhase("shooter");
    g.resize();
    const stickR = stickZoneRight({ left: insetLeft, top: 0, right: 0, bottom: 0 });
    if (guard) g.setStickGuard(shipGuardX(stickR, g.view));
    let minLeft = Infinity;
    // QA's check: hold the stick fully down-left for 5 s
    for (let i = 0; i < 300; i++) {
      g.player.hp = g.player.maxHp;
      g.setStick(-Math.SQRT1_2, Math.SQRT1_2, true);
      g.tick(1 / 60);
      const left = g.view.ox + (g.player.x - HUD.shipHalfW - g.scroll) * g.view.scale;
      minLeft = Math.min(minLeft, left);
    }
    return { g, stickR, minLeft };
  }
  for (const [w, h] of PHONES) {
    for (const inset of [0, 47]) {
      it(`${w}x${h}, inset-left ${inset}: ship's left edge stays >= stick zone + 24 px`, () => {
        const { stickR, minLeft, g } = fly(w, h, inset, true);
        expect(minLeft).toBeGreaterThanOrEqual(stickR + HUD.shipClearPx - 1e-6);
        expect(g.player.x - g.scroll).toBeLessThanOrEqual(HUD.shipMaxX);
      });
    }
  }
  it("without the touch stick (guard 0) the live clamp is unchanged: x >= scroll + 36", () => {
    const { g } = fly(844, 390, 0, false);
    expect(g.player.x - g.scroll).toBeCloseTo(HUD.shipMinX, 6);
  });
  it("setting the guard mid-flight pushes a ship that is already under the stick out at once", () => {
    env = installEnv({ seed: 3, width: 844, height: 390, coarse: true });
    const g: any = new Game(() => {});
    g.attach(env.canvas);
    g.startPhase("shooter");
    g.player.x = g.scroll + 40;
    const x = shipGuardX(stickZoneRight(), g.view);
    g.setStickGuard(x);
    expect(g.player.x - g.scroll).toBeCloseTo(x, 6);
    g.setStickGuard(0);
    expect(g.stickGuardX).toBe(0);
  });
});

describe("VP rule 1 in the renderer: backgrounds paint the full stage, the camera keeps it inside the world", () => {
  let env: Env | null = null;
  afterEach(() => {
    env?.restore();
    env = null;
  });
  for (const phase of PHASES) {
    it(`${phase} at 844x390: clip and background cover x -104.3..1064.3 (no pillarbox)`, () => {
      env = installEnv({ seed: 1, width: 844, height: 390, coarse: true });
      env.draw.lines = [];
      const g: any = new Game(() => {});
      g.attach(env.canvas);
      g.startLoop();
      g.startPhase(phase);
      for (let i = 0; i < 5; i++) env.frame(1000 / 60);
      const b = bleedOf(g.view);
      expect(b).toBeCloseTo(104.31, 2);
      const f = (n: number) => String(n);
      const lines = env.draw.lines!;
      expect(lines).toContain(`rect(${f(0 - b)},0,${f(960 + 2 * b)},540)`);
      expect(lines.some((l) => l.startsWith(`fillRect(${f(0 - b)},0,${f(960 + 2 * b)},540)`))).toBe(true);
      g.detach();
    });
  }
  it("stealth at 844x390: the camera never shows past the world edge; at 960x540 it is the live clamp", () => {
    env = installEnv({ seed: 1, width: 844, height: 390 });
    const g: any = new Game(() => {});
    g.attach(env.canvas);
    g.startPhase("stealth");
    g.resize();
    const b = bleedOf(g.view);
    g.player.x = 40;
    g.updateCam();
    expect(g.camX).toBeCloseTo(b, 9);
    g.player.x = g.world.w - 10;
    g.updateCam();
    expect(g.camX + 960 + b).toBeCloseTo(g.world.w, 9);
    env.restore();
    env = installEnv({ seed: 1, width: 960, height: 540 });
    const d: any = new Game(() => {});
    d.attach(env.canvas);
    d.startPhase("stealth");
    d.resize();
    d.player.x = 40;
    d.updateCam();
    expect(d.camX).toBe(0);
  });
  it("a tap in the bleed is inside the stage (the bleed is not a dead zone)", () => {
    env = installEnv({ seed: 1, width: 844, height: 390, coarse: true });
    const g: any = new Game(() => {});
    g.attach(env.canvas);
    g.startPhase("rescue");
    g.resize();
    g.updateCam();
    expect(g.eventToWorld({ clientX: 10, clientY: 200 }).inside).toBe(true);
    expect(g.eventToWorld({ clientX: 834, clientY: 200 }).inside).toBe(true);
  });
});

describe("VP v0.1.2 §3: the Pad repair tray", () => {
  it("at most 96 px plus the bottom safe area; 8 + 44 + max(8, inset) when that is smaller", () => {
    expect(hudRects(844, 390, "base", { touch: true, tray: true }).tray.h).toBe(60);
    const r = hudRects(844, 390, "base", { touch: true, tray: true, insets: { left: 0, top: 0, right: 0, bottom: 34 } });
    expect(r.tray.h).toBeLessThanOrEqual(HUD.trayMaxH + 34);
    expect(r.tray.y + r.tray.h).toBe(390);
  });
  it("opens after a 0.3 s dwell within 150 px, or at once with a kind picked", () => {
    let s = trayStep({ open: false, nearSince: null }, 1000, 149, false, false);
    expect(s).toEqual({ open: false, nearSince: 1000 });
    s = trayStep(s, 1299, 120, false, false);
    expect(s.open).toBe(false);
    s = trayStep(s, 1300, 120, false, false);
    expect(s.open).toBe(true);
    // stepping out of 150 px before the dwell resets it
    expect(trayStep({ open: false, nearSince: 1000 }, 1200, 151, false, false)).toEqual({ open: false, nearSince: null });
    expect(trayStep({ open: false, nearSince: null }, 0, Infinity, true, false).open).toBe(true);
  });
  it("closes beyond 200 px (hysteresis: 150-200 px stays open, no flicker) or after a repair", () => {
    const open = { open: true, nearSince: 0 };
    expect(trayStep(open, 5000, 180, false, false).open).toBe(true);
    expect(trayStep(open, 5000, 200, false, false).open).toBe(true);
    expect(trayStep(open, 5000, 201, false, false).open).toBe(false);
    expect(trayStep(open, 5000, 10, false, true)).toEqual({ open: false, nearSince: null });
    // a closed tray needs 150 px and the dwell again, not 200
    expect(trayStep({ open: false, nearSince: null }, 0, 180, false, false)).toEqual({ open: false, nearSince: null });
  });
  it("flips to just under the top strip when the player or the target wreck would sit under it", () => {
    expect(trayFlips(390, 60, [200])).toBe(false);
    expect(trayFlips(390, 60, [200, 340])).toBe(true);
    expect(trayFlips(390, 60, [331])).toBe(true);
    expect(hudRects(844, 390, "base", { touch: true, tray: true, trayTop: true }).tray.y).toBe(12 + HUD.stripMaxH);
  });
  it("slides in over 200 ms", () => {
    expect(HUD.traySlideMs).toBe(200);
  });
});

describe("VP v0.1.2 §5: bleed backdrops", () => {
  function rec() {
    const calls: string[] = [];
    let alpha = 1;
    const r2 = (n: number) => +n.toFixed(2);
    const ctx: any = {
      drawImage: (...a: any[]) => calls.push(`draw(${a.slice(1).map(r2).join(",")})@${alpha}`),
      save: () => calls.push("save"),
      restore: () => { calls.push("restore"); alpha = 1; },
      beginPath() {},
      rect: (...a: number[]) => calls.push(`rect(${a.map(r2).join(",")})`),
      clip() {},
      translate: (x: number) => calls.push(`translate(${r2(x)})`),
      scale: (x: number, y: number) => calls.push(`scale(${x},${y})`),
      set globalAlpha(v: number) { alpha = +v.toFixed(4); },
      get globalAlpha() { return alpha; },
    };
    return { ctx, calls };
  }
  const img = {};
  it("with no bleed it is exactly the old single drawImage", () => {
    const a = rec();
    drawBleedImage(a.ctx, img, null, 0, 40, 960, 500, 0);
    expect(a.calls).toEqual(["draw(0,40,960,500)@1"]);
    const b = rec();
    drawBleedImage(b.ctx, img, [0, 10, 300, 60], -40, 0, 1120, 108, 0);
    expect(b.calls).toEqual(["draw(0,10,300,60,-40,0,1120,108)@1"]);
  });
  it("844x390 ground: stretches by at most 5% about the centre, then mirror-extends with a 48 px blend", () => {
    const b = 104.31;
    const { ctx, calls } = rec();
    drawBleedImage(ctx, img, null, 0, 40, 960, 500, b);
    expect(calls[0]).toBe("draw(-24,40,1008,500)@1");
    expect(1008 / 960).toBeLessThanOrEqual(HUD.bleedStretchMax);
    // mirrors reflect about lines 24 px inside each edge; only flipped copies follow
    expect(calls).toContain(`translate(${2 * (-24 + 24)})`);
    expect(calls).toContain(`translate(${2 * (984 - 24)})`);
    expect(calls.filter((c) => c.startsWith("scale(")).every((c) => c === "scale(-1,1)")).toBe(true);
    // the blend band: 8 stepped-alpha strips each side over 48 px, fading the mirror in outward
    const strips = calls.filter((c) => c.startsWith("draw(") && !c.endsWith("@1"));
    expect(strips.length).toBe(16);
    expect(calls).toContain("rect(-24,40,6,500)");
    // the solid mirror covers the rest of the bleed out to -b
    expect(calls).toContain(`rect(${-b},40,${+(b - 24).toFixed(2)},500)`);
  });
  it("a backdrop that covers the stage within 5% only stretches (no mirror)", () => {
    const { ctx, calls } = rec();
    drawBleedImage(ctx, img, null, 0, 40, 960, 500, 20);
    expect(calls).toEqual(["draw(-20,40,1000,500)@1"]);
  });
  it("Jupiter keeps its authored scale in flight and on its scene; plates keep their 540-tall fit, centred", () => {
    const env = installEnv({ seed: 1, width: 844, height: 390, coarse: true });
    try {
      const g: any = new Game(() => {});
      g.attach(env.canvas);
      g.resize();
      const calls: any[][] = [];
      g.ctx = new Proxy({}, {
        get: (_t, k) =>
          k === "drawImage" ? (...a: any[]) => calls.push(a)
          : k === "createLinearGradient" || k === "createRadialGradient" ? () => ({ addColorStop() {} })
          : () => {},
        set: () => true,
      });
      const jup = { complete: true, naturalWidth: 1320, naturalHeight: 572 };
      g.rim = { ...(g.rim || {}), jupiter: jup };
      g.imgOk = (x: any) => !!x && x.complete !== false;
      g.scroll = 0;
      g.paintFlight(g.ctx);
      expect(calls.find((c) => c[0] === jup)!.slice(1)).toEqual([-220, -16, 1320, 572]);
      calls.length = 0;
      g.drawScene("jupiter", 0);
      expect(calls.find((c) => c[0] === jup)!.slice(1)).toEqual([0, 0, 960, 540]);
      calls.length = 0;
      const plate = { complete: true, naturalWidth: 1920, naturalHeight: 1080 };
      g.cine = { p1: plate };
      g.cut = [{ plate: "p1" }];
      g.beat = 0;
      g.reduce = true;
      g.drawCine(0.5);
      const [x, y, w, h] = calls.find((c) => c[0] === plate)!.slice(1);
      expect(w).toBeCloseTo(960 * 1.04, 6);
      expect(h).toBeCloseTo(540 * 1.04, 6);
      expect(x + w / 2).toBeCloseTo(480, 6);
      expect(y + h / 2).toBeCloseTo(270, 6);
      g.detach();
    } finally {
      env.restore();
    }
  });
});
