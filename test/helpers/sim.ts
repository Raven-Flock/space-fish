// Runs a Game class headless under the fake environment and returns a trace
// that two builds can be compared on: state samples, draw-call digests,
// synth-SFX call log, music/VO intent, HUD snapshots and storage.
import { createHash } from "node:crypto";
import { installEnv, type Env, type EnvOptions } from "./fakeEnv";
import { LEVEL_CURVE, LEVEL_CURVE_KEY, MUSIC_KEY } from "../../src/save/keys";

// "raf" is the rAF handle id: live's music fade also drew rAF ids, F-07 fades on the audio clock (SD-12).
const SKIP = new Set(["raf", "audio", "onSnap", "canvas", "ctx", "unbind", "art", "rim", "cine", "cineVid", "voiceEl", "keys", "qaKeys"]);

/**
 * Intended differences from live 1c9c028 (this PR: touch-aim fix N-1, D-11 shovel melee
 * on Use and on Rim Fire/Dig; v0.3: F-01 Rim chase 140 + search state, N-5 click-repair
 * reach, N-8 facing lock cone; v0.3.1: shovel SFX primed at audio unlock).
 * Parity runs our Game with exactly these entry points stubbed (liveEquivalent), and
 * the new state they own is dropped from the trace only while it holds its inert
 * default, so any leak of the new behaviour into a parity run still shows as a diff.
 * A stub returns false (= the live path) unless `liveValues` gives the live number.
 */
