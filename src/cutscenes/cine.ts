import type { Game } from "../game/Game";
import { bleedOf } from "../engine/view";
import { INTRO_LOAD } from "../content/introLoad";
export const cineMethods = {
  loadCine(this: Game) {
    this.cine = {};
    for (let e of ["dig", "turn", "swarm", "fish", "fight", "close"]) {
      let t = new Image();
      // F-05: plates are fetched in beat order (introLoad.ts); live set src here at boot
      this.queuePlate(e, t) || (t.src = `opening/${e}.jpg`);
      this.cine[e] = t;
    }
    this.cineVid = null;
    this.voiceEl = null;
  },
  playCine(this: Game) {
    this.stopCine();
    if (this.cutId !== "intro" || this.mode !== "cutscene") {
      return;
    }
    let beat = this.cut[this.beat];
    if (!beat) {
      return;
    }
    if (this.holdBeat()) {
      // F-05: the plate hasn't decoded; Game.tick starts this beat (and its VO) when it has
      this.intro.waitBeat = this.beat;
      this.logBeat("beat-hold");
      return;
    }
    this.logBeat("beat-start");
    if (beat.voice) {
      // F-07: the line plays from a decoded buffer on the Web Audio VO bus.
      this.audio.playVo(beat.voice);
    }
  },
  stopCine(this: Game) {
    // short fade instead of a hard cut (Sound SD-06); also releases the music duck
    this.audio.stopVo();
    this.voiceEl = null;
  },
  drawCine(this: Game, e) {
    let ctx = this.ctx;
    if (!ctx) {
      return;
    }
    let n = this.cut[this.beat];
    let r = this.cine?.[n?.plate];
    let i = r && r.complete && r.naturalWidth;
    // F-04 (VP v0.1.2 §5): plates stay centred at their 540-tall fit; the extended sky and
    // stars fill the bleed behind them
    let b = bleedOf(this.view);
    let W = 960 + 2 * b;
    if (!i && this.plateFailed(n?.plate)) {
      // F-05 (WP 3): the plate failed for good: a dimmed palette gradient, never black
      let g = ctx.createLinearGradient(0, 0, 0, 540);
      g.addColorStop(0, INTRO_LOAD.fallback.top);
      g.addColorStop(1, INTRO_LOAD.fallback.bottom);
      ctx.fillStyle = g;
      ctx.fillRect(0 - b, 0, W, 540);
      return;
    }
    if (!i) {
      this.paintSky();
      ctx.fillStyle = "#1a242c";
      ctx.fillRect(0 - b, 280, W, 260);
      return;
    }
    if (b > 0) {
      this.paintSky();
    }
    let a = r.naturalWidth;
    let o = r.naturalHeight;
    let s = this.reduce ? 1.04 : 1.06 + e * 0.03;
    let c = Math.max(960 / a, 540 / o) * s;
    let l = a * c;
    let u = o * c;
    let d = Math.max(0, (l - 960) / 2);
    let f = Math.max(0, (u - 540) / 2);
    let p = this.reduce ? 0 : (e - 0.5) * d * 0.25;
    let m = this.reduce ? 0 : (0.5 - e) * f * 0.35;
    ctx.drawImage(r, (960 - l) / 2 + p, (540 - u) / 2 + m, l, u);
    let h = ctx.createLinearGradient(0, 430, 0, 540);
    h.addColorStop(0, "rgba(0,0,0,0)");
    h.addColorStop(1, "rgba(0,0,0,0.62)");
    ctx.fillStyle = h;
    ctx.fillRect(0 - b, 430, W, 110);
  },
};
