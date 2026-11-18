// F-07 (iOS volume, Sound SD-01): music, SFX, VO and UI on one Web Audio graph with
// GainNodes. iOS ignores HTMLMediaElement.volume, so these tests pin: no .volume
// writes anywhere, the v*v level mapping, the unlock / re-arm / hidden-tab logic on a
// mocked AudioContext, the small API F-02 calls, gapless loop points, the
// equal-power crossfade, the VO duck and the Skip fade.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { AudioDirector, fadeCurve, fadeValue, levelToGain } from "../src/audio/AudioDirector";
import { loopPoints, parseGapless } from "../src/audio/gapless";
import { AUDIO } from "../src/content/tuning/audio";
import { Game } from "../src/game/Game";
import { installEnv } from "./helpers/fakeEnv";
import { REPO_ROOT } from "./helpers/liveOracle";
import { runSim } from "./helpers/sim";

const SRC = join(REPO_ROOT, "src");
function walk(dir: string, out: string[] = []) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(n)) out.push(p);
  }
  return out;
}
const flush = async () => {
  for (let i = 0; i < 5; i++) await new Promise((r) => setTimeout(r, 0));
};

describe("no HTMLAudio volume anywhere (iOS ignores it)", () => {
  it("src never writes .volume, never builds an Audio element or a MediaElementSource", () => {
    const hits: string[] = [];
    for (const f of walk(SRC)) {
      const code = readFileSync(f, "utf8");
      const rel = relative(SRC, f);
      // (covers PR #10 v0.3's shovel SFX too: they must be decoded buffers)
      for (const re of [/\.volume\s*(=(?!=)|\+=|-=|\*=)/, /new\s+Audio\s*\(/, /createMediaElementSource/, /HTMLAudioElement/, /preservesPitch/]) {
        if (re.test(code)) hits.push(`${rel}: ${re}`);
      }
    }
    expect(hits).toEqual([]);
  });
  it("a full intro + Rim run never creates an HTMLAudio element", () => {
    const r = runSim(Game, {
      seed: 5,
      frames: 1200,
      start: (g: any) => g.startNew(),
      step: (g: any, _e: any, f: number) => { if (f === 600) g.skipCutscene(); },
    });
    expect(r.rawAudio.some((l: string) => l.startsWith("new Audio(") || l.startsWith("play("))).toBe(false);
    expect(r.audioIntent.slice(0, 2)).toEqual(["music:rim", "vo:open"]);
  });
});

describe("level mapping (Sound: gain = v*v, 0 is a true mute)", () => {
  it("maps settings to gains", () => {
    expect(levelToGain(0)).toBe(0);
    expect(levelToGain(1)).toBe(1);
    expect(levelToGain(0.5)).toBe(0.25);
    expect(levelToGain(0.8)).toBeCloseTo(0.64, 12);
    expect(levelToGain(-1)).toBe(0);
    expect(levelToGain(2)).toBe(1);
    expect(levelToGain(NaN)).toBe(0);
  });
  it("defaults are Sound's: music 0.8, SFX 1.0, VO 1.0, UI 0.8", () => {
    expect(AUDIO.defaults).toEqual({ music: 0.8, sfx: 1.0, vo: 1.0, ui: 0.8 });
  });
});

// ---- a mocked browser: AudioContext with a state machine, window, document ---------
type L = { type: string; fn: any; capture: boolean };
function mockBrowser(opts: { storage?: Record<string, string>; audioSession?: boolean } = {}) {
  const log: string[] = [];
  const winL: L[] = [];
  const docL: L[] = [];
  const target = (arr: L[]) => ({
    addEventListener: (type: string, fn: any, o?: any) => arr.push({ type, fn, capture: o === true || !!o?.capture }),
    removeEventListener: (type: string, fn: any) => {
      const i = arr.findIndex((l) => l.type === type && l.fn === fn);
      if (i >= 0) arr.splice(i, 1);
    },
  });
  const param = (name: string) => {
    let v = 0;
    return {
      get value() { return v; },
      set value(x: number) { v = x; log.push(`${name}.value=${x}`); },
      setTargetAtTime: (g: number, t: number, tau: number) => log.push(`${name}.target(${+g.toFixed(4)},${t},${+tau.toFixed(4)})`),
      setValueAtTime: (g: number, t: number) => log.push(`${name}.set(${g},${+t.toFixed(4)})`),
      cancelScheduledValues: (t: number) => log.push(`${name}.cancel(${t})`),
      setValueCurveAtTime: (c: Float32Array, t: number, d: number) => log.push(`${name}.curve(${+c[0].toFixed(3)}..${+c[c.length - 1].toFixed(3)},${t},${d})`),
      exponentialRampToValueAtTime() {},
    };
  };
  let gains = 0;
  const contexts: any[] = [];
  class AC {
    state = "suspended";
    sampleRate = 48000;
    currentTime = 1;
    destination = { id: "dest" };
    onstatechange: any = null;
    resumes = 0;
    suspends = 0;
    constructor() { contexts.push(this); }
    go(s: string) { this.state = s; this.onstatechange?.(); }
    resume() { this.resumes++; log.push("ctx.resume"); return Promise.resolve(); }
    suspend() { this.suspends++; log.push("ctx.suspend"); return Promise.resolve(); }
    close() { return Promise.resolve(); }
    createGain() { const id = `g${gains++}`; return { id, gain: param(id), connect: (n: any) => log.push(`${id}->${n.id}`), disconnect() {} }; }
    createDynamicsCompressor() {
      return { id: "lim", threshold: param("lim.threshold"), knee: param("lim.knee"), ratio: param("lim.ratio"), attack: param("lim.attack"), release: param("lim.release"), connect: (n: any) => log.push(`lim->${n.id}`) };
    }
    createBuffer(ch: number, len: number, rate: number) { log.push(`createBuffer(${ch},${len},${rate})`); return { duration: len / rate }; }
    createBufferSource() { return { connect: (n: any) => log.push(`silent->${n.id}`), start: (t: number) => log.push(`silent.start(${t})`) }; }
  }
  const store = new Map(Object.entries(opts.storage ?? {}));
  const doc = { visibilityState: "visible", ...target(docL) };
  const g = globalThis as any;
  const saved: Record<string, PropertyDescriptor | undefined> = {};
  const set = (k: string, v: any) => { saved[k] = Object.getOwnPropertyDescriptor(g, k); Object.defineProperty(g, k, { value: v, configurable: true, writable: true }); };
  set("window", { AudioContext: AC, ...target(winL) });
  set("document", doc);
  set("localStorage", { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, String(v)) });
  const session: any = { type: "auto" };
  set("navigator", opts.audioSession ? { audioSession: session } : {});
  return {
    log, winL, docL, store, doc, contexts, session,
    gestures: () => winL.filter((l) => ["pointerdown", "touchend", "keydown"].includes(l.type)),
    fire: (type: string) => { for (const l of [...winL].filter((x) => x.type === type)) l.fn({ type }); },
    setVisible: (v: boolean) => { doc.visibilityState = v ? "visible" : "hidden"; for (const l of [...docL].filter((x) => x.type === "visibilitychange")) l.fn({}); },
    restore: () => { for (const [k, d] of Object.entries(saved)) { if (d) Object.defineProperty(g, k, d); else delete g[k]; } },
  };
}

