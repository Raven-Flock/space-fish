// Parity: the source must behave exactly like the bundle live serves (main 1c9c028),
// except for the intended differences (touch-aim fix N-1, the D-11 shovel, and F-07:
// music/VO on Web Audio gain, compared as SFX calls + music/VO intent, see INTENDED.audio).
// Those are switched off by liveEquivalent(Game), which stubs exactly the entry
// points listed in helpers/sim.ts INTENDED; everything else must match frame for
// frame. The fixed behaviour itself is asserted in live-fixes.test.ts.
// Same seed, same inputs, same clock -> same state, same draw calls, same SFX calls,
// same music/VO intent.
import { beforeAll, describe, expect, it } from "vitest";
import { Game } from "../src/game/Game";
import { loadLive } from "./helpers/liveOracle";
import { INTENDED, liveEquivalent, makeAutopilot, runSim } from "./helpers/sim";

const Ours = liveEquivalent(Game);

let live: any;
beforeAll(async () => {
  live = await loadLive();
});

function compare(a: ReturnType<typeof runSim>, b: ReturnType<typeof runSim>) {
  expect(b.transitions).toEqual(a.transitions);
  for (let i = 0; i < Math.max(a.trace.length, b.trace.length); i++) {
    // first divergence gives the clearest failure
    expect(b.trace[i], `sample ${i} (frame ${a.trace[i]?.f})`).toEqual(a.trace[i]);
  }
  expect(b.final).toEqual(a.final);
  expect(b.snaps).toEqual(a.snaps);
  expect(b.audioLog).toEqual(a.audioLog);
  expect(b.audioIntent).toEqual(a.audioIntent);
  expect(b.storage).toEqual(a.storage);
  // the intended new per-fish state never appears in a parity run
  for (const t of b.trace) for (const f of t.s.fish ?? []) for (const k of INTENDED.fishKeys) expect(f).not.toHaveProperty(k);
}

// Scripted inputs per phase: walk, sneak, fire, aim, noise, use, build.
function script(g: any, env: any, f: number) {
  const hold = (code: string, from: number, to: number) => {
    if (f === from) env.key("keydown", code);
    if (f === to) env.key("keyup", code);
  };
  hold("KeyD", 5, 200);
  hold("ShiftLeft", 60, 120);
  hold("KeyS", 150, 260);
  hold("Space", 100, 400);
  hold("KeyW", 300, 420);
  hold("KeyA", 430, 520);
  if (f === 140) env.key("keydown", "KeyQ");
  if (f === 141) env.key("keyup", "KeyQ");
  if (f === 220) g.pulseUse();
  if (f % 37 === 0) env.pointer("pointermove", 300 + (f % 200), 200 + (f % 120));
  if (f === 250) env.pointer("pointerdown", 500, 300);
  if (f === 330) env.key("keydown", "Digit1");
  if (f === 331) { env.key("keyup", "Digit1"); env.pointer("pointerdown", 200, 300); }
  if (f === 360) { env.key("keydown", "Escape"); env.key("keyup", "Escape"); }
  if (f === 380) { env.key("keydown", "Escape"); env.key("keyup", "Escape"); }
}

describe("phase sims match live 1c9c028", () => {
  for (const phase of ["stealth", "rescue", "base", "shooter"]) {
    for (const seed of [1, 7]) {
      it(`${phase} seed ${seed}: 600 frames of scripted input`, () => {
        const o = { seed, frames: 600, sampleEvery: 10, start: (g: any) => g.startPhase(phase), step: script };
        compare(runSim(live.Game, o), runSim(Ours, o));
      });
    }
  }

  it("?phase= launch override and ?qa=1 match", () => {
    for (const search of ["?phase=base", "?qa=1", "?phase=nope", ""]) {
      const o = { seed: 3, search, frames: 120, start: (g: any) => g.startNew() };
      compare(runSim(live.Game, o), runSim(Ours, o));
    }
  });

  it("intro cutscene plays in real time, beats advance on Space/Enter, Skip works", () => {
    const o = {
      seed: 5,
      frames: 2700,
      start: (g: any) => g.startNew(),
      step: (g: any, env: any, f: number) => {
        if (f === 400 || f === 900) { env.key("keydown", "Space"); env.key("keyup", "Space"); }
        if (f === 1300) { env.key("keydown", "Enter"); env.key("keyup", "Enter"); }
        if (f === 2000) g.skipCutscene();
      },
    };
    compare(runSim(live.Game, o), runSim(Ours, o));
  });

  it("a v1 save from live resumes the same phase (Continue), music level persists", () => {
    for (const phase of ["stealth", "rescue", "base", "shooter"]) {
      const storage = { "spacefish-v1": JSON.stringify({ version: 1, phase }), "spacefish-music": "0.35" };
      const o = { seed: 2, frames: 90, storage, start: (g: any) => g.continueGame() };
      const a = runSim(live.Game, o);
      const b = runSim(Ours, o);
      compare(a, b);
      expect(b.final.s.phase).toBe(phase);
      expect(b.final.s.musicVol).toBe(0.35);
    }
  });

  it("menu, credits, back, death and retry match", () => {
    const o = {
      seed: 9,
      frames: 1500,
      start: (g: any) => g.openCredits(),
      step: (g: any, _env: any, f: number) => {
        if (f === 30) g.backToMenu();
        if (f === 60) g.startPhase("shooter");
        if (g.mode === "dead" && f % 50 === 0) g.retry();
      },
    };
    compare(runSim(live.Game, o), runSim(Ours, o));
  });
});

