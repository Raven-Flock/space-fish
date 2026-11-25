// F-02 touch pause (GD F02-TOUCH-PAUSE-v0.1; AAA v0.1 §1.5-1.6), asserted on the real Game.
// Parity (sim-parity / ui-parity) runs with these entry points stubbed; here they are on.
import { afterEach, describe, expect, it, vi } from "vitest";
import { Game } from "../src/game/Game";
import { AudioDirector } from "../src/audio/AudioDirector";
import { PAUSE } from "../src/content/tuning/pause";
import { MUTE_KEY, SAVE_KEY } from "../src/save/keys";
import { installEnv, type Env } from "./helpers/fakeEnv";
import { pickState } from "./helpers/sim";

/** sim state without the rAF loop's own bookkeeping (clock, accumulator, frame id, HUD throttle) */
const simState = (g: any) => {
  const { acc, last, raf, hudAcc, ...rest } = pickState(g);
  return rest;
};

const DT = 1 / 60;
let env: Env | null = null;
let restoreGlobals: Array<() => void> = [];
afterEach(() => {
  env?.restore();
  env = null;
  for (const r of restoreGlobals.reverse()) r();
  restoreGlobals = [];
});

/** a minimal document for visibilitychange (the node fake env has none) */
function fakeDocument() {
  const ls = new Map<string, Array<(e: any) => void>>();
  const doc: any = {
    visibilityState: "visible",
    addEventListener: (t: string, f: any) => ls.set(t, [...(ls.get(t) ?? []), f]),
    removeEventListener: (t: string, f: any) => ls.set(t, (ls.get(t) ?? []).filter((x) => x !== f)),
    emit: (t: string) => { for (const f of ls.get(t) ?? []) f({ type: t }); },
  };
  setGlobal("document", doc);
  return doc;
}
function setGlobal(k: string, v: any) {
  const d = Object.getOwnPropertyDescriptor(globalThis, k);
  Object.defineProperty(globalThis, k, { value: v, configurable: true, writable: true });
  restoreGlobals.push(() => { if (d) Object.defineProperty(globalThis, k, d); else delete (globalThis as any)[k]; });
}

function boot(phase: string | null, opts: { storage?: Record<string, string>; doc?: boolean } = {}) {
  env?.restore();
  env = installEnv({ seed: 1, storage: opts.storage });
  const doc = opts.doc === false ? null : fakeDocument();
  const g: any = new Game(() => {});
  g.attach(env.canvas);
  g.startLoop();
  if (phase) {
    g.audio.unlock();
    g.startPhase(phase);
  }
  return { g, doc, env: env! };
}
/** real frames through the game's own rAF loop (also advances performance.now) */
const frames = (n: number) => { for (let i = 0; i < n; i++) env!.frame(1000 / 60); };
const secs = (s: number) => frames(Math.round(s / DT));
const key = (code: string) => { env!.key("keydown", code); env!.key("keyup", code); };

describe("pause freezes the whole sim", () => {
  it("in play: fixed step, timers, fish, stagger, bullets, particles, alert and the clock all hold", () => {
    const { g } = boot("rescue");
    env!.key("keydown", "Space"); // fire so bullets and particles exist
    env!.key("keydown", "KeyD");
    secs(1.5);
    g.fish[0].stagger = 0.4;
    g.fireCd = 0.3;
    g.invuln = 0.5;
    g.shake = 0.8;
    expect(g.bullets.length + g.particles.length).toBeGreaterThan(0);
    expect(g.pauseGame()).toBe(true);
    const before = simState(g);
    secs(5);
    expect(simState(g)).toEqual(before);
    g.resume();
    secs(0.5);
    expect(g.time).toBeGreaterThan(before.time);
    expect(g.fish[0].stagger ?? 0).toBeLessThan(0.4);
  });
  it("Transit: the scroll, spawns and waves hold", () => {
    const { g } = boot("shooter");
    secs(2);
    g.pauseGame();
    const s = { scroll: g.scroll, spawnAcc: g.spawnAcc, spawnN: g.spawnN, fish: JSON.stringify(g.fish), time: g.time };
    secs(10);
    expect({ scroll: g.scroll, spawnAcc: g.spawnAcc, spawnN: g.spawnN, fish: JSON.stringify(g.fish), time: g.time }).toEqual(s);
  });
  it("a cutscene pause holds the beat and its timer; resume goes back to the same beat", () => {
    const { g } = boot(null);
    g.audio.unlock();
    g.beginCutscene("intro");
    secs(2);
    const beatT = g.beatT;
    expect(g.autoPause({ type: "blur" })).toBe(true);
    expect(g.mode).toBe("pause");
    expect(g.pauseFrom).toBe("cutscene");
    secs(30); // longer than every beat
    expect(g.beat).toBe(0);
    expect(g.beatT).toBe(beatT);
    g.resume();
    expect(g.mode).toBe("cutscene");
    secs(5.5);
    expect(g.beat).toBe(1);
  });
  it("screen shake doesn't jitter while paused (no random draws)", () => {
    const { g } = boot("stealth");
    g.shake = 1;
    g.pauseGame();
    let calls = 0;
    const r = Math.random;
    Math.random = () => { calls++; return r(); };
    frames(30);
    Math.random = r;
    expect(calls).toBe(0);
  });
});

