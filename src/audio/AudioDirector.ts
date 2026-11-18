import { MUSIC_KEY, MUTE_KEY } from "../save/keys";
import {
  AUDIO,
  MOOD_ALIAS,
  MUSIC_BOSS_PREFETCH,
  MUSIC_GROUPS,
  MUSIC_TRACKS,
} from "../content/tuning/audio";
import { loopPoints, parseGapless } from "./gapless";
import { SHOVEL_SFX } from "../content/tuning/sfx";
import { random } from "../engine/rng";

// F-07 (Sound SD-01): one AudioContext, decoded AudioBuffers, GainNodes. iOS ignores
// HTMLMediaElement.volume, so nothing here ever writes `.volume` and nothing uses
// HTMLAudio or MediaElementSource.
//
//   music tracks -> music bus -> duck -------+
//   synth SFX -> synth trim -> sfx bus -------+-> master (mute) -> limiter -> destination
//   (file SFX ------------->  sfx bus)        |
//   VO lines     -> vo bus ------------------+
//   UI cues      -> ui bus ------------------+
//
// Small API for other systems (F-02 pause calls these; nothing else should touch ctx):
//   suspend(fadeMs?) hold all audio (pause, auto-pause). Stays held until resume().
//                    F-02 passes ~40 ms: master fades to 0 first, then the context suspends.
//   resume(fadeMs?)  release the hold (resumes unless the page is hidden). Master comes back
//                    at the usual level ramp; F-02 passes 150 ms to fade the music bus in.
//   setMuted(bool)   master mute, saved in localStorage.
//   setMusic(0..1)   the existing Music slider, saved as before.
//   loadVo(name)     decode one intro line early (F-05 calls it after the plate).

export type Bus = "music" | "sfx" | "vo" | "ui";

/** A 0..1 setting to a gain: v*v, so 0 is a true mute (Sound). */
export function levelToGain(v: number) {
  const c = Math.max(0, Math.min(1, Number(v) || 0));
  return c * c;
}

/** Equal-power fade from `from` to `to`: sin rise, cos fall (Sound SD-12). */
export function fadeValue(from: number, to: number, x: number) {
  const k = Math.max(0, Math.min(1, x)) * (Math.PI / 2);
  return to >= from ? from + (to - from) * Math.sin(k) : to + (from - to) * Math.cos(k);
}
export function fadeCurve(from: number, to: number, n = AUDIO.curvePoints) {
  const c = new Float32Array(n);
  for (let i = 0; i < n; i++) c[i] = fadeValue(from, to, i / (n - 1));
  c[n - 1] = to;
  return c;
}

const GESTURES = ["pointerdown", "touchend", "keydown"];

export class AudioDirector {
  /** The context once unlock() ran (Start/Continue/Retry), null before, as in live. */
  ctx: any = null;
  /** The context itself, created at load so it can decode early and unlock on any gesture. */
  ac: any = null;
  master: any = null;
  bus: Record<Bus, any> | null = null;
  duck: any = null;
  /** fixed trim in front of the SFX bus for the synth tone() cues only (live's 0.22 master) */
  synth: any = null;
  mood = "";
  musicVol = AUDIO.defaults.music;
  levels = { sfx: AUDIO.defaults.sfx, vo: AUDIO.defaults.vo, ui: AUDIO.defaults.ui };
  muted = false;
  /** track the director means to play (live's `current`), even before unlock */
  want: string | null = null;
  /** chapter whose decode group is kept (swarm plays inside a chapter, never starts one) */
  chapter = "rim";
  current: any = null;
  outgoing: any[] = [];
  fadeToken = 0;
  /** held by suspend() (F-02 pause / auto-pause) until resume() */
  held = false;
  hidden = false;
  vo: any = null;
  voToken = 0;
  voGen = 0;
  /**
   * F-05 load order (WP 4). While set, a track's first fetch waits for this promise (the
   * beat-1 plate and the opening VO are in). While groupHeld, only the loop that plays is
   * fetched; the rest of its decode group waits for releaseGroup(). Null/false = as F-07.
   */
  musicGate: Promise<unknown> | null = null;
  groupHeld = false;
  private broken = false;
  private armed = false;
  private off: Array<() => void> = [];
  private bytes = new Map<string, Promise<ArrayBuffer | null>>();
  private music = new Map<string, Promise<any>>();
  private voBufs = new Map<string, Promise<any>>();

