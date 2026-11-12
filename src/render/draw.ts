import type { Game } from "../game/Game";
import { random } from "../engine/rng";
export const drawMethods = {
  draw(this: Game) {
    let ctx = this.ctx;
    let canvas = this.canvas;
    if (!ctx || !canvas) {
      return;
    }
    let { dpr: dpr, scale: scale, ox: ox, oy: oy } = this.view;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#070b10";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, ox * dpr, oy * dpr);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, 960, 540);
    ctx.clip();
    if (!this.reduce && this.shake > 0) {
      ctx.translate(
        (random() - 0.5) * this.shake * 12,
        (random() - 0.5) * this.shake * 8,
      );
    }
    if (this.mode === "menu" || this.mode === "credits") {
      this.drawMoonScene(0.15);
    } else if (this.mode === "cutscene" || this.mode === "victory") {
      let e = this.cut[this.beat];
      this.drawScene(
        e?.kind ?? (this.mode === "victory" ? "victory" : "wide"),
        e ? this.beatT / e.dur : 1,
      );
    } else {
      if (this.phase === "shooter") {
        this.drawShooter();
      } else {
        this.drawGround();
      }
    }
    ctx.restore();
  },
  sprite(this: Game, img, x, y, w, h, rot = 0) {
    let ctx = this.ctx;
    return !ctx || !img
      ? false
      : (ctx.save(),
        ctx.translate(x, y),
        rot && ctx.rotate(rot),
        ctx.drawImage(img, -w / 2, -h / 2, w, h),
        ctx.restore(),
        true);
  },
  drawTap(this: Game, ctx) {
    if (!this.tap) {
      return;
    }
    ctx.strokeStyle = "#3ec7c2";
    ctx.globalAlpha = 0.9;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 5]);
    ctx.beginPath();
    ctx.moveTo(this.player.x, this.player.y);
    ctx.lineTo(this.tap.x, this.tap.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(this.tap.x, this.tap.y, 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.lineWidth = 1;
  },
};