describe("ways in and out", () => {
  it("Esc and P pause and resume in play; neither pauses the title, credits or a cutscene", () => {
    const { g } = boot("stealth");
    for (const k of ["Escape", "KeyP"]) {
      key(k);
      expect(g.mode).toBe("pause");
      key(k);
      expect(g.mode).toBe("play");
    }
    g.backToMenu();
    key("KeyP");
    expect(g.mode).toBe("menu");
    g.openCredits();
    key("Escape");
    expect(g.mode).toBe("credits");
    g.beginCutscene("arm");
    key("KeyP");
    expect(g.mode).toBe("cutscene");
  });
  it("the Pause button route pauses only from play or a cutscene", () => {
    const { g } = boot("stealth");
    for (const m of ["menu", "credits", "dead", "victory"]) {
      g.mode = m;
      expect(g.pauseGame()).toBe(false);
      expect(g.mode).toBe(m);
    }
    g.mode = "play";
    expect(g.pauseGame()).toBe(true);
    expect(g.pauseGame()).toBe(false); // already paused
  });
  it("gamepad Start toggles pause on the press edge only", () => {
    const pad = { buttons: Array.from({ length: 17 }, () => ({ pressed: false })) };
    setGlobal("navigator", { getGamepads: () => [pad] });
    const { g } = boot("stealth");
    pad.buttons[PAUSE.padStartButton].pressed = true;
    frames(1);
    expect(g.mode).toBe("pause");
    frames(30); // still held: no toggle
    expect(g.mode).toBe("pause");
    pad.buttons[PAUSE.padStartButton].pressed = false;
    frames(1);
    pad.buttons[PAUSE.padStartButton].pressed = true;
    frames(1);
    expect(g.mode).toBe("play");
  });
});

describe("held input is cleared on pause (no stuck stick, Fire or aim)", () => {
  it("keys, stick, Fire, Use, Noise, tap-to-walk and the touch-aim point all clear", () => {
    const { g } = boot("rescue");
    env!.key("keydown", "KeyD");
    env!.key("keydown", "Space");
    g.setStick(0.8, 0, true);
    g.setFire(true);
    g.aimPointer = "touch"; g.aimOk = true; g.aimX = 10; g.aimY = 10;
    g.interactPulse = true; g.decoyPulse = true; g.shotPulse = true;
    g.tap = { x: 5, y: 5 };
    g.pauseGame();
    expect([...g.keys]).toEqual([]);
    expect([g.stickX, g.stickY, g.fireLatch, g.shotPulse, g.interactPulse, g.decoyPulse, g.tap, g.aimOk]).toEqual([0, 0, false, false, false, false, null, false]);
    g.resume();
    const x = g.player.x;
    g.bullets = [];
    secs(1);
    expect(g.player.x).toBe(x);
    expect(g.bullets.length).toBe(0);
  });
});