export const INTENDED = {
  methods: [
    "clearTouchAim", "shovelFire", "tickShovel", "tryShovel",
    "rimChaseSpeed", "fishSearch", "clickRepairRefused", "facingAimLock",
    "tickTransitHint", "resetRunHints",
  ],
  helpers: ["drawShovelTrail", "shovelNoise", "useInteractableNear", "aimFromPointer", "lockTarget"],
  /** live 1c9c028 values returned by the stubs (the bundle hardcodes chaseSpeed:160) */
  liveValues: { rimChaseSpeed: 160 } as Record<string, unknown>,
  state: { swing: null, swingCd: 0, hitStop: 0, transitHint: null } as Record<string, unknown>,
  fishKeys: ["stagger", "staggerImmune", "search", "searchLock", "searchPending"],
  /** AudioDirector entry points stubbed on the parity Game's own director (v0.3.1: live has no shovel files to prime) */
  audioMethods: ["primeSfx"],
  /**
   * F-07 (iOS audio on Web Audio gain, Sound SD-01). Music and VO moved from HTMLAudio
   * (.volume, which iOS ignores) to decoded buffers on GainNode buses, so their
   * low-level calls differ from live by design. Parity therefore compares:
   *   - the synth SFX calls line for line (the tone() recipes are unchanged),
   *   - the music and VO *intent*: which loop starts and which line plays, in order
   *     (live: HTMLAudio play() calls; ours: crossfadeTo()/playVo()),
   *   - mood, music level and storage as before.
   * The one intended level change visible to parity is the Music default
   * (0.7 live -> 0.8, Sound's default, which with gain = v*v plays ~0.8 dB under
   * live's linear 0.7). liveEquivalent puts the live default back.
   */
  audio: {
    sfxLine: /^(osc\.|freq\.|gain\.set\(|gain\.ramp\()/,
    liveMusicDefault: 0.7,
    api: ["suspend", "resume", "setMuted", "loadVo", "preloadVo", "playVo", "stopVo", "dropVo", "crossfadeTo"],
    /** F-07 v0.2.1: the one-time level-curve flag (live has no such key) */
    storageKeys: [LEVEL_CURVE_KEY],
  },
};

/**
 * The synth-SFX calls of an audio log. F-07 v0.2.1 anchors every level ramp with
 * setValueAtTime(current, now) right after cancelScheduledValues(now); that `set` is bus
 * automation, not a tone() cue, so it is dropped (tone() never cancels).
 */
export function synthLines(lines: string[]) {
  return lines.filter((l, i) => INTENDED.audio.sfxLine.test(l) && !(/^gain\.set\(/.test(l) && /^gain\.cancel\(/.test(lines[i - 1] ?? "")));
}
/** Storage without the intended new keys (live never writes them). */
export function liveStorage(store: Map<string, string>) {
  return Object.fromEntries([...store].filter(([k]) => !INTENDED.audio.storageKeys.includes(k)));
}

/** music/VO intent from live's HTMLAudio play() lines */
function liveIntent(lines: string[]) {
  const out: string[] = [];
  for (const l of lines) {
    const m = l.match(/^play\((music|opening)\/([\w-]+)\.mp3\)$/);
    if (m) out.push(`${m[1] === "music" ? "music" : "vo"}:${m[2]}`);
  }
  return out;
}
// F-02 touch pause (GD F02-TOUCH-PAUSE-v0.1). Stubbed in parity: the sim freeze, every new
// way into pause (button, P, gamepad Start, auto-pause), the pause/resume side effects and
// the 150 ms resume input lock. Esc still pauses and resumes exactly like live.
INTENDED.methods.push("pausedFreeze", "pauseGame", "onPause", "onResume", "inputLocked", "autoPause", "pollPad");
INTENDED.helpers.push("clearHeldInput", "bindPause", "quitToTitle");
Object.assign(INTENDED.state, { pauseFrom: "play", resumeLockUntil: 0, padStart: false });
// F-04 phone HUD (VP-PHONE-HUD-v0.1 + v0.1.2): setStickGuard, the Transit ship clamp behind
// the phone stick, which only the touch HUD calls.
INTENDED.methods.push("setStickGuard");

/** Our Game with only the intended new entry points turned off: must equal live 1c9c028. */
export function liveEquivalent<T extends new (...a: any[]) => any>(G: T): T {
  class LiveEquivalent extends G {
    /** runSim: saved levels count as already migrated (live reads them linearly; F-07 v0.2.1) */
    static liveLevels = true;
    constructor(...a: any[]) {
      super(...a);
      // F-07: live's Music default (an intended difference, see INTENDED.audio)
      if (localStorage.getItem(MUSIC_KEY) == null) (this as any).audio.musicVol = INTENDED.audio.liveMusicDefault;
      for (const m of INTENDED.audioMethods) {
        if (typeof (this as any).audio[m] !== "function") throw new Error(`intended audio method missing: ${m}`);
        (this as any).audio[m] = () => {};
      }
    }
  }
  for (const m of INTENDED.methods) {
    if (typeof (G.prototype as any)[m] !== "function") throw new Error(`intended method missing: ${m}`);
    const v = m in INTENDED.liveValues ? INTENDED.liveValues[m] : false;
    (LiveEquivalent.prototype as any)[m] = function () { return v; };
  }
  return LiveEquivalent;
}

export function pickState(g: any) {
  const out: Record<string, any> = {};
  for (const k of Object.keys(g)) {
    if (SKIP.has(k)) continue;
    if (k in INTENDED.state && g[k] === INTENDED.state[k]) continue;
    out[k] = g[k];
  }
  out.keys = [...g.keys].sort();
  out.audioMood = g.audio.mood;
  out.musicVol = g.audio.musicVol;
  return JSON.parse(JSON.stringify(out));
}

export interface SimOptions extends EnvOptions {
  frames: number;
  sampleEvery?: number;
  start?: (g: any, env: Env) => void;
  step?: (g: any, env: Env, frame: number) => void;
  stopWhen?: (g: any) => boolean;
}

export function runSim(GameClass: any, o: SimOptions) {
  const env = installEnv(o);
  // F-07 v0.2.1: our director moves saved levels to the v*v curve once; a parity run
  // starts with that done, so it reads a saved level exactly as live does.
  if (GameClass.liveLevels) env.store.set(LEVEL_CURVE_KEY, LEVEL_CURVE);
  try {
    const snaps: any[] = [];
    const g = new GameClass((s: any) => snaps.push(s));
    // F-07: record our music/VO intent; live's comes from its HTMLAudio play() lines
    const intent: string[] = [];
    const ours = typeof g.audio.crossfadeTo === "function";
    if (ours) {
      const cf = g.audio.crossfadeTo.bind(g.audio);
      const vo = g.audio.playVo.bind(g.audio);
      g.audio.crossfadeTo = (n: string) => { intent.push(`music:${n}`); cf(n); };
      g.audio.playVo = (n: string) => { intent.push(`vo:${n}`); vo(n); };
    }
    const sfx = () => synthLines(env.audio.lines!);
    g.attach(env.canvas);
    g.startLoop();
    o.start?.(g, env);
    const trace: any[] = [];
    const transitions: Array<{ t: number; k: string }> = [];
    let last = "";
    let f = 0;
    for (; f < o.frames; f++) {
      o.step?.(g, env, f);
      env.frame(1000 / 60);
      const k = `${g.mode}:${g.phase}${g.mode === "cutscene" ? ":" + g.cutId : ""}`;
      if (k !== last) {
        transitions.push({ t: +(env.now / 1000).toFixed(2), k });
        last = k;
      }
      if (f % (o.sampleEvery ?? 30) === 0) trace.push({ f, s: pickState(g), draw: env.draw.digest(), audio: sfx().length });
      if (o.stopWhen?.(g)) break;
    }
    const sfxLog = sfx();
    const digest = `${sfxLog.length}:${createHash("sha256").update(sfxLog.join("\n")).digest("hex").slice(0, 16)}`;
    const final = { f, s: pickState(g), draw: env.draw.digest(), audio: digest };
    g.detach();
    const audioIntent = ours ? intent : liveIntent(env.audio.lines!);
    return { trace, final, transitions, snaps, audioLog: sfxLog, audioIntent, rawAudio: env.audio.lines, storage: liveStorage(env.store), simSeconds: env.now / 1000 };
  } finally {
    env.restore();
  }
}

/**
 * Deterministic autopilot, ported from QA's qa-run/autopilot.js (same routes and
 * Pad repair route for 1c9c028). It plays only through the game's own input listeners.
 */
export function makeAutopilot() {
  const down = new Set<string>();
  let plan: string | null = null;
  let step = 0;
  let stuck = 0;
  let lastPos: [number, number] | null = null;
  let sideUntil = -1;
  let side = 1;
  let wait = 0;
  let dodge = 1;
  const releases: Array<[number, string]> = [];
  const plans: Record<string, any[]> = {
    stealth: [{ go: [600, 945] }, { go: [1300, 945] }, { go: [1860, 950] }, { go: [1860, 1000] }],
    rescue: [{ go: [130, 300] }, { go: [250, 215], use: 1 }, { go: [300, 518] }, { go: [600, 518] }, { go: [700, 770], use: 2 }, { go: [760, 860] }, { go: [1100, 860] }, { go: [1250, 478] }, { go: [1550, 478] }, { go: [1620, 275], use: 3 }],
    // 1c9c028: the Pad repairs four pre-placed wrecks (click within 72 px); nothing is placed.
    base: [{ go: [780, 480] }, { go: [640, 200] }, { go: [480, 440] }, { repair: [480, 360] }, { go: [860, 560] }, { repair: [860, 640] }, { go: [900, 860] }, { go: [200, 980] }, { go: [340, 840] }, { repair: [340, 920] }, { go: [180, 280] }, { go: [240, 420] }, { repair: [240, 500] }, { go: [1080, 330], burn: 1 }, { go: [420, 700], launch: 1 }],
  };
  return function autopilot(g: any, env: Env, frame: number) {
    for (let i = releases.length - 1; i >= 0; i--) {
      if (releases[i][0] <= frame) { env.key("keyup", releases[i][1]); releases.splice(i, 1); }
    }
    if (frame % 2) return; // QA polls every ~33 ms
    const key = (code: string, on: boolean) => {
      if (on && !down.has(code)) { down.add(code); env.key("keydown", code); }
      else if (!on && down.has(code)) { down.delete(code); env.key("keyup", code); }
    };
    // QA holds a tapped key for ~90 ms (about 6 frames)
    const tap = (code: string) => { env.key("keydown", code); releases.push([frame + 6, code]); };
    const releaseAll = () => { for (const c of [...down]) key(c, false); };
    const screen = (wx: number, wy: number) => ({ x: g.view.ox + (wx - g.camX) * g.view.scale, y: g.view.oy + (wy - g.camY) * g.view.scale });
    const moveTo = (tx: number, ty: number, tol: number) => {
      const dx = tx - g.player.x, dy = ty - g.player.y;
      if (Math.hypot(dx, dy) < tol) { ["KeyA", "KeyD", "KeyW", "KeyS"].forEach((k) => key(k, false)); return true; }
      let mx = Math.abs(dx) > 6 ? Math.sign(dx) : 0, my = Math.abs(dy) > 6 ? Math.sign(dy) : 0;
      if (lastPos && Math.hypot(g.player.x - lastPos[0], g.player.y - lastPos[1]) < 0.5) stuck += 2; else stuck = 0;
      lastPos = [g.player.x, g.player.y];
      if (stuck > 36 && sideUntil < frame) { side = -side; sideUntil = frame + 30; stuck = 0; }
      if (sideUntil >= frame) { if (Math.abs(dx) > Math.abs(dy)) { my = side; mx = 0; } else { mx = side; my = 0; } }
      key("KeyD", mx > 0); key("KeyA", mx < 0); key("KeyS", my > 0); key("KeyW", my < 0);
      return false;
    };
    if (g.mode === "cutscene") { releaseAll(); return; }
    if (g.mode === "dead") { releaseAll(); g.retry(); return; }
    if (g.mode !== "play") return;
    if (plan !== g.phase) { plan = g.phase; step = 0; releaseAll(); }
    if (g.phase === "shooter") {
      key("Space", true);
      const px = g.player.x, py = g.player.y;
      let ty = py, tx = g.scroll + 120;
      const kit = g.pickups.find((k: any) => k.x > px - 20 && k.x < px + 500);
      if (kit) { ty = kit.y; tx = Math.min(g.scroll + 380, kit.x); }
      const threat = g.fish.find((f: any) => f.x > px - 30 && f.x < px + 220 && Math.abs(f.y - py) < 60) || g.bullets.find((b: any) => !b.friendly && b.x > px - 40 && b.x < px + 260 && Math.abs(b.y - py) < 70);
      if (threat) { ty = threat.y > py ? py - 120 : py + 120; if (ty < 50) ty = py + 120; if (ty > 490) ty = py - 120; }
      else if (g.bossOn) { if (py < 90) dodge = 1; if (py > 450) dodge = -1; ty = py + dodge * 60; tx = g.scroll + 80; }
      key("KeyS", ty - py > 8); key("KeyW", ty - py < -8); key("KeyD", tx - px > 10); key("KeyA", tx - px < -10);
      return;
    }
    const s = plans[g.phase][step];
    if (!s) return;
    if (g.phase !== "stealth") {
      key("Space", true);
      // 1c9c028 locks on only within ±0.55 rad of the aim, so aim the mouse at the nearest fish (QA autopilot2 aims too)
      let best: any = null, bd = 300;
      for (const f of g.fish) { const d = Math.hypot(f.x - g.player.x, f.y - g.player.y); if (d < bd) { bd = d; best = f; } }
      if (!best && g.phase === "base" && g.nest.hp > 0 && Math.hypot(g.nest.x - g.player.x, g.nest.y - g.player.y) < 340) best = g.nest;
      if (best) { const p = screen(best.x, best.y); env.pointer("pointermove", p.x, p.y); }
    }
    if (s.go) {
      if (s.burn && g.nest.hp > 0) { moveTo(s.go[0], s.go[1], 30); return; }
      if (!moveTo(s.go[0], s.go[1], 14)) return;
      if (s.use) { if (g.freedCount >= s.use) { step++; return; } if (frame >= wait) { tap("KeyE"); wait = frame + 18; } return; }
      if (s.launch) { if (frame >= wait) { tap("KeyE"); wait = frame + 18; } return; }
      step++;
      return;
    }
    if (s.repair) {
      const w = g.structures.find((x: any) => x.x === s.repair[0] && x.y === s.repair[1]);
      if (!w || w.repaired) { step++; return; }
      if (frame >= wait) { const p = screen(w.x, w.y); env.pointer("pointerdown", p.x, p.y); wait = frame + 18; }
    }
  };
}

// F-05 intro plate gate + load order (WP-01, WP answers Nov 18). Stubbed in parity: queueing
// the art and the plates (so every image gets its src at boot, as live, and the music is
// never gated), the beat hold (with its retries and 12 s cap), the title prefetch and the
// loading snapshot. The helpers below do nothing while `intro` stays null.
INTENDED.methods.push("queueArt", "queuePlate", "holdBeat", "introPrefetch", "introSnap");
INTENDED.helpers.push(
  "prefetchBeatOne", "introGate", "afterPlateOne", "introStart", "nextPlate", "requestPlate", "tryPlate",
  "introPump", "settlePlate", "failPlate", "releaseArt", "startHeldBeat", "plateFailed", "logBeat",
);
Object.assign(INTENDED.state, { intro: null });
