// A small, fully deterministic browser stand-in for running the game headless in Node.
// Everything the game reads from the browser comes from here: clock, rAF, RNG,
// storage, images, audio, canvas 2D. The canvas and audio record every call so a
// test can compare two runs call-for-call.
import { createHash } from "node:crypto";

type Listener = (ev: any) => void;

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

class Emitter {
  listeners = new Map<string, Listener[]>();
  addEventListener(type: string, fn: Listener) {
    const l = this.listeners.get(type) ?? [];
    l.push(fn);
    this.listeners.set(type, l);
  }
  removeEventListener(type: string, fn: Listener) {
    const l = this.listeners.get(type) ?? [];
    this.listeners.set(type, l.filter((f) => f !== fn));
  }
  emit(type: string, ev: any) {
    for (const fn of [...(this.listeners.get(type) ?? [])]) fn(ev);
  }
}

const fmt = (v: any): string => {
  if (typeof v === "number") return Object.is(v, -0) ? "0" : String(v);
  if (v && typeof v === "object") {
    if (v.__kind === "img") return `img(${v.src})`;
    if (v.__kind === "grad") return `grad#${v.id}`;
    if (Array.isArray(v)) return `[${v.map(fmt).join(",")}]`;
    return "{obj}";
  }
  return JSON.stringify(v);
};

export class Recorder {
  hash = createHash("sha256");
  count = 0;
  lines: string[] | null = null; // set to [] to keep a readable log
  add(line: string) {
    this.hash.update(line + "\n");
    this.count++;
    if (this.lines) this.lines.push(line);
  }
  digest() {
    const d = this.hash.copy().digest("hex").slice(0, 16);
    return `${this.count}:${d}`;
  }
}

function makeCtx(rec: Recorder, canvas: any) {
  const state: Record<string, any> = {};
  let gradId = 0;
  const grad = (kind: string, args: any[]) => {
    const g = { __kind: "grad", id: ++gradId, addColorStop: (o: number, c: string) => rec.add(`grad#${g.id}.stop(${fmt(o)},${fmt(c)})`) };
    rec.add(`${kind}#${g.id}(${args.map(fmt).join(",")})`);
    return g;
  };
  const target: any = {
    canvas,
    createLinearGradient: (...a: any[]) => grad("lin", a),
    createRadialGradient: (...a: any[]) => grad("rad", a),
    createPattern: (...a: any[]) => grad("pat", a),
    measureText: (t: string) => {
      rec.add(`measure(${fmt(t)})`);
      return { width: String(t).length * 7 };
    },
  };
  return new Proxy(target, {
    get(t, k: string) {
      if (k in t) return t[k];
      if (k in state) return state[k];
      return (...args: any[]) => rec.add(`${k}(${args.map(fmt).join(",")})`);
    },
    set(_t, k: string, v) {
      state[k] = v;
      rec.add(`${k}=${fmt(v)}`);
      return true;
    },
  });
}

export interface EnvOptions {
  seed?: number;
  search?: string;
  width?: number;
  height?: number;
  storage?: Record<string, string>;
  reducedMotion?: boolean;
  coarse?: boolean;
}