describe("GD ruling 2026-11-18: held input re-acquires after the resume window (game side)", () => {
  const lockFrames = Math.floor(PAUSE.resumeIgnoreMs / (1000 / 60)) + 1; // first frame with now >= lock
  it("onReacquire runs once, on the first frame after the window, and only when resuming into play", () => {
    const { g } = boot("rescue");
    let calls = 0;
    g.onReacquire = () => { calls++; expect(g.inputLocked()).toBe(false); };
    g.pauseGame();
    frames(30);
    expect(calls).toBe(0); // never while paused
    g.resume();
    frames(lockFrames - 1);
    expect(calls).toBe(0);
    frames(1);
    expect(calls).toBe(1);
    frames(30);
    expect(calls).toBe(1);
    // pausing again inside the window cancels it
    g.pauseGame();
    g.resume();
    frames(2);
    g.pauseGame();
    frames(lockFrames + 5);
    expect(calls).toBe(1);
    // a cutscene resume never re-acquires play input
    g.beginCutscene("intro");
    g.pauseGame();
    g.resume();
    expect(g.mode).toBe("cutscene");
    frames(lockFrames + 5);
    expect(calls).toBe(1);
  });
  it("(4) keyboard: a key held through the pause needs a fresh press (auto-repeat is ignored); (5) a key released while paused leaves nothing stuck", () => {
    const { g } = boot("rescue");
    g.fish = []; g.covers = [];
    env!.key("keydown", "KeyD");
    env!.key("keydown", "KeyW");
    g.pauseGame();
    env!.key("keyup", "KeyW"); // lifted while paused
    g.resume();
    frames(lockFrames + 2);
    expect([...g.keys]).toEqual([]);
    const x = g.player.x, y = g.player.y;
    env!.win.emit("keydown", { code: "KeyD", key: "KeyD", repeat: true, preventDefault() {} }); // still held: auto-repeat
    frames(10);
    expect([g.player.x, g.player.y]).toEqual([x, y]);
    env!.key("keyup", "KeyD");
    env!.key("keydown", "KeyD"); // a fresh press
    frames(10);
    expect(g.player.x).toBeGreaterThan(x);
    expect(g.player.y).toBe(y);
  });
  it("(4) gamepad: read live after the window; Start held through it neither re-pauses nor leaves input latched", () => {
    const pad = { buttons: Array.from({ length: 17 }, () => ({ pressed: false })) };
    setGlobal("navigator", { getGamepads: () => [pad] });
    const { g } = boot("rescue");
    pad.buttons[PAUSE.padStartButton].pressed = true;
    frames(1);
    expect(g.mode).toBe("pause");
    pad.buttons[PAUSE.padStartButton].pressed = false;
    frames(1);
    pad.buttons[PAUSE.padStartButton].pressed = true; // resume, and keep holding Start
    frames(1);
    expect(g.mode).toBe("play");
    frames(lockFrames + 10);
    expect(g.mode).toBe("play");
    expect([g.stickX, g.stickY, g.fireLatch]).toEqual([0, 0, false]);
    pad.buttons[PAUSE.padStartButton].pressed = false;
    frames(1);
    pad.buttons[PAUSE.padStartButton].pressed = true; // live state: a new press pauses at once
    frames(1);
    expect(g.mode).toBe("pause");
  });
});

describe("auto-pause", () => {
  it("tab hidden, window blur and pagehide pause during play and cutscenes", () => {
    for (const how of ["hidden", "blur", "pagehide"]) {
      for (const where of ["play", "cutscene"]) {
        const { g, doc } = boot("stealth");
        if (where === "cutscene") g.beginCutscene("arm");
        if (how === "hidden") { doc.visibilityState = "hidden"; doc.emit("visibilitychange"); }
        else env!.win.emit(how, { type: how });
        expect(g.mode, `${how} in ${where}`).toBe("pause");
        expect(g.pauseFrom).toBe(where);
      }
    }
  });
  it("never on the title, credits, death or victory screens", () => {
    for (const m of ["menu", "credits", "dead", "victory"]) {
      const { g, doc } = boot("stealth");
      g.mode = m;
      doc.visibilityState = "hidden"; doc.emit("visibilitychange");
      env!.win.emit("blur", { type: "blur" });
      env!.win.emit("pagehide", { type: "pagehide" });
      expect(g.mode).toBe(m);
    }
  });
  it("coming back visible never resumes: the Paused panel stays", () => {
    const { g, doc } = boot("stealth");
    doc.visibilityState = "hidden"; doc.emit("visibilitychange");
    doc.visibilityState = "visible"; doc.emit("visibilitychange");
    env!.win.emit("focus", { type: "focus" });
    secs(2);
    expect(g.mode).toBe("pause");
  });
  it("backgrounded mid-chase: 0 damage while hidden (the same fish hurts once resumed)", () => {
    const { g, doc } = boot("stealth");
    g.player.x = 900; g.player.y = 600; g.invuln = 0;
    const f = g.makeFish(g.player.x + 4, g.player.y, []);
    g.fish = [f];
    g.alert = 3; g.alerted = true;
    doc.visibilityState = "hidden"; doc.emit("visibilitychange");
    const hp = g.player.hp;
    secs(20);
    expect(g.player.hp).toBe(hp);
    g.resume();
    secs(1);
    expect(g.player.hp).toBeLessThan(hp);
  });
});

