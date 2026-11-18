// F-05 Slow 4G dark intro (WP spec = PERF.md WP-01 + WP answers Nov 18), asserted on the
// real Game: beats wait for their decoded plate, a failed plate is retried (1 s, 3 s) and
// gives up for a palette fallback (or 12 s after its beat was due), the intro-first fetch
// order with deferred music, the loading snapshot, and the timestamped beat log. Parity
// runs with these entry points stubbed.
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { Game } from "../src/game/Game";
import { CUTSCENES } from "../src/content/cutscenes";
import { INTRO_LOAD } from "../src/content/introLoad";
import { installEnv, type Env } from "./helpers/fakeEnv";
import { runSim } from "./helpers/sim";
import { loadLive } from "./helpers/liveOracle";

let live: any;
beforeAll(async () => {
  live = await loadLive();
});

const PLATES = CUTSCENES.intro.map((b: any) => b.plate);
let env: Env | null = null;
afterEach(() => {
  env?.restore();
  env = null;
});

/** An Image whose load/decode the test controls; records the order srcs are set (= fetch order, repeats = retries). */
function controlledImages() {
  const requested: string[] = [];
  const bySrc = new Map<string, any>();
  class CtlImage {
    __kind = "img";
    complete = false;
    naturalWidth = 0;
    naturalHeight = 0;
    width = 0;
    height = 0;
    crossOrigin: string | null = null;
    onload: null | (() => void) = null;
    onerror: null | (() => void) = null;
    _src = "";
    _p: Promise<void> | null = null;
    _ok: (() => void) | null = null;
    _no: ((e: any) => void) | null = null;
    set src(v: string) {
      this._src = v;
      // a (re)assigned src starts a new fetch, and a new decode()
      this.complete = false;
      this._p = this._ok = this._no = null;
      if (v) { requested.push(v); bySrc.set(v, this); }
    }
    get src() { return this._src; }
    decode() { return (this._p ??= new Promise<void>((ok, no) => { this._ok = ok; this._no = no; if (this.complete) (this.naturalWidth ? ok() : no(new Error("broken"))); })); }
    load() { this.complete = true; this.naturalWidth = this.naturalHeight = this.width = this.height = 256; this.onload?.(); this._ok?.(); }
    fail() { this.complete = true; this.onerror?.(); this._no?.(new Error("404")); }
  }
  Object.defineProperty(globalThis, "Image", { value: CtlImage, configurable: true, writable: true });
  return {
    requested,
    load: (src: string) => { const i = bySrc.get(src); if (!i) throw new Error(`not requested: ${src}`); i.load(); },
    fail: (src: string) => bySrc.get(src).fail(),
    loadAll: () => { for (const i of bySrc.values()) if (!i.complete) i.load(); },
  };
}
/** fetch() whose responses the test releases; records the order of the audio fetches. */
function controlledFetch() {
  const urls: string[] = [];
  const pending = new Map<string, () => void>();
  Object.defineProperty(globalThis, "fetch", {
    configurable: true,
    writable: true,
    value: (url: string) => {
      urls.push(url);
      return new Promise((res) =>
        pending.set(url, () => res({ ok: true, arrayBuffer: () => Promise.resolve(new TextEncoder().encode(url).buffer) })),
      );
    },
  });
  return {
    urls,
    resolve: (url: string) => { const f = pending.get(url); if (!f) throw new Error(`not fetched: ${url}`); pending.delete(url); f(); },
    resolveAll: () => { for (const [u, f] of [...pending]) { pending.delete(u); f(); } },
  };
}
const flush = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };
const plate = (n: string) => `opening/${n}.jpg`;

function boot(search = "", ctlFetch = false) {
  env?.restore();
  env = installEnv({ seed: 1, search });
  const imgs = controlledImages();
  const net = ctlFetch ? controlledFetch() : null;
  const snaps: any[] = [];
  const g: any = new Game((s: any) => snaps.push(s));
  g.attach(env.canvas);
  g.startLoop();
  return { g, imgs, net, snaps, env: env! };
}
const frames = (n: number) => { for (let i = 0; i < n; i++) env!.frame(1000 / 60); };
const secs = (s: number) => frames(Math.round(s * 60));
/** VO lines that actually started on the F-07 VO bus */
const voPlays = () => env!.audio.lines!.filter((l) => l.startsWith("buf.start(opening/")).map((l) => l.slice(10, l.indexOf(",")));
const log = () => (env!.win as any).__controlsTest.beatLog();
/** the menu art, then plate 1 + the opening VO, all in */
async function titleReady(imgs: any, net: any) {
  frames(1);
  imgs.load("rim/miner2.png");
  frames(1);
  imgs.load(plate("dig"));
  net?.resolve("opening/open.mp3");
  await flush();
}