let mb: ReturnType<typeof mockBrowser> | null = null;
afterEach(() => { mb?.restore(); mb = null; });

describe("graph, unlock and re-arm (mocked AudioContext)", () => {
  it("builds one context at load: buses -> master -> limiter -> destination, Sound's limiter", () => {
    mb = mockBrowser();
    const a = new AudioDirector();
    expect(mb.contexts.length).toBe(1);
    expect(a.ctx).toBe(null); // the game still unlocks on Start, as live
    const L = AUDIO.limiter;
    for (const k of ["threshold", "knee", "ratio", "attack", "release"] as const) expect(mb.log).toContain(`lim.${k}.value=${L[k]}`);
    const b = a.bus!;
    expect(mb.log).toContain(`${b.music.id}->${a.duck.id}`);
    expect(mb.log).toContain(`${a.duck.id}->${a.master.id}`);
    for (const k of ["sfx", "vo", "ui"] as const) expect(mb.log).toContain(`${b[k].id}->${a.master.id}`);
    expect(mb.log).toContain(`${a.synth.id}->${b.sfx.id}`);
    expect(mb.log).toContain(`${a.master.id}->lim`);
    expect(mb.log).toContain("lim->dest");
    expect(b.music.gain.value).toBeCloseTo(0.64, 12);
    expect(b.vo.gain.value).toBe(1);
    expect(b.sfx.gain.value).toBe(1);
    expect(a.synth.gain.value).toBe(AUDIO.synthTrim); // synth SFX level unchanged from live (SD-03 deferred)
    expect(b.ui.gain.value).toBeCloseTo(0.64, 12);
    expect(a.master.gain.value).toBe(1);
  });

  it("first pointerdown/touchend/keydown (capture) resumes and starts a 1-frame silent buffer in the same handler; listeners go once running", () => {
    mb = mockBrowser();
    new AudioDirector();
    const ac = mb.contexts[0];
    expect(mb.gestures().map((l) => `${l.type}:${l.capture}`).sort()).toEqual(["keydown:true", "pointerdown:true", "touchend:true"]);
    const before = mb.log.length;
    mb.fire("pointerdown");
    expect(mb.log.slice(before)).toEqual(["ctx.resume", "createBuffer(1,1,48000)", "silent->dest", "silent.start(0)"]);
    ac.go("running");
    expect(mb.gestures()).toEqual([]);
  });

  it("re-arms when iOS interrupts or suspends the context: the next gesture resumes it", () => {
    mb = mockBrowser();
    new AudioDirector();
    const ac = mb.contexts[0];
    mb.fire("touchend");
    ac.go("running");
    ac.go("interrupted"); // call, Siri, lock
    expect(mb.gestures().length).toBe(3);
    const r = ac.resumes;
    mb.fire("touchend");
    expect(ac.resumes).toBe(r + 1);
    ac.go("running");
    expect(mb.gestures()).toEqual([]);
    ac.go("suspended");
    expect(mb.gestures().length).toBe(3);
  });

  it("hidden tab suspends, visible resumes; pagehide suspends", () => {
    mb = mockBrowser();
    const a = new AudioDirector();
    const ac = mb.contexts[0];
    a.unlock();
    ac.go("running");
    mb.setVisible(false);
    expect(ac.suspends).toBe(1);
    ac.go("suspended");
    mb.fire("pointerdown"); // a gesture while hidden never resumes
    const r = ac.resumes;
    mb.setVisible(true);
    expect(ac.resumes).toBe(r + 1);
    mb.fire("pagehide");
    expect(ac.suspends).toBe(2);
  });

  it("F-02 API: suspend() holds through visibility and gestures until resume()", () => {
    mb = mockBrowser();
    const a = new AudioDirector();
    const ac = mb.contexts[0];
    a.unlock();
    ac.go("running");
    a.suspend();
    expect(ac.suspends).toBe(1);
    ac.go("suspended");
    const r = ac.resumes;
    mb.setVisible(false);
    mb.setVisible(true);
    mb.fire("pointerdown");
    mb.fire("keydown");
    expect(ac.resumes).toBe(r); // auto-pause keeps it suspended until the player resumes
    a.resume();
    expect(ac.resumes).toBe(r + 1);
  });

  it("resume() while hidden waits for the page to come back", () => {
    mb = mockBrowser();
    const a = new AudioDirector();
    const ac = mb.contexts[0];
    a.unlock();
    ac.go("running");
    a.suspend();
    ac.go("suspended");
    mb.setVisible(false);
    const r = ac.resumes;
    a.resume();
    expect(ac.resumes).toBe(r);
    mb.setVisible(true);
    expect(ac.resumes).toBe(r + 1);
  });

  it("sets navigator.audioSession.type = 'ambient' when present (silent switch)", () => {
    mb = mockBrowser({ audioSession: true });
    new AudioDirector();
    expect(mb.session.type).toBe("ambient");
  });

  it("Music slider and mute ramp with setTargetAtTime (tau 0.03), never .value after build; both persist", () => {
    mb = mockBrowser();
    const a = new AudioDirector();
    const music = a.bus!.music.id;
    const master = a.master.id;
    const n = mb.log.length;
    a.setMusic(0.5);
    expect(mb.log.slice(n)).toEqual([`${music}.cancel(1)`, `${music}.target(0.25,1,0.03)`]);
    expect(mb.store.get("spacefish-music")).toBe("0.5");
    const m = mb.log.length;
    a.setMuted(true);
    expect(mb.log.slice(m)).toEqual([`${master}.cancel(1)`, `${master}.target(0,1,0.03)`, `${master}.set(0,1.15)`]);
    expect(mb.store.get("spacefish-muted")).toBe("1");
    a.setMusic(0);
    expect(mb.log.slice(-1)[0]).toBe(`${music}.set(0,1.15)`); // 0 lands on exactly 0
    expect(mb.log.slice(n).some((l) => l.includes(".value="))).toBe(false);
    a.setMuted(false);
    expect(mb.store.get("spacefish-muted")).toBe("0");
  });

  it("a saved mute and music level are applied at load", () => {
    mb = mockBrowser({ storage: { "spacefish-muted": "1", "spacefish-music": "0.5" } });
    const a = new AudioDirector();
    expect(a.muted).toBe(true);
    expect(a.master.gain.value).toBe(0);
    expect(a.bus!.music.gain.value).toBe(0.25);
  });

  it("no AudioContext (or a broken one): every call is a safe no-op", () => {
    mb = mockBrowser();
    (globalThis as any).window.AudioContext = undefined;
    const a = new AudioDirector();
    expect(() => { a.unlock(); a.setMood("alert"); a.setMusic(0.3); a.setMuted(true); a.suspend(); a.resume(); a.playVo("open"); a.stopVo(); a.shoot(true); a.close(); }).not.toThrow();
  });
});