describe(`gameplay input is ignored for ${PAUSE.resumeIgnoreMs} ms after a resume`, () => {
  it("no shot, swing, Use, Noise or canvas tap from the resume; movement still works; then all inputs work", () => {
    const { g } = boot("rescue");
    g.player.x = 600; g.player.y = 518; g.fish = []; g.covers = [];
    g.updateCam();
    secs(0.5);
    g.pauseGame();
    g.resume();
    g.bullets = [];
    env!.key("keydown", "Space");
    env!.pointer("pointerdown", 480, 270);
    env!.pointer("pointerdown", 480, 270, "touch");
    g.setFire(true);
    g.pulseUse();
    g.pulseNoise();
    env!.key("keydown", "KeyD");
    frames(2);
    expect(g.bullets.length).toBe(0);
    expect(g.swing).toBe(null);
    expect([g.fireLatch, g.interactPulse, g.decoyPulse, g.tap, g.keys.has("Space")]).toEqual([false, false, false, null, false]);
    expect(g.keys.has("KeyD")).toBe(true);
    frames(Math.ceil((PAUSE.resumeIgnoreMs / 1000) / DT));
    expect(g.inputLocked()).toBe(false);
    env!.key("keyup", "Space");
    env!.key("keydown", "Space");
    frames(2);
    expect(g.bullets.length).toBeGreaterThan(0);
  });
});