describe("fetch order: intro first, deferred music, no 49 parallel requests at boot", () => {
  it("boot requests nothing; the title fetches only the art the menu paints, then plate 1 + the opening VO, then the big title art", async () => {
    const { imgs, net } = boot("", true);
    expect(imgs.requested).toEqual([]);
    expect(net!.urls).toEqual([]);
    frames(1);
    // WP 2: rim/ground.jpg (338 KB) waits for plate 1; the 102 KB miner the menu paints goes now
    expect(imgs.requested).toEqual(["rim/miner2.png"]);
    imgs.load("rim/miner2.png");
    frames(1);
    expect(imgs.requested.slice(1)).toEqual([plate("dig")]);
    expect(net!.urls).toEqual(["opening/open.mp3"]);
    frames(120);
    expect(imgs.requested.length).toBe(2);
    imgs.load(plate("dig"));
    net!.resolve("opening/open.mp3");
    await flush();
    frames(1);
    expect(imgs.requested.slice(2)).toEqual(["rim/ground.jpg"]);
    // no loop plays on the silent title, so no music is fetched; nothing else before Start
    expect(net!.urls).toEqual(["opening/open.mp3"]);
    frames(120);
    expect(imgs.requested.length).toBe(3);
    expect(INTRO_LOAD.menuArt).toEqual(["rim.miner.2"]);
    expect(INTRO_LOAD.afterPlateOne).toEqual(["rim.ground"]);
  });
  it("WP 4 order on a fast Start: plate 1 + VO, then only the intro's loop, then plates 2-6, then the other loops + Ch1 art, then the rest", async () => {
    const { g, imgs, net } = boot("", true);
    frames(1);
    imgs.load("rim/miner2.png");
    frames(1);
    g.startNew(); // tapped before plate 1 is in
    await flush();
    expect(net!.urls).toEqual(["opening/open.mp3"]); // the rim loop waits for plate 1 + VO
    imgs.load(plate("dig"));
    await flush();
    expect(net!.urls).toEqual(["opening/open.mp3"]);
    net!.resolve("opening/open.mp3");
    await flush();
    expect(net!.urls.filter((u) => u.startsWith("music/"))).toEqual(["music/rim.mp3"]);
    expect(imgs.requested.filter((s) => s.startsWith("opening/"))).toEqual([plate("dig")]); // plates 2-6 wait for the loop
    net!.resolve("music/rim.mp3");
    await flush();
    for (let i = 1; i < PLATES.length; i++) {
      // only the current plate is in flight, and the rest of the music still waits
      expect(imgs.requested.filter((s) => s.startsWith("opening/"))).toEqual(PLATES.slice(0, i + 1).map(plate));
      expect(net!.urls.filter((u) => u.startsWith("music/"))).toEqual(["music/rim.mp3"]);
      imgs.load(plate(PLATES[i]));
      await flush();
    }
    // plates 2-6 in: the rest of the Rim decode group (swarm) and the Ch1 art, nothing else
    expect(net!.urls.filter((u) => u.startsWith("music/"))).toEqual(["music/rim.mp3", "music/swarm.mp3"]);
    const art = imgs.requested.filter((s) => !s.startsWith("opening/"));
    expect(art.slice(2).sort()).toEqual(["rim/crate.png", "rim/dome.png", "rim/fish.png", "rim/horizon.jpg", "rim/miner0.png", "rim/miner1.png", "rim/miner3.png", "rim/robot.png", "rim/rock.png"]);
    expect(INTRO_LOAD.ch1Art.length).toBe(11);
    imgs.loadAll();
    const all = imgs.requested;
    expect(all.length).toBe(49); // every image is still fetched, just in order
    expect(new Set(all).size).toBe(49);
    expect(all.indexOf("sprites/astro-1.png")).toBeGreaterThan(all.indexOf("rim/rock.png"));
    const l = log();
    expect(l.findIndex((e: any) => e.ev === "music-intro")).toBeLessThan(l.findIndex((e: any) => e.ev === "plate-request" && e.plate === "turn"));
    expect(l.find((e: any) => e.ev === "ch1-complete")).toBeTruthy();
  });
  it("a chapter start (Skip, Continue, ?qa=1, ?phase=) releases the gameplay art and the music at once", async () => {
    for (const how of ["skip", "continue", "?qa=1", "?phase=base"]) {
      const { g, imgs, net, env: e } = boot(how.startsWith("?") ? how : "", true);
      frames(1);
      if (how === "continue") { e.store.set("spacefish-v1", JSON.stringify({ version: 1, phase: "rescue" })); g.continueGame(); }
      else { g.startNew(); if (how === "skip") g.skipCutscene(); }
      await flush();
      expect(g.mode, how).toBe("play");
      expect(imgs.requested, how).toContain("rim/rock.png");
      expect(net!.urls.some((u) => u.startsWith("music/")), how).toBe(true);
      expect(g.audio.musicGate, how).toBeNull();
      expect(g.audio.groupHeld, how).toBe(false);
    }
  });
});