  constructor() {
    try {
      let e = localStorage.getItem(MUSIC_KEY);
      if (e != null) {
        this.musicVol = Math.max(0, Math.min(1, parseFloat(e) || 0));
      }
      this.muted = localStorage.getItem(MUTE_KEY) === "1";
    } catch {}
    this.ensureCtx();
  }

  // ---- context, graph, unlock ----------------------------------------------------
  ensureCtx() {
    if (this.ac || this.broken) return this.ac;
    if (typeof window === "undefined") return null;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    let ac: any = null;
    try {
      ac = new AC();
      const L = AUDIO.limiter;
      const limiter = ac.createDynamicsCompressor();
      limiter.threshold.value = L.threshold;
      limiter.knee.value = L.knee;
      limiter.ratio.value = L.ratio;
      limiter.attack.value = L.attack;
      limiter.release.value = L.release;
      const gain = (g: number) => {
        const n = ac.createGain();
        n.gain.value = g;
        return n;
      };
      const master = gain(this.muted ? 0 : 1);
      const duck = gain(1);
      const synth = gain(AUDIO.synthTrim);
      const bus = {
        music: gain(this.busGain("music")),
        sfx: gain(this.busGain("sfx")),
        vo: gain(this.busGain("vo")),
        ui: gain(this.busGain("ui")),
      };
      bus.music.connect(duck);
      duck.connect(master);
      synth.connect(bus.sfx);
      bus.sfx.connect(master);
      bus.vo.connect(master);
      bus.ui.connect(master);
      master.connect(limiter);
      limiter.connect(ac.destination);
      Object.assign(this, { ac, master, duck, synth, bus });
    } catch {
      try { ac?.close(); } catch {}
      this.broken = true;
      return null;
    }
    ac.onstatechange = () => this.onState();
    this.bind();
    try {
      const s = (navigator as any).audioSession;
      if (s) s.type = "ambient"; // follow the iOS silent switch on every bus (Sound)
    } catch {}
    return ac;
  }

  busGain(b: Bus) {
    if (b === "music") return levelToGain(this.musicVol);
    return levelToGain(this.levels[b]);
  }

  private bind() {
    const on = (t: any, type: string, fn: any, opt?: any) => {
      t.addEventListener(type, fn, opt);
      this.off.push(() => t.removeEventListener(type, fn, opt));
    };
    if (typeof document !== "undefined") {
      on(document, "visibilitychange", this.onVisibility);
      this.hidden = document.visibilityState === "hidden";
    }
    on(window, "pagehide", this.onPageHide);
    if (this.ac.state !== "running") this.arm();
  }

  private arm() {
    if (this.armed || typeof window === "undefined") return;
    this.armed = true;
    for (const g of GESTURES) window.addEventListener(g, this.onGesture, true);
  }
  private disarm() {
    if (!this.armed) return;
    this.armed = false;
    for (const g of GESTURES) window.removeEventListener(g, this.onGesture, true);
  }

  /** First gesture (and the next one after any interruption): resume + 1-frame silent buffer. */
  onGesture = () => {
    const ac = this.ac;
    if (!ac || this.held || this.hidden) return;
    if (ac.state !== "running") {
      try { ac.resume()?.catch?.(() => {}); } catch {}
      try {
        const b = ac.createBuffer(1, 1, ac.sampleRate || 44100);
        const s = ac.createBufferSource();
        s.buffer = b;
        s.connect(ac.destination);
        s.start(0);
      } catch {}
    }
    if (ac.state === "running") this.disarm();
  };

