import type { Game } from "../game/Game";
export const cineMethods = {
  loadCine(this: Game) {
    this.cine = {};
    for (let e of ["dig", "turn", "swarm", "fish", "fight", "close"]) {
      let t = new Image();
      t.src = `opening/${e}.jpg`;
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
    if (beat.voice) {
      let t = new Audio(`opening/${beat.voice}.mp3`);
      t.volume = 0.95;
      this.voiceEl = t;
      t.play().catch(() => {});
    }
  },
  stopCine(this: Game) {
    if (this.voiceEl) {
      this.voiceEl.pause();
      this.voiceEl.src = "";
    }
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
    if (!i) {
      this.paintSky();
      ctx.fillStyle = "#1a242c";
      ctx.fillRect(0, 280, 960, 260);
      return;
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
    ctx.fillRect(0, 430, 960, 110);
  },
};