describe("each beat waits for its plate", () => {
  it("no timer, no VO and no auto-advance until the plate decodes; the snapshot shows loading", async () => {
    const { g, imgs, snaps } = boot();
    frames(1);
    g.startNew();
    secs(10); // longer than beat 1 (6.8 s), shorter than the 12 s cap
    expect([g.mode, g.beat, g.beatT]).toEqual(["cutscene", 0, 0]);
    await flush();
    expect(voPlays()).toEqual([]);
    expect(snaps.at(-1)).toMatchObject({ mode: "cutscene", loading: true, platesReady: 0, platesTotal: 6 });
    imgs.load(plate("dig"));
    await flush();
    frames(2);
    await flush();
    expect(voPlays()).toEqual(["opening/open.mp3"]);
    expect(g.beatT).toBeGreaterThan(0);
    expect(snaps.at(-1).loading).toBeUndefined();
    expect(snaps.at(-1).caption).toBe(CUTSCENES.intro[0].caption);
  });
  it("a later beat whose plate is still out holds too (never advances over the placeholder)", async () => {
    const { g, imgs } = boot();
    await titleReady(imgs, null);
    g.startNew();
    await flush();
    secs(CUTSCENES.intro[0].dur + 5);
    await flush();
    expect([g.beat, g.beatT]).toEqual([1, 0]);
    expect(voPlays()).toEqual(["opening/open.mp3"]);
    imgs.load(plate("turn"));
    await flush();
    frames(1);
    await flush();
    expect(voPlays().at(-1)).toBe("opening/turn.mp3");
  });
  it("Space/Enter step and Skip still work while a beat waits", async () => {
    const { g, imgs } = boot();
    frames(1);
    g.startNew();
    secs(1);
    env!.key("keydown", "Space"); env!.key("keyup", "Space");
    expect(g.beat).toBe(1);
    expect(imgs.requested).toContain(plate("turn")); // stepped ahead: its plate is asked for now
    env!.key("keydown", "Enter"); env!.key("keyup", "Enter");
    expect(g.beat).toBe(2);
    g.skipCutscene();
    expect([g.mode, g.phase]).toEqual(["play", "stealth"]);
  });
});

describe("WP 3: a failed plate never holds forever", () => {
  const tries = (imgs: any, n: string) => imgs.requested.filter((s: string) => s === plate(n)).length;
  it("retries after ~1 s, then ~3 s; then the beat runs (caption + VO) over the palette fallback, no bar, plateFailed logged", async () => {
    const { g, imgs, snaps, env: e } = boot();
    frames(1);
    g.startNew();
    imgs.fail(plate("dig"));
    await flush();
    expect(tries(imgs, "dig")).toBe(1);
    secs(0.9);
    expect(tries(imgs, "dig")).toBe(1);
    secs(0.2);
    expect(tries(imgs, "dig")).toBe(2); // ~1 s after the first failure
    imgs.fail(plate("dig"));
    await flush();
    secs(2.9);
    expect(tries(imgs, "dig")).toBe(2);
    expect([g.beat, g.beatT]).toEqual([0, 0]);
    expect(snaps.at(-1).loading).toBe(true);
    secs(0.2);
    expect(tries(imgs, "dig")).toBe(3); // ~3 s after the second
    imgs.fail(plate("dig"));
    await flush();
    e.draw.lines = [];
    frames(2);
    await flush();
    expect(g.beatT).toBeGreaterThan(0);
    expect(voPlays()).toEqual(["opening/open.mp3"]);
    expect(snaps.at(-1).loading).toBeUndefined();
    expect(snaps.at(-1).caption).toBe(CUTSCENES.intro[0].caption);
    // the fallback: a non-black gradient in VP's palette, over the whole stage
    const lines = e.draw.lines!;
    expect(lines.some((l) => /\.stop\(0,"#151d26"\)/.test(l))).toBe(true);
    expect(lines.some((l) => /\.stop\(1,"#2a3844"\)/.test(l))).toBe(true);
    expect(lines).not.toContain('fillStyle="#1a242c"');
    const l = log();
    expect(l.filter((x: any) => x.ev === "plate-retry" && x.plate === "dig").map((x: any) => x.attempt)).toEqual([1, 2]);
    expect(l.find((x: any) => x.ev === "plateFailed")).toMatchObject({ plate: "dig", why: "retries" });
    // the chain moved on to plate 2
    expect(imgs.requested).toContain(plate("turn"));
  });
  it("12 s after the beat was due, a plate that never answers fails and the beat runs", async () => {
    const { g, imgs, snaps } = boot();
    frames(1);
    g.startNew(); // dig is requested, and never settles
    secs(11.9);
    expect([g.beat, g.beatT]).toEqual([0, 0]);
    expect(snaps.at(-1).loading).toBe(true);
    secs(0.2);
    await flush();
    expect(g.beatT).toBeGreaterThan(0);
    expect(snaps.at(-1).loading).toBeUndefined();
    expect(log().find((x: any) => x.ev === "plateFailed")).toMatchObject({ plate: "dig", why: "deadline" });
    expect(imgs.requested).toContain(plate("turn"));
  });
  it("the 12 s cap runs on the game clock: time spent paused doesn't count", async () => {
    const { g } = boot();
    frames(1);
    g.startNew();
    secs(6);
    g.pauseGame();
    secs(20);
    g.resume();
    secs(5);
    expect([g.beat, g.beatT]).toEqual([0, 0]);
    secs(1.2);
    expect(g.beatT).toBeGreaterThan(0);
  });
  it("Skip still works during retries", async () => {
    const { g, imgs } = boot();
    frames(1);
    g.startNew();
    imgs.fail(plate("dig"));
    await flush();
    secs(0.5);
    g.skipCutscene();
    expect([g.mode, g.phase]).toEqual(["play", "stealth"]);
  });
});