  onState() {
    const s = this.ac?.state;
    if (s === "running") this.disarm();
    else if (s === "suspended" || s === "interrupted") this.arm();
  }

  onVisibility = () => {
    this.hidden = document.visibilityState === "hidden";
    if (this.hidden) this.ac?.suspend()?.catch?.(() => {});
    else if (!this.held) this.wake();
  };
  onPageHide = () => {
    this.ac?.suspend()?.catch?.(() => {});
  };

  private wake() {
    const ac = this.ac;
    if (!ac || ac.state === "running") return;
    try { ac.resume()?.catch?.(() => {}); } catch {}
    if (ac.state !== "running") this.arm(); // iOS may refuse without a gesture: next tap resumes
  }

  private holdTimer: any = null;
  /**
   * Hold all audio (F-02: Esc/Pause button, auto-pause on hide/blur). With fadeMs (F-02,
   * Sound: ~40 ms) the master gain ramps to 0 first and the context suspends after it, so
   * pausing never clicks. Without it the context suspends at once.
   */
  suspend(fadeMs = 0) {
    this.held = true;
    clearTimeout(this.holdTimer);
    this.holdTimer = null;
    const ac = this.ac;
    const g = this.master?.gain;
    if (ac && g && fadeMs > 0 && ac.state === "running") {
      const t = ac.currentTime;
      g.cancelScheduledValues(t);
      g.setValueAtTime(this.muted ? 0 : 1, t);
      g.linearRampToValueAtTime(0, t + fadeMs / 1000);
      this.holdTimer = setTimeout(() => {
        this.holdTimer = null;
        if (this.held) this.ac?.suspend()?.catch?.(() => {});
      }, fadeMs);
      return;
    }
    ac?.suspend()?.catch?.(() => {});
  }
  /**
   * Release the hold. Audio comes back unless the page is hidden. Master returns to its
   * level (0 when muted) on the usual level ramp; with musicFadeMs (F-02: 150 ms) the
   * music bus fades in from silence over that long.
   */
  resume(musicFadeMs = 0) {
    this.held = false;
    clearTimeout(this.holdTimer);
    this.holdTimer = null;
    this.ramp(this.master?.gain, this.muted ? 0 : 1);
    const ac = this.ac;
    const m = this.bus?.music.gain;
    if (ac && m && musicFadeMs > 0) {
      const t = ac.currentTime;
      m.cancelScheduledValues(t);
      m.setValueAtTime(0, t);
      m.linearRampToValueAtTime(this.busGain("music"), t + musicFadeMs / 1000);
    }
    if (!this.hidden) this.wake();
  }
  setMuted(m: boolean) {
    this.muted = !!m;
    this.ramp(this.master?.gain, this.muted ? 0 : 1);
    try {
      localStorage.setItem(MUTE_KEY, this.muted ? "1" : "0");
    } catch {}
  }

  unlock() {
    const ac = this.ensureCtx();
    if (ac) {
      this.ctx = ac;
      if (!this.held && !this.hidden) {
        try { ac.resume()?.catch?.(() => {}); } catch {}
      }
    }
    if (!this.mood) {
      this.setMood("rim");
    } else if (this.want && !this.current) {
      this.startTrack(this.want, 0);
    }
  }

  close() {
    this.stopVo();
    for (const t of [this.current, ...this.outgoing]) {
      if (t) try { t.src.stop(); } catch {}
    }
    this.current = null;
    this.outgoing = [];
    this.want = null;
    this.disarm();
    for (const f of this.off) f();
    this.off = [];
    try { this.ac?.close(); } catch {}
    this.ac = null;
    this.ctx = null;
    this.master = this.duck = this.synth = this.bus = null;
    this.music.clear();
    this.voBufs.clear();
  }

