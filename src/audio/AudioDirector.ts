import { MUSIC_KEY } from "../save/keys";
import { SHOVEL_SFX } from "../content/tuning/sfx";
import { random } from "../engine/rng";
export class AudioDirector {
  ctx = null;
  master = null;
  mood = "";
  musicVol = 0.7;
  current = null;
  fadeToken = 0;
  loops = null;
  /** shovel SFX elements, created and loaded once by unlock() (Start/Continue/Retry), so the
   *  first swing doesn't wait on a fetch; nothing loads before that, so menus load nothing new */
  sfx = null;
  /** next round-robin index per cue */
  sfxNext = { swing: 0, tonk: 0 };
  constructor() {
    try {
      let e = localStorage.getItem(MUSIC_KEY);
      if (e != null) {
        this.musicVol = Math.max(0, Math.min(1, parseFloat(e) || 0));
      }
    } catch {}
  }
  ensureLoops() {
    if (this.loops) {
      return;
    }
    let e = (e) => {
      let t = new Audio(`music/${e}.mp3`);
      t.loop = true;
      t.preload = "auto";
      t.volume = 0;
      return t;
    };
    this.loops = {
      rim: e("rim"),
      holdouts: e("holdouts"),
      base: e("base"),
      swarm: e("swarm"),
      transit: e("transit"),
      ending: e("ending"),
    };
  }
  unlock() {
    let e = window.AudioContext || window.webkitAudioContext;
    if (e) {
      if (!this.ctx) {
        this.ctx = new e();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.22;
        this.master.connect(this.ctx.destination);
      }
    }
    this.ctx?.resume();
    this.ensureLoops();
    this.primeSfx();
    if (!this.mood) {
      this.setMood("rim");
    }
  }
  /**
   * QA (PR #10 v0.3): prime the shovel SFX at audio unlock, not on the first swing.
   * Creates the six elements once, at the cue trim, and starts loading them.
   */
  primeSfx() {
    if (this.sfx) {
      return;
    }
    let make = (src) => {
      let a = new Audio(src);
      a.preload = "auto";
      a.volume = SHOVEL_SFX.gain;
      a.load();
      return a;
    };
    this.sfx = {
      swing: SHOVEL_SFX.swing.map(make),
      tonk: SHOVEL_SFX.tonk.map(make),
    };
  }
  close() {
    if (this.current) {
      this.current.pause();
      this.current = null;
    }
    this.ctx?.close();
    this.ctx = null;
  }
  setMusic(vol) {
    this.musicVol = Math.max(0, Math.min(1, vol));
    if (this.current) {
      this.current.volume = this.musicVol;
    }
    try {
      localStorage.setItem(MUSIC_KEY, String(this.musicVol));
    } catch {}
  }
  setMood(mood) {
    let alias = {
      stealth: "rim",
      menu: "rim",
      alert: "swarm",
      shooter: "transit",
      rescue: "holdouts",
    };
    mood = alias[mood] || mood;
    this.ensureLoops();
    if (mood === this.mood) {
      return;
    }
    this.mood = mood;
    let next = this.loops[mood];
    if (!next) {
      return;
    }
    let prev = this.current;
    if (prev === next) {
      return;
    }
    let token = ++this.fadeToken;
    let t0 = performance.now();
    next.volume = 0;
    next.play().catch(() => {});
    let fade = () => {
      if (token !== this.fadeToken) {
        return;
      }
      let e = Math.min(1, (performance.now() - t0) / 700);
      next.volume = this.musicVol * e;
      if (prev && prev !== next) {
        prev.volume = this.musicVol * (1 - e);
      }
      if (e < 1) {
        requestAnimationFrame(fade);
      } else if (prev && prev !== next) {
        prev.pause();
      }
    };
    this.current = next;
    fade();
  }
  tone(freq, dur, type, vol) {
    if (!this.ctx || !this.master) {
      return;
    }
    let i = this.ctx.createOscillator();
    let a = this.ctx.createGain();
    i.type = type;
    i.frequency.value = freq;
    a.gain.setValueAtTime(vol, this.ctx.currentTime);
    a.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
    i.connect(a);
    a.connect(this.master);
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
  /**
   * D-11 shovel cues: Sound Design's files on the current file-playback path
   * (HTMLAudio, like music and voice; the Web Audio move is F-07, a separate PR).
   * Round-robin a/b/c, so a variant never plays twice in a row; +/-3% detune via
   * playbackRate (pitch follows). Plays only once audio is unlocked, like tone().
   * Every cue plays at SHOVEL_CUE_TRIM (0.53, Sound's level correction), never at the
   * Music slider. Reduced motion doesn't change audio.
   */
  playSfx(kind) {
    if (!this.ctx) {
      return;
    }
    this.primeSfx();
    let list = this.sfx[kind];
    let i = this.sfxNext[kind];
    this.sfxNext[kind] = (i + 1) % list.length;
    let a = list[i];
    a.currentTime = 0;
    a.volume = SHOVEL_SFX.gain;
    a.preservesPitch = false;
    a.webkitPreservesPitch = false;
    a.playbackRate = 1 + (random() * 2 - 1) * SHOVEL_SFX.detune;
    a.play()?.catch?.(() => {});
  }
  swing() {
    this.playSfx("swing");
  }
  tonk() {
    this.playSfx("tonk");
  }
}