describe("gapless loop points (SD-09)", () => {
  const read = (p: string) => new Uint8Array(readFileSync(join(REPO_ROOT, p)));
  it("reads the LAME/Xing header of the shipped rim loop", () => {
    expect(parseGapless(read("music/rim.mp3"))).toEqual({ codec: "mp3", fileRate: 22050, offset: 576 + 529, total: 615 * 576, nominal: 352800 });
  });
  it("every shipped loop has its whole-second length (12-20 s, as Sound measured)", () => {
    const want: Record<string, number> = { base: 12, swarm: 12, rim: 16, holdouts: 16, ending: 18, transit: 20 };
    for (const [n, sec] of Object.entries(want)) {
      const i = parseGapless(read(`music/${n}.mp3`));
      expect(i.nominal! / i.fileRate!, n).toBeCloseTo(sec, 2);
    }
  });
  it("trimmed decode (Chrome-style): loop the music only", () => {
    const i = parseGapless(read("music/rim.mp3"));
    expect(loopPoints(i, 16)).toEqual({ loopStart: 0, loopEnd: 16 });
    // start trimmed but the tail padding kept (ffmpeg-style: total - delay - 529)
    const p = loopPoints(i, (615 * 576 - 1105) / 22050);
    expect(p.loopStart).toBe(0);
    expect(p.loopEnd).toBeCloseTo(16, 9);
  });
  it("untrimmed decode: skip the priming (encoder delay + 529), loop exactly the music", () => {
    const i = parseGapless(read("music/rim.mp3"));
    const p = loopPoints(i, (615 * 576) / 22050);
    expect(p.loopStart).toBeCloseTo(1105 / 22050, 12);
    expect(p.loopEnd).toBeCloseTo(1105 / 22050 + 16, 9);
  });
  it("AAC: iTunSMPB priming when present; with no gapless metadata, no guess (0 to the buffer end); mdhd gives the rate", () => {
    const mp4 = (smpb: string | null) => {
      const head = new Uint8Array(32);
      head.set([0, 0, 0, 32], 0);
      head.set([..."ftypM4A "].map((c) => c.charCodeAt(0)), 4);
      const mdhd = new Uint8Array(40);
      mdhd.set([..."mdhd"].map((c) => c.charCodeAt(0)), 0);
      mdhd.set([0, 0, 0xac, 0x44], 16); // timescale 44100 (version 0)
      const tag = new TextEncoder().encode(smpb ? `iTunSMPB\0\0\0 00000000 00000840 000003C0 000000000006BAC0 00000000` : "");
      const b = new Uint8Array(head.length + mdhd.length + tag.length);
      b.set(head, 0);
      b.set(mdhd, head.length);
      b.set(tag, head.length + mdhd.length);
      return b;
    };
    const a = parseGapless(mp4("x"));
    expect(a).toEqual({ codec: "aac", fileRate: 44100, offset: 0x840, total: 0x840 + 0x6bac0 + 0x3c0, nominal: 0x6bac0 });
    expect(0x840).toBe(2112);
    const untrimmed = loopPoints(a, a.total! / 44100);
    expect(untrimmed.loopStart).toBeCloseTo(2112 / 44100, 12);
    expect(untrimmed.loopEnd).toBeCloseTo((2112 + 0x6bac0) / 44100, 9);
    const b = parseGapless(mp4(null));
    expect([b.offset, b.nominal]).toEqual([0, null]);
    expect(loopPoints(b, 10)).toEqual({ loopStart: 0, loopEnd: 10 });
  });
  it("AAC edit list (how ffmpeg writes m4a, e.g. Sound's shovel SFX): priming and length from elst", () => {
    // ftyp | mvhd ts 1000 | elst v0: 1 entry, 200 ms, media_time 1024 | mdhd ts 48000 | stsz 11 frames
    const box = (type: string, body: number[]) => [0, 0, 0, 8 + body.length, ...[...type].map((c) => c.charCodeAt(0)), ...body];
    const be = (n: number) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
    const bytes = new Uint8Array([
      ...box("ftyp", [..."M4A "].map((c) => c.charCodeAt(0))),
      ...box("mvhd", [0, 0, 0, 0, ...be(0), ...be(0), ...be(1000), ...be(200)]),
      ...box("elst", [0, 0, 0, 0, ...be(1), ...be(200), ...be(1024), ...be(65536)]),
      ...box("mdhd", [0, 0, 0, 0, ...be(0), ...be(0), ...be(48000), ...be(11264)]),
      ...box("stsz", [0, 0, 0, 0, ...be(0), ...be(11)]),
    ]);
    const i = parseGapless(bytes);
    expect(i).toEqual({ codec: "aac", fileRate: 48000, offset: 1024, total: 11264, nominal: 9600 });
    expect(loopPoints(i, 0.2)).toEqual({ loopStart: 0, loopEnd: 0.2 }); // decoder applied the edit list
    const raw = loopPoints(i, 11264 / 48000); // decoder ignored it
    expect(raw.loopStart).toBeCloseTo(1024 / 48000, 12);
    expect(raw.loopEnd).toBeCloseTo((1024 + 9600) / 48000, 12);
  });
  it("no header: loop the whole buffer, no guessing (Sound's rule)", () => {
    expect(loopPoints(parseGapless(new Uint8Array([1, 2, 3, 4])), 7)).toEqual({ loopStart: 0, loopEnd: 7 });
    // an MP3 with a Xing frame count but no LAME tag has no delay/padding: whole buffer
    expect(loopPoints({ codec: "mp3", fileRate: 22050, offset: 0, total: 615 * 576, nominal: null }, 16.07)).toEqual({ loopStart: 0, loopEnd: 16.07 });
  });
  it("Sound's loop rule on every shipped loop: never trimmed twice", () => {
    for (const n of ["rim", "holdouts", "base", "swarm", "transit", "ending"]) {
      const i = parseGapless(read(`music/${n}.mp3`));
      const r = i.fileRate!;
      // expected length = frames x samples-per-frame - delay - padding (decoder delay included in offset)
      const music = i.nominal! / r;
      // browser already stripped it: 0 / buffer end
      expect(loopPoints(i, music), n).toEqual({ loopStart: 0, loopEnd: music });
      // untrimmed: loopStart = end of priming, loopEnd = end of the real music (padding left out)
      const raw = loopPoints(i, i.total! / r);
      expect(raw.loopStart, n).toBeCloseTo(i.offset / r, 12);
      expect(raw.loopEnd, n).toBeCloseTo((i.offset + i.nominal!) / r, 9);
      expect(raw.loopEnd, n).toBeLessThan(i.total! / r);
    }
  });
});