describe("audio while paused (F-07's AudioDirector API)", () => {
  const flush = async () => { for (let i = 0; i < 5; i++) await new Promise((r) => setTimeout(r, 0)); };
  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
  /** does the log hold `gain.<verb>(<args>)` with these numbers (to 1e-9)? */
  const has = (lines: string[], verb: string, ...want: number[]) =>
    lines.some((l) => {
      const m = l.match(new RegExp(`^gain\\.${verb}\\(([^)]*)\\)$`));
      if (!m) return false;
      const got = m[1].split(",").map(Number);
      return got.length === want.length && got.every((v, i) => Math.abs(v - want[i]) < 1e-9);
    });
  it(`pause fades master over ${PAUSE.audioFadeOutMs} ms, then suspends the one context (music, VO, SFX hold in place); resume restores master and fades music in over ${PAUSE.musicFadeInMs} ms`, async () => {
    const { g, env: e } = boot(null);
    g.audio.unlock();
    g.beginCutscene("intro");
    await flush();
    frames(5);
    await flush();
    const ac = g.audio.ac;
    expect(ac.state).toBe("running");
    let suspended = 0, resumed = 0;
    const sus = ac.suspend.bind(ac), res = ac.resume.bind(ac);
    ac.suspend = () => { suspended++; return sus(); };
    ac.resume = () => { resumed++; return res(); };
    expect(e.audio.lines.some((l: string) => l.startsWith("buf.start(opening/open.mp3"))).toBe(true);
    const mark = e.audio.lines.length;
    const t0 = ac.currentTime;
    g.pauseGame();
    const after = e.audio.lines.slice(mark);
    expect(has(after, "set", 1, t0)).toBe(true);
    expect(has(after, "lin", 0, t0 + PAUSE.audioFadeOutMs / 1000)).toBe(true);
    expect(suspended).toBe(0); // not before the fade
    await wait(PAUSE.audioFadeOutMs + PAUSE.suspendMarginMs + 250); // this stub's clock doesn't move, so it takes the stopped-clock path
    expect(suspended).toBe(1);
    expect(ac.state).toBe("suspended");
    expect(g.audio.held).toBe(true);
    // held in place: the intro line is not stopped, no loop restarts, nothing via HTMLAudio
    const held = e.audio.lines.slice(mark);
    expect(held.some((l: string) => l.startsWith("buf.stop(") || l.startsWith("buf.start("))).toBe(false);
    expect(held.some((l: string) => l.startsWith("play(") || l.startsWith("pause("))).toBe(false);
    // a tap while held doesn't bring audio back
    g.audio.onGesture();
    expect(resumed).toBe(0);
    const m2 = e.audio.lines.length;
    const t1 = ac.currentTime;
    g.resume();
    expect(resumed).toBe(1);
    expect(g.audio.held).toBe(false);
    const back = e.audio.lines.slice(m2);
    expect(has(back, "target", 1, t1, 0.03)).toBe(true); // master back on the usual level ramp
    const musicGain = g.audio.busGain("music");
    expect(has(back, "set", 0, t1)).toBe(true);
    expect(has(back, "lin", musicGain, t1 + PAUSE.musicFadeInMs / 1000)).toBe(true);
    expect(back.some((l: string) => l.startsWith("buf.start(") || l.startsWith("buf.stop("))).toBe(false);
  });
  describe(`QA-PR12 P2: suspend waits for the fade to end plus ${PAUSE.suspendMarginMs} ms, on the context clock`, () => {
    /** a playing Game with fake timers; tick(ms) moves the context clock and the timers together */
    const setup = () => {
      const { g, env: e } = boot("rescue");
      const ac = g.audio.ac;
      expect(ac.state).toBe("running");
      let suspendedAt: number | null = null;
      const sus = ac.suspend.bind(ac);
      ac.suspend = () => { suspendedAt ??= ac.currentTime; return sus(); };
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
      restoreGlobals.push(() => vi.useRealTimers());
      const clock = (ms: number) => e.frame(ms);
      const timers = (ms: number) => vi.advanceTimersByTime(ms);
      return { g, e, ac, clock, timers, suspended: () => suspendedAt };
    };
    it("tuning: 40 ms margin after Sound's 40 ms fade", () => {
      expect([PAUSE.audioFadeOutMs, PAUSE.suspendMarginMs]).toEqual([40, 40]);
    });
    it("not at the end of the fade; only once the clock is past fade + margin, so master has reached 0", () => {
      const { g, e, ac, clock, timers, suspended } = setup();
      const mark = e.audio.lines.length;
      const t0 = ac.currentTime;
      g.pauseGame();
      const end = t0 + PAUSE.audioFadeOutMs / 1000;
      expect(has(e.audio.lines.slice(mark), "lin", 0, end)).toBe(true);
      clock(PAUSE.audioFadeOutMs); timers(PAUSE.audioFadeOutMs); // the old race point
      expect(suspended()).toBe(null);
      clock(PAUSE.suspendMarginMs - 1); timers(PAUSE.suspendMarginMs - 1);
      expect(suspended()).toBe(null);
      clock(1); timers(1);
      expect(suspended()).not.toBe(null);
      expect(suspended()!).toBeGreaterThanOrEqual(end + PAUSE.suspendMarginMs / 1000 - 1e-9);
      expect(ac.state).toBe("suspended");
    });
    it("a context clock running behind the wall clock (busy iOS output) defers the suspend until it catches up", () => {
      const { g, ac, clock, timers, suspended } = setup();
      const t0 = ac.currentTime;
      g.pauseGame();
      clock(30); // the context has only played 30 ms ...
      timers(PAUSE.audioFadeOutMs + PAUSE.suspendMarginMs); // ... when the wall-clock timer fires
      expect(suspended()).toBe(null);
      clock(60);
      timers(60);
      expect(suspended()).not.toBe(null);
      expect(suspended()! - t0).toBeGreaterThanOrEqual((PAUSE.audioFadeOutMs + PAUSE.suspendMarginMs) / 1000 - 1e-9);
    });
    it("never before the clock reaches fade + margin: a clock that moves in ~10.7 ms blocks (QA saw 7/120 at 74.7 ms) is waited for", () => {
      const { g, ac, clock, timers, suspended } = setup();
      const t0 = ac.currentTime;
      g.pauseGame();
      clock(74.7); // the last block boundary before the deadline
      timers(PAUSE.audioFadeOutMs + PAUSE.suspendMarginMs); // first check: the clock is 5.3 ms short
      expect(suspended()).toBe(null);
      timers(5); // the re-check sees no block yet: one check with no movement is not a stall
      expect(suspended()).toBe(null);
      clock(10.7); // next block: 85.4 ms
      timers(10);
      expect(suspended()).not.toBe(null);
      expect(suspended()! - t0).toBeGreaterThanOrEqual((PAUSE.audioFadeOutMs + PAUSE.suspendMarginMs) / 1000 - 1e-9);
    });
    it("a stopped context clock (no movement over several checks) still suspends, after the wall-clock deadline and never before", () => {
      const { g, timers, suspended } = setup();
      g.pauseGame();
      timers(PAUSE.audioFadeOutMs + PAUSE.suspendMarginMs + 20);
      expect(suspended()).toBe(null);
      timers(200);
      expect(suspended()).not.toBe(null);
    });
    it("Resume during the margin, or while waiting for the clock, cancels the pending suspend", () => {
      const { g, ac, clock, timers, suspended } = setup();
      g.pauseGame();
      clock(PAUSE.audioFadeOutMs + 10); timers(PAUSE.audioFadeOutMs + 10); // fade done, inside the margin
      g.resume();
      clock(500); timers(500);
      expect(suspended()).toBe(null);
      expect(ac.state).toBe("running");
      g.pauseGame();
      clock(20); timers(PAUSE.audioFadeOutMs + PAUSE.suspendMarginMs); // re-armed for the clock
      g.resume();
      clock(500); timers(500);
      expect(suspended()).toBe(null);
      expect(ac.state).toBe("running");
    });
  });
  it("a resume inside the fade cancels the pending suspend", async () => {
    const { g } = boot("rescue");
    const ac = g.audio.ac;
    let suspended = 0;
    const sus = ac.suspend.bind(ac);
    ac.suspend = () => { suspended++; return sus(); };
    g.pauseGame();
    g.resume();
    await wait(PAUSE.audioFadeOutMs + 30);
    expect(suspended).toBe(0);
    expect(ac.state).toBe("running");
  });
  it("Mute uses F-07's one persisted key, silences every bus at master, and is read back on the next visit", () => {
    const { g, env: e } = boot(null);
    g.audio.unlock();
    expect(MUTE_KEY).toBe("spacefish-muted");
    g.audio.setMuted(true);
    expect(e.store.get(MUTE_KEY)).toBe("1");
    expect(has(e.audio.lines.slice(-2), "target", 0, g.audio.ac.currentTime, 0.03)).toBe(true);
    const next = new AudioDirector();
    expect(next.muted).toBe(true);
    expect(next.master.gain.value).toBe(0);
    // pausing while muted fades from 0 (no pop), and resume keeps master at 0
    const mark = e.audio.lines.length;
    g.audio.suspend(PAUSE.audioFadeOutMs);
    expect(has(e.audio.lines.slice(mark), "set", 0, g.audio.ac.currentTime)).toBe(true);
    const m2 = e.audio.lines.length;
    g.audio.resume(PAUSE.musicFadeInMs);
    expect(has(e.audio.lines.slice(m2), "target", 0, g.audio.ac.currentTime, 0.03)).toBe(true);
    g.audio.setMuted(false);
    expect(e.store.get(MUTE_KEY)).toBe("0");
    expect(new AudioDirector().muted).toBe(false);
  });
});
describe("save and Menu", () => {
  it("pausing and resuming never writes the save (AAA §4E)", () => {
    const { g, env: e } = boot("rescue");
    e.store.delete(SAVE_KEY);
    g.pauseGame();
    secs(1);
    g.resume();
    key("Escape");
    key("Escape");
    expect(e.store.has(SAVE_KEY)).toBe(false);
  });
  it("Menu (after its confirm) goes to the title; Continue restarts the saved chapter (D-5)", () => {
    const { g } = boot("base");
    secs(1);
    g.pauseGame();
    g.quitToTitle();
    expect(g.mode).toBe("menu");
    expect(g.audio.held).toBe(false);
    g.continueGame();
    expect([g.mode, g.phase]).toEqual(["play", "base"]);
  });
  it("Menu from a cutscene pause stops the voice-over and releases the audio hold", async () => {
    const { g, env: e } = boot(null);
    g.audio.unlock();
    g.beginCutscene("intro");
    for (let i = 0; i < 5; i++) await new Promise((r) => setTimeout(r, 0));
    frames(3);
    g.autoPause({ type: "pagehide" });
    const mark = e.audio.lines.length;
    g.quitToTitle();
    expect(g.mode).toBe("menu");
    expect(g.voiceEl).toBe(null);
    expect(g.audio.held).toBe(false);
    expect(e.audio.lines.slice(mark).some((l: string) => l.startsWith("buf.stop(opening/open.mp3"))).toBe(true);
  });
});