  /** Level change: setTargetAtTime (never .value while playing); 0 lands on exactly 0. */
  private ramp(param: any, g: number, tau = AUDIO.levelTau) {
    const ac = this.ac;
    if (!ac || !param) return;
    const t = ac.currentTime;
    param.cancelScheduledValues(t);
    param.setTargetAtTime(g, t, tau);
    if (g === 0) param.setValueAtTime(0, t + tau * 5);
  }

  setMusic(vol) {
    this.musicVol = Math.max(0, Math.min(1, vol));
    this.ramp(this.bus?.music.gain, this.busGain("music"));
    try {
      localStorage.setItem(MUSIC_KEY, String(this.musicVol));
    } catch {}
  }

  // ---- loading -------------------------------------------------------------------
  private fetchBytes(url: string) {
    let p = this.bytes.get(url);
    if (!p) {
      p = fetch(url)
        .then((r) => (r.ok ? r.arrayBuffer() : null))
        .catch(() => null)
        .then((ab) => {
          if (!ab) {
            this.bytes.delete(url);
            console.warn(`[audio] could not load ${url}`);
          }
          return ab;
        });
      this.bytes.set(url, p);
    }
    return p;
  }

  private decode(ab: ArrayBuffer): Promise<any> {
    const ac = this.ac;
    if (!ac) return Promise.resolve(null);
    return new Promise((res) => {
      try {
        // the callback form covers old Safari; decodeAudioData detaches its input, so copy
        const p = ac.decodeAudioData(ab.slice(0), res, () => res(null));
        p?.then?.(res, () => res(null));
      } catch {
        res(null);
      }
    });
  }

  /** F-05: fetch a file's bytes ahead of time (cached; decoded later by loadMusic/loadVo). */
  prefetch(url: string) {
    return this.fetchBytes(url);
  }

  /** F-05: plates 2-6 are in: fetch the rest of the current chapter's decode group. */
  releaseGroup() {
    if (!this.groupHeld) return;
    this.groupHeld = false;
    if (this.want) for (const c of this.musicGroup()) this.loadMusic(c);
  }

  /** Decode one music loop and work out its sample-exact loop points. */
  loadMusic(name: string) {
    let p = this.music.get(name);
    if (!p) {
      p = this.fetchBytes(`music/${name}.mp3`).then((ab) => {
        if (!ab) return null;
        const info = parseGapless(ab);
        return this.decode(ab).then((buffer) =>
          buffer ? { buffer, ...loopPoints(info, buffer.duration) } : null,
        );
      });
      p.then((d) => d || this.music.delete(name));
      this.music.set(name, p);
    }
    return p;
  }

  /** Decode one intro VO line (cached until dropVo()). */
  loadVo(name: string) {
    let p = this.voBufs.get(name);
    if (!p) {
      p = this.fetchBytes(`opening/${name}.mp3`).then((ab) => (ab ? this.decode(ab) : null));
      p.then((b) => b || this.voBufs.delete(name));
      this.voBufs.set(name, p);
    }
    return p;
  }

  /** Decode the intro lines one after another, in beat order (SD-17/SD-07). */
  preloadVo(names: string[]) {
    const gen = this.voGen;
    let chain: Promise<any> = Promise.resolve(null);
    names.forEach((n, i) => {
      // the first line starts fetching now; each next one waits for the previous
      chain = i === 0 ? this.loadVo(n) : chain.then(() => (gen === this.voGen ? this.loadVo(n) : null));
    });
    return chain.catch(() => null);
  }

  /** Drop decoded intro lines once the intro is over. */
  dropVo() {
    this.voGen++;
    this.voBufs.clear();
  }

  // ---- music ---------------------------------------------------------------------
  setMood(mood) {
    mood = MOOD_ALIAS[mood] || mood;
    if (mood === this.mood) {
      return;
    }
    this.mood = mood;
    if (!MUSIC_TRACKS.includes(mood) || this.want === mood) {
      return;
    }
    this.crossfadeTo(mood);
  }

  crossfadeTo(name: string) {
    this.want = name;
    if (this.ctx) this.startTrack(name, AUDIO.crossfade);
  }