export function installEnv(opts: EnvOptions = {}) {
  const W = opts.width ?? 960;
  const H = opts.height ?? 540;
  const draw = new Recorder();
  const audio = new Recorder();
  audio.lines = [];
  let now = 0;
  let rafId = 0;
  let rafQ: Array<[number, (t: number) => void]> = [];
  const store = new Map<string, string>(Object.entries(opts.storage ?? {}));
  const win = new Emitter() as any;
  const realRandom = Math.random;
  Math.random = mulberry32(opts.seed ?? 1);

  const canvas = new Emitter() as any;
  Object.assign(canvas, {
    clientWidth: W,
    clientHeight: H,
    width: 0,
    height: 0,
    getBoundingClientRect: () => ({ left: 0, top: 0, right: W, bottom: H, width: W, height: H }),
    setPointerCapture() {},
  });
  canvas.getContext = () => (canvas.__ctx ??= makeCtx(draw, canvas));

  class FakeImage {
    __kind = "img";
    complete = true;
    naturalWidth = 256;
    naturalHeight = 256;
    width = 256;
    height = 256;
    crossOrigin: string | null = null;
    _src = "";
    set src(v: string) { this._src = v; }
    get src() { return this._src; }
  }
  class FakeAudioEl {
    loop = false;
    preload = "";
    paused = true;
    currentTime = 0;
    _vol = 1;
    constructor(public src = "") { audio.add(`new Audio(${src})`); }
    get volume() { return this._vol; }
    set volume(v: number) { this._vol = v; }
    play() { this.paused = false; audio.add(`play(${this.src})`); return Promise.resolve(); }
    pause() { this.paused = true; audio.add(`pause(${this.src})`); }
  }
  class FakeParam {
    constructor(public name: string) {}
    _v = 0;
    get value() { return this._v; }
    set value(v) { this._v = v; audio.add(`${this.name}.value=${fmt(v)}`); }
    setValueAtTime(v: number, t: number) { audio.add(`${this.name}.set(${fmt(v)},${fmt(t)})`); }
    exponentialRampToValueAtTime(v: number, t: number) { audio.add(`${this.name}.ramp(${fmt(v)},${fmt(t)})`); }
  }
  class FakeAudioContext {
    destination = {};
    get currentTime() { return now / 1000; }
    createGain() { return { gain: new FakeParam("gain"), connect() {} }; }
    createOscillator() {
      const o: any = { frequency: new FakeParam("freq"), connect() {}, start() { audio.add(`osc.start(${o.type})`); }, stop(t: number) { audio.add(`osc.stop(${fmt(t)})`); } };
      Object.defineProperty(o, "type", { set(v) { o._t = v; audio.add(`osc.type=${v}`); }, get() { return o._t; } });
      return o;
    }
    resume() { return Promise.resolve(); }
    close() { return Promise.resolve(); }
  }
  class FakeResizeObserver { observe() {} disconnect() {} }

  Object.assign(win, {
    location: { search: opts.search ?? "", pathname: "/space-fish/", hash: "" },
    devicePixelRatio: 1,
    innerWidth: W,
    innerHeight: H,
    matchMedia: (q: string) => ({
      matches: (q.includes("reduce") && !!opts.reducedMotion) || ((q.includes("coarse") || q.includes("hover: none")) && !!opts.coarse),
    }),
    AudioContext: FakeAudioContext,
  });
  const g = globalThis as any;
  const saved: Record<string, any> = {};
  const set = (k: string, v: any) => { saved[k] = Object.getOwnPropertyDescriptor(g, k); Object.defineProperty(g, k, { value: v, configurable: true, writable: true }); };
  set("window", win);
  set("localStorage", {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => { store.set(k, String(v)); },
    removeItem: (k: string) => { store.delete(k); },
  });
  set("Image", FakeImage);
  set("Audio", FakeAudioEl);
  set("ResizeObserver", FakeResizeObserver);
  set("requestAnimationFrame", (fn: (t: number) => void) => { rafQ.push([++rafId, fn]); return rafId; });
  set("cancelAnimationFrame", (id: number) => { rafQ = rafQ.filter(([i]) => i !== id); });
  set("performance", { now: () => now });
  set("screen", { orientation: { lock: () => Promise.resolve() } });

  return {
    win,
    canvas,
    draw,
    audio,
    store,
    get now() { return now; },
    /** Advance the fake clock by ms and run queued animation frames once. */
    frame(ms = 1000 / 60) {
      now += ms;
      const q = rafQ;
      rafQ = [];
      for (const [, fn] of q) fn(now);
    },
    key(type: "keydown" | "keyup", code: string) {
      win.emit(type, { code, key: code, repeat: false, preventDefault() {} });
    },
    pointer(type: "pointerdown" | "pointermove", x: number, y: number, pointerType = "mouse") {
      canvas.emit(type, { clientX: x, clientY: y, pointerType, preventDefault() {} });
    },
    restore() {
      Math.random = realRandom;
      for (const [k, d] of Object.entries(saved)) {
        if (d) Object.defineProperty(g, k, d);
        else delete g[k];
      }
    },
  };
}
export type Env = ReturnType<typeof installEnv>;