describe("the parity harness is not vacuous (mutation checks)", () => {
  it("a 1% fish speed change is caught", () => {
    class Mutant extends Ours {
      stepToward(f: any, tx: number, ty: number, speed: number, dt: number) {
        return super.stepToward(f, tx, ty, speed * 1.01, dt);
      }
    }
    const o = { seed: 1, frames: 600, sampleEvery: 10, start: (g: any) => g.startPhase("rescue"), step: script };
    expect(() => compare(runSim(live.Game, o), runSim(Mutant, o))).toThrow();
  });
  it("fish HP off by one is caught", () => {
    class Mutant extends Ours {
      makeFish(x: number, y: number, wps: any[]) { const f = super.makeFish(x, y, wps); f.hp += 1; return f; }
    }
    const o = { seed: 1, frames: 600, sampleEvery: 10, start: (g: any) => g.startPhase("base"), step: script };
    expect(() => compare(runSim(live.Game, o), runSim(Mutant, o))).toThrow();
  });
  // v0.3 intended differences: each stub really switches its change off in parity runs
  it("the Rim chase at the new 140 (instead of live 160) is caught", () => {
    class Mutant extends Ours { rimChaseSpeed() { return 140; } }
    const o = { seed: 1, frames: 600, sampleEvery: 10, start: (g: any) => g.startPhase("stealth"), step: script };
    expect(() => compare(runSim(live.Game, o), runSim(Mutant, o))).toThrow();
  });
  it("a fish search leaking into the live path is caught", () => {
    class Mutant extends Ours {
      fishSearch(f: any, dt: number) { f.search = 1; return (Game.prototype as any).fishSearch.call(this, f, dt); }
    }
    const o = { seed: 1, frames: 600, sampleEvery: 10, start: (g: any) => g.startPhase("stealth"), step: script };
    expect(() => compare(runSim(live.Game, o), runSim(Mutant, o))).toThrow();
  });
  it("the N-5 click-repair reach is caught (a far click on a wreck)", () => {
    class Mutant extends Ours { clickRepairRefused() { return true; } }
    const o = {
      seed: 1, frames: 120, sampleEvery: 10, start: (g: any) => g.startPhase("base"),
      step: (g: any, env: any, f: number) => {
        if (f === 30) {
          const w = g.structures.find((s: any) => s.x === 860 && s.y === 640); // on screen, ~580 px from the player
          env.pointer("pointerdown", g.view.ox + (w.x - g.camX) * g.view.scale, g.view.oy + (w.y - g.camY) * g.view.scale);
        }
      },
    };
    const a = runSim(live.Game, o);
    expect(a.final.s.structures.some((s: any) => s.repaired)).toBe(true); // live repairs from anywhere on screen
    compare(a, runSim(Ours, o));
    expect(() => compare(a, runSim(Mutant, o))).toThrow();
  });
  it("the N-8 facing lock cone is caught (keyboard-only fire at a fish off to the side)", () => {
    class Mutant extends Ours { facingAimLock() { return true; } }
    const o = {
      seed: 1, frames: 60, sampleEvery: 5, start: (g: any) => g.startPhase("rescue"),
      step: (g: any, env: any, f: number) => {
        if (f === 0) {
          g.dir = 2; g.fish = [g.makeFish(g.player.x, g.player.y - 150, [])];
          g.steerCombat = () => {};
          env.key("keydown", "Space");
        }
      },
    };
    const a = runSim(live.Game, o);
    compare(a, runSim(Ours, o));
    expect(() => compare(a, runSim(Mutant, o))).toThrow();
  });
  it("N-8 priority: with a target inside ±0.55 of facing, the facing rule on still matches live exactly", () => {
    class Mutant extends Ours { facingAimLock() { return true; } }
    const o = {
      seed: 1, frames: 60, sampleEvery: 5, start: (g: any) => g.startPhase("rescue"),
      step: (g: any, env: any, f: number) => {
        if (f === 0) {
          g.dir = 2;
          const ahead = g.makeFish(g.player.x + 200, g.player.y + 10, []);
          ahead.hp = 10000; // stays alive, so the cone is never empty
          g.fish = [g.makeFish(g.player.x - 100, g.player.y, []), ahead];
          g.steerCombat = () => {};
          env.key("keydown", "Space");
        }
      },
    };
    compare(runSim(live.Game, o), runSim(Mutant, o));
  });
  it("N-5: the on-wreck tap condition is caught (an in-reach press 60 px off the wreck)", () => {
    class Mutant extends Ours {
      clickRepairRefused(x: number, y: number) { return (Game.prototype as any).clickRepairRefused.call(this, x, y); }
    }
    const o = {
      seed: 1, frames: 60, sampleEvery: 5, start: (g: any) => g.startPhase("base"),
      step: (g: any, env: any, f: number) => {
        if (f === 10) {
          const w = g.structures.find((s: any) => s.x === 860 && s.y === 640);
          g.player.x = w.x; g.player.y = w.y - 100;
        }
        if (f === 20) {
          const w = g.structures.find((s: any) => s.x === 860 && s.y === 640);
          env.pointer("pointerdown", g.view.ox + (w.x - g.camX) * g.view.scale, g.view.oy + (w.y - 60 - g.camY) * g.view.scale);
        }
      },
    };
    const a = runSim(live.Game, o);
    expect(a.final.s.structures.some((s: any) => s.repaired)).toBe(true); // live: within 72 px repairs
    compare(a, runSim(Ours, o));
    expect(() => compare(a, runSim(Mutant, o))).toThrow();
  });
  it("the VP Transit hint timer leaking into a parity run is caught", () => {
    class Mutant extends Ours {
      tickTransitHint(dt: number) { return (Game.prototype as any).tickTransitHint.call(this, dt); }
    }
    const o = { seed: 1, frames: 600, sampleEvery: 10, start: (g: any) => g.startPhase("shooter"), step: script };
    expect(() => compare(runSim(live.Game, o), runSim(Mutant, o))).toThrow();
  });
  it("the real Game differs from live on the Rim (chase 140)", () => {
    const o = { seed: 1, frames: 600, sampleEvery: 10, start: (g: any) => g.startPhase("stealth"), step: script };
    expect(() => compare(runSim(live.Game, o), runSim(Game, o))).toThrow();
  });
  it("F-05: the real Game differs from live where intended: a plate that never arrives holds beat 1 (until the 12 s cap)", () => {
    class NoPlates extends Game {
      requestPlate() {}
    }
    const o = { seed: 5, frames: 900, start: (g: any) => g.startNew() };
    expect(() => compare(runSim(live.Game, o), runSim(NoPlates, o))).toThrow();
    expect(runSim(NoPlates, o).transitions.map((t) => t.k)).toEqual(["cutscene:stealth:intro"]);
  });
  it("the real Game (fixes on) differs from live where intended: a Use away from interactables swings", () => {
    const o = { seed: 1, frames: 600, sampleEvery: 10, start: (g: any) => g.startPhase("rescue"), step: script };
    expect(() => compare(runSim(live.Game, o), runSim(Game, o))).toThrow();
  });
  it("F-02: turning only the pause freeze back on differs from live (the script's Esc pause holds the sim still)", () => {
    class FreezeOn extends Ours {
      pausedFreeze() { return (Game.prototype as any).pausedFreeze.call(this); }
    }
    const o = { seed: 1, frames: 600, sampleEvery: 10, start: (g: any) => g.startPhase("shooter"), step: script };
    expect(() => compare(runSim(live.Game, o), runSim(FreezeOn, o))).toThrow();
  });
});

describe("full run, start to victory (QA autopilot routes)", () => {
  for (const seed of [11, 23]) {
    it(`seed ${seed}: same timeline and end state as live`, () => {
      const run = (G: any) =>
        runSim(G, {
          seed,
          frames: 60 * 400,
          sampleEvery: 120,
          start: (g: any) => g.startNew(),
          step: (() => {
            const ap = makeAutopilot();
            return (g: any, env: any, f: number) => {
              if (f === 90) g.skipCutscene(); // QA clicks Skip after 1.5 s
              ap(g, env, f);
            };
          })(),
          stopWhen: (g: any) => g.mode === "victory",
        });
      const a = run(live.Game);
      const b = run(Ours);
      compare(a, b);
      expect(b.final.s.mode).toBe("victory");
      // eslint-disable-next-line no-console
      console.log(`seed ${seed}: victory at ${b.simSeconds.toFixed(1)} s sim time`, JSON.stringify(b.transitions));
    });
  }
});