  /** The loops this chapter can play, plus the ending once the boss starts. */
  musicGroup() {
    const g = [...(MUSIC_GROUPS[this.chapter] ?? [this.chapter])];
    if (this.want === "swarm" && this.chapter === "transit") g.push(...MUSIC_BOSS_PREFETCH);
    return g;
  }

  private startTrack(name: string, fade: number) {
    const token = ++this.fadeToken;
    if (name !== "swarm") this.chapter = name;
    const go = () => {
      if (!this.groupHeld) for (const c of this.musicGroup()) this.loadMusic(c);
      this.loadMusic(name).then((d) => {
        if (d && token === this.fadeToken && this.want === name && this.ctx && this.bus) this.playTrack(name, d, fade);
      });
    };
    // F-05 (WP 4): the intro's loop waits for the beat-1 plate + opening VO
    if (this.musicGate) this.musicGate.then(go);
    else go();
  }

  private gainAt(t: any, now: number) {
    if (!(t.dur > 0) || now >= t.t0 + t.dur) return t.to;
    return fadeValue(t.from, t.to, (now - t.t0) / t.dur);
  }

  private playTrack(name: string, d: any, fade: number) {
    const ac = this.ctx;
    const now = ac.currentTime;
    if (this.current) this.fadeOut(this.current, fade, now);
    const gain = ac.createGain();
    gain.gain.value = fade > 0 ? 0 : 1;
    const src = ac.createBufferSource();
    src.buffer = d.buffer;
    src.loop = true;
    src.loopStart = d.loopStart;
    src.loopEnd = d.loopEnd;
    src.connect(gain);
    gain.connect(this.bus!.music);
    src.start(now, d.loopStart); // a returning track starts from its loop start (SD-12)
    if (fade > 0) gain.gain.setValueCurveAtTime(fadeCurve(0, 1), now, fade);
    this.current = { name, src, gain, from: 0, to: 1, t0: now, dur: fade };
  }

  private fadeOut(t: any, fade: number, now: number) {
    const g0 = this.gainAt(t, now);
    const p = t.gain.gain;
    p.cancelScheduledValues(now);
    if (fade > 0 && g0 > 0) p.setValueCurveAtTime(fadeCurve(g0, 0), now, fade);
    Object.assign(t, { from: g0, to: 0, t0: now, dur: fade });
    t.src.onended = () => {
      try { t.gain.disconnect(); } catch {}
      this.outgoing = this.outgoing.filter((x) => x !== t);
      this.evict();
    };
    try { t.src.stop(now + Math.max(fade, 0)); } catch {}
    this.outgoing.push(t);
  }

  /** When the outgoing crossfade finishes, release everything outside this chapter's group. */
  private evict() {
    const keep = new Set<string>([...this.musicGroup(), ...this.outgoing.map((t) => t.name)]);
    if (this.current) keep.add(this.current.name);
    if (this.want) keep.add(this.want);
    for (const k of [...this.music.keys()]) if (!keep.has(k)) this.music.delete(k);
  }

  // ---- VO ------------------------------------------------------------------------
  playVo(name: string) {
    this.stopVo();
    const token = this.voToken;
    this.loadVo(name).then((buf) => {
      if (buf && token === this.voToken && this.ctx && this.bus) this.startVo(buf);
    });
  }

  private startVo(buf: any) {
    const ac = this.ctx;
    const now = ac.currentTime;
    const gain = ac.createGain();
    gain.gain.value = AUDIO.voLine;
    const src = ac.createBufferSource();
    src.buffer = buf;
    src.connect(gain);
    gain.connect(this.bus!.vo);
    const v = { src, gain };
    src.onended = () => {
      if (this.vo === v) {
        this.vo = null;
        this.setDuck(false);
      }
    };
    src.start(now);
    this.vo = v;
    this.setDuck(true);
  }