describe("replays", () => {
  it("a second intro after a skipped, held one starts beat 1 once (VO plays once)", async () => {
    const { g, imgs } = boot();
    frames(1);
    g.startNew();
    secs(1); // beat 1 waiting on its plate
    g.skipCutscene();
    imgs.loadAll();
    await flush();
    g.backToMenu();
    frames(2);
    await flush();
    const before = voPlays().length;
    g.startNew();
    secs(1);
    await flush();
    expect(voPlays().length - before).toBe(1);
    expect(g.beat).toBe(0);
    expect(g.beatT).toBeGreaterThan(0.9);
  });
});

describe("beat log (QA/WP hook)", () => {
  it("every beat logs plate-decoded before beat-start, and its VO plays only after; ch1-complete vs rim-start; reachable from __controlsTest", async () => {
    const { g, imgs } = boot();
    frames(1);
    g.startNew();
    for (let i = 0; i < PLATES.length; i++) {
      secs(1.5); // the plate arrives late
      await flush();
      if (!imgs.requested.includes(plate(PLATES[i]))) throw new Error(`plate ${i} never requested`);
      imgs.load(plate(PLATES[i]));
      await flush();
      if (i === PLATES.length - 1) imgs.loadAll(); // the Ch1 art lands during the last beat
      secs(CUTSCENES.intro[i].dur + 0.1);
    }
    const l = log();
    for (let i = 0; i < PLATES.length; i++) {
      const dec = l.findIndex((e: any) => e.ev === "plate-decoded" && e.plate === PLATES[i]);
      const start = l.findIndex((e: any) => e.ev === "beat-start" && e.beat === i);
      expect(dec, `beat ${i}`).toBeGreaterThanOrEqual(0);
      expect(start, `beat ${i}`).toBeGreaterThan(dec);
      expect(l[start].t).toBeGreaterThanOrEqual(l[dec].t);
      expect(l.find((e: any) => e.ev === "beat-hold" && e.beat === i), `beat ${i} held first`).toBeTruthy();
    }
    expect(l[0].ev).toBe("menu-art");
    expect(l.find((e: any) => e.ev === "start")).toBeTruthy();
    expect(g.mode).toBe("play");
    // WP 1: both moments are logged, so QA can read the Ch1 set's margin before the Rim starts
    const ch1 = l.find((e: any) => e.ev === "ch1-complete");
    const rim = l.find((e: any) => e.ev === "rim-start");
    expect(ch1).toBeTruthy();
    expect(rim).toBeTruthy();
    expect(ch1.t).toBeLessThanOrEqual(rim.t);
  });
});

describe("desktop fast link: intro timing unchanged", () => {
  it("with every image already decoded, the intro beats change at exactly live's times (real Game vs live bundle)", () => {
    // the plain fake env: images are complete at once and have no decode() (the fallback path)
    const o = { seed: 5, frames: 2700, start: (g: any) => g.startNew() };
    const a = runSim(live.Game, o);
    const b = runSim(Game, o);
    expect(b.transitions).toEqual(a.transitions);
    expect(b.audioLog).toEqual(a.audioLog);
  });
});
