// Runs a Game class headless under the fake environment and returns a trace
// that two builds can be compared on: state samples, draw-call digests,
// audio call log, HUD snapshots and storage.
import { installEnv, type Env, type EnvOptions } from "./fakeEnv";

const SKIP = new Set(["audio", "onSnap", "canvas", "ctx", "unbind", "art", "rim", "cine", "cineVid", "voiceEl", "keys", "qaKeys"]);

export function pickState(g: any) {
  const out: Record<string, any> = {};
  for (const k of Object.keys(g)) if (!SKIP.has(k)) out[k] = g[k];
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
  try {
    const snaps: any[] = [];
    const g = new GameClass((s: any) => snaps.push(s));
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
      if (f % (o.sampleEvery ?? 30) === 0) trace.push({ f, s: pickState(g), draw: env.draw.digest(), audio: env.audio.count });
      if (o.stopWhen?.(g)) break;
    }
    const final = { f, s: pickState(g), draw: env.draw.digest(), audio: env.audio.digest() };
    g.detach();
    return { trace, final, transitions, snaps, audioLog: env.audio.lines, storage: Object.fromEntries(env.store), simSeconds: env.now / 1000 };
  } finally {
    env.restore();
  }
}

/**
 * Deterministic autopilot, ported from QA's qa-run/autopilot.js (same routes and
 * build plan). It plays only through the game's own input listeners.
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
  let placeBase = -1;
  const releases: Array<[number, string]> = [];
  const plans: Record<string, any[]> = {
    stealth: [{ go: [600, 945] }, { go: [1300, 945] }, { go: [1860, 950] }, { go: [1860, 1000] }],
    rescue: [{ go: [130, 300] }, { go: [250, 215], use: 1 }, { go: [300, 518] }, { go: [600, 518] }, { go: [700, 770], use: 2 }, { go: [760, 860] }, { go: [1100, 860] }, { go: [1250, 478] }, { go: [1550, 478] }, { go: [1620, 275], use: 3 }],
    base: [{ go: [780, 480] }, { go: [640, 200] }, { go: [500, 420] }, { place: "gen", at: [500, 560] }, { go: [1000, 520] }, { place: "turret", at: [1120, 420] }, { place: "turret", at: [1200, 500] }, { go: [900, 860] }, { go: [200, 980] }, { go: [180, 280] }, { go: [300, 600] }, { place: "lab", at: [300, 840] }, { go: [1080, 330], burn: 1 }, { go: [420, 700], launch: 1 }],
  };
  const digit: Record<string, string> = { gen: "Digit1", turret: "Digit2", lab: "Digit3" };
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
    if (g.phase !== "stealth") key("Space", true);
    if (s.go) {
      if (s.burn && g.nest.hp > 0) { moveTo(s.go[0], s.go[1], 30); return; }
      if (!moveTo(s.go[0], s.go[1], 14)) return;
      if (s.use) { if (g.freedCount >= s.use) { step++; return; } if (frame >= wait) { tap("KeyE"); wait = frame + 18; } return; }
      if (s.launch) { if (frame >= wait) { tap("KeyE"); wait = frame + 18; } return; }
      step++;
      return;
    }
    if (s.place) {
      if (placeBase < 0) placeBase = g.structures.length;
      if (g.structures.length > placeBase) { if (g.build) tap(digit[s.place]); placeBase = -1; step++; return; }
      if (g.build !== s.place) { tap(digit[s.place]); return; }
      const p = screen(s.at[0], s.at[1]);
      env.pointer("pointerdown", p.x, p.y);
    }
  };
}