  /** Stop the current line with a short fade (Skip/advance, SD-06). */
  stopVo() {
    this.voToken++;
    const v = this.vo;
    this.vo = null;
    if (!v || !this.ac) return;
    const now = this.ac.currentTime;
    v.gain.gain.cancelScheduledValues(now);
    v.gain.gain.setTargetAtTime(0, now, AUDIO.voFadeTau);
    try { v.src.stop(now + AUDIO.voStopAfter); } catch {}
    this.setDuck(false);
  }

  private setDuck(on: boolean) {
    const D = AUDIO.duck;
    if (on) this.ramp(this.duck?.gain, Math.pow(10, D.db / 20), D.attackTau);
    else this.ramp(this.duck?.gain, 1, D.releaseTau);
  }

  // ---- synth cues (unchanged recipes; now on the SFX bus) --------------------------
  tone(freq, dur, type, vol) {
    if (!this.ctx || !this.synth) {
      return;
    }
    let i = this.ctx.createOscillator();
    let a = this.ctx.createGain();
    i.type = type;
    i.frequency.value = freq;
    a.gain.setValueAtTime(vol, this.ctx.currentTime);
    a.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
    i.connect(a);
    a.connect(this.synth);
    i.start();
    i.stop(this.ctx.currentTime + dur);
  }
  shoot(laser) {
    this.tone(laser ? 720 : 196, 0.07, "square", 0.045);
  }
  hit() {
    this.tone(110, 0.14, "sawtooth", 0.06);
  }
  blip() {
    this.tone(320, 0.06, "square", 0.035);
  }
  pickup() {
    this.tone(540, 0.08, "triangle", 0.05);
    this.tone(810, 0.12, "triangle", 0.04);
  }
  alarm() {
    this.tone(466, 0.16, "square", 0.04);
  }
  // ---- file SFX (PR #10 v0.3 shovel cues, moved onto the SFX bus by F-07) -----------
  /** next round-robin index per cue */
  sfxNext = { swing: 0, tonk: 0 };
  private sfxBufs = new Map<string, Promise<any>>();

  /** Decode one SFX file; the start offset skips AAC priming if the decoder kept it. */
  loadSfx(url: string) {
    let p = this.sfxBufs.get(url);
    if (!p) {
      p = this.fetchBytes(url).then((ab) => {
        if (!ab) return null;
        const info = parseGapless(ab);
        return this.decode(ab).then((buffer) => (buffer ? { buffer, offset: loopPoints(info, buffer.duration).loopStart } : null));
      });
      p.then((d) => d || this.sfxBufs.delete(url));
      this.sfxBufs.set(url, p);
    }
    return p;
  }

  /**
   * D-11 shovel cues: Sound Design's files as decoded buffers on the SFX bus.
   * Round-robin a/b/c (never the same twice in a row), +/-3% detune via the source's
   * playbackRate (pitch follows), gain 1.0 into the SFX bus. Plays only once audio is
   * unlocked, like tone(); the first cue starts decoding all six, so menus load nothing.
   */
  playSfx(kind: "swing" | "tonk") {
    if (!this.ctx) {
      return;
    }
    if (!this.sfxBufs.size) for (const u of [...SHOVEL_SFX.swing, ...SHOVEL_SFX.tonk]) this.loadSfx(u);
    const list = SHOVEL_SFX[kind];
    const i = this.sfxNext[kind];
    this.sfxNext[kind] = (i + 1) % list.length;
    const rate = 1 + (random() * 2 - 1) * SHOVEL_SFX.detune;
    this.loadSfx(list[i]).then((d) => {
      const ac = this.ctx;
      if (!d || !ac || !this.bus) return;
      const g = ac.createGain();
      g.gain.value = SHOVEL_SFX.gain;
      const src = ac.createBufferSource();
      src.buffer = d.buffer;
      src.playbackRate.value = rate;
      src.connect(g);
      g.connect(this.bus.sfx);
      src.start(ac.currentTime, d.offset);
    });
  }
  swing() {
    this.playSfx("swing");
  }
  tonk() {
    this.playSfx("tonk");
  }
}