describe("crossfade, duck and Skip fade (Web Audio clock, not rAF)", () => {
  it("equal-power curves: in^2 + out^2 = 1, exact ends", () => {
    for (let x = 0; x <= 1; x += 0.125) expect(fadeValue(0, 1, x) ** 2 + fadeValue(1, 0, x) ** 2).toBeCloseTo(1, 12);
    const c = fadeCurve(0, 1);
    expect(c.length).toBe(AUDIO.curvePoints);
    expect([c[0], c[c.length - 1]]).toEqual([0, 1]);
  });

  it("mood change: new loop from its loop start with a 0.7 s curve; the old one fades and stops on the audio clock", async () => {
    const env = installEnv({ seed: 1 });
    try {
      const a: any = new AudioDirector();
      a.unlock();
      await flush();
      expect(env.audio.lines).toContain("buf.start(music/rim.mp3,0,0,loop=true)");
      const n = env.audio.lines!.length;
      env.frame(1000);
      a.setMood("alert");
      await flush();
      const got = env.audio.lines!.slice(n);
      expect(got).toContain("gain.curve(1..0,1,0.7)");
      expect(got).toContain("buf.stop(music/rim.mp3,1.7)");
      expect(got).toContain("buf.start(music/swarm.mp3,1,0,loop=true)");
      expect(got).toContain("gain.curve(0..1,1,0.7)");
      // a flip back mid-fade continues from the current level (no jump)
      const m = env.audio.lines!.length;
      env.frame(350);
      a.setMood("stealth");
      await flush();
      const back = env.audio.lines!.slice(m);
      const mid = +fadeValue(0, 1, 0.5).toFixed(6);
      expect(back.some((l) => l.startsWith("gain.curve(0.7071") || l.startsWith(`gain.curve(${mid}`))).toBe(true);
      expect(back).toContain("buf.start(music/rim.mp3,1.35,0,loop=true)"); // from its loop start (SD-12)
      a.close();
    } finally {
      env.restore();
    }
  });

  it("VO ducks the music -8 dB (tau 0.027 s attack / 0.133 s release) and Skip fades the line over 120 ms", async () => {
    const env = installEnv({ seed: 1 });
    try {
      const a: any = new AudioDirector();
      a.unlock();
      await flush();
      const n = env.audio.lines!.length;
      a.playVo("open");
      await flush();
      const duck = +Math.pow(10, -8 / 20).toFixed(4);
      const got = env.audio.lines!.slice(n);
      expect(got).toContain("buf.start(opening/open.mp3,0,0,loop=false)");
      expect(got).toContain(`gain.target(${Math.pow(10, -8 / 20)},0,0.027)`); // attack tau (80 ms to ~95%)
      expect(duck).toBeCloseTo(0.3981, 4);
      env.frame(1000);
      const m = env.audio.lines!.length;
      a.stopVo();
      const s = env.audio.lines!.slice(m);
      expect(s).toContain("gain.target(0,1,0.04)");
      expect(s).toContain("buf.stop(opening/open.mp3,1.12)");
      expect(s).toContain("gain.target(1,1,0.133)"); // release tau (400 ms to ~95%)
      a.close();
    } finally {
      env.restore();
    }
  });

  it("decode groups per chapter (Sound); the outgoing chapter is released only when its crossfade finishes", async () => {
    const env = installEnv({ seed: 1 });
    try {
      const a: any = new AudioDirector();
      const decoded: string[] = [];
      const dec = a.ac.decodeAudioData.bind(a.ac);
      a.ac.decodeAudioData = (ab: ArrayBuffer) => { decoded.push(new TextDecoder().decode(ab).slice(6, -4)); return dec(ab); };
      const keys = () => [...a.music.keys()].sort();
      const endFades = () => { for (const t of [...a.outgoing]) t.src.onended(); };
      a.unlock(); // Rim: rim + swarm together
      await flush();
      expect(keys()).toEqual(["rim", "swarm"]);
      a.setMood("alert"); await flush(); endFades(); // flip inside the Rim: nothing released
      expect(keys()).toEqual(["rim", "swarm"]);
      a.setMood("stealth"); await flush(); endFades();
      a.setMood("rescue"); // Holdouts alone
      await flush();
      expect(keys()).toEqual(["holdouts", "rim", "swarm"]); // fade still running: nothing released yet
      endFades();
      expect(keys()).toEqual(["holdouts"]); // rim and swarm dropped once the crossfade finished
      a.setMood("base"); await flush(); endFades();
      expect(keys()).toEqual(["base"]);
      const before = decoded.filter((u) => u === "swarm").length;
      a.setMood("shooter"); await flush(); endFades(); // Transit: transit + swarm, swarm decoded again
      expect(keys()).toEqual(["swarm", "transit"]);
      expect(decoded.filter((u) => u === "swarm").length).toBe(before + 1);
      expect(keys()).not.toContain("ending");
      a.setMood("swarm"); // the boss: ending starts decoding now
      await flush();
      expect(keys()).toEqual(["ending", "swarm", "transit"]);
      endFades();
      expect(keys()).toEqual(["ending", "swarm", "transit"]);
      a.setMood("ending"); await flush(); endFades(); // Ending alone
      expect(keys()).toEqual(["ending"]);
      a.close();
    } finally {
      env.restore();
    }
  });

  it("intro lines decode one after another in beat order, and are dropped after the intro", async () => {
    const env = installEnv({ seed: 1 });
    const order: string[] = [];
    const realFetch = (globalThis as any).fetch;
    (globalThis as any).fetch = (u: string) => { order.push(u); return realFetch(u); };
    try {
      const a: any = new AudioDirector();
      a.preloadVo(["open", "turn", "reveal"]);
      expect(order).toEqual(["opening/open.mp3"]); // the next waits for this one
      await flush();
      expect(order).toEqual(["opening/open.mp3", "opening/turn.mp3", "opening/reveal.mp3"]);
      a.dropVo();
      expect(a.voBufs.size).toBe(0);
      a.close();
    } finally {
      env.restore();
    }
  });
});
