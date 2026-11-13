import type { Game } from "../game/Game";
import { clamp } from "../engine/math";
export const scenesMethods = {
  drawMoonScene(this: Game, e) {
    this.drawScene("walk", e);
  },
  drawScene(this: Game, e, t) {
    if (e === "cine") {
      this.drawCine(t);
      return;
    }
    let ctx = this.ctx;
    if (!ctx) {
      return;
    }
    this.camX = 0;
    this.paintSky();
    if (
      (e === "jupiter" || e === "victory" || e === "launch") &&
      this.imgOk(this.rim?.jupiter)
    ) {
      ctx.drawImage(this.rim.jupiter, 0, 0, 960, 540);
    } else if (e === "walk" && this.imgOk(this.rim?.ground)) {
      ctx.drawImage(this.rim.ground, 0, 40, 960, 500);
    } else if (this.imgOk(this.rim?.rescue)) {
      ctx.drawImage(this.rim.rescue, 0, 160, 960, 380);
    } else {
      ctx.fillStyle = "#1a242c";
      ctx.fillRect(0, 300, 960, 240);
      ctx.fillStyle = "#24303a";
      ctx.fillRect(80, 250, 220, 70);
      ctx.fillRect(340, 230, 160, 90);
      ctx.fillRect(540, 260, 200, 60);
    }
    let r = this.imgOk(this.rim?.miner?.[2])
      ? this.rim.miner[2]
      : this.art.astro[2];
    let i = this.frame(this.art.fishtd, 8);
    let a = this.imgOk(this.rim?.ship)
      ? this.rim.ship
      : this.frame(this.art.ship, 10);
    let o = clamp(t, 0, 1);
    if (e === "walk") {
      let e = 80 + o * 220;
      this.sprite(r && r.complete ? r : undefined, e, 340, 48, 72);
    } else if (e === "wide") {
      ctx.fillStyle = "rgba(62,199,194,0.8)";
      for (let e = 0; e < 5; e++) {
        ctx.fillRect(120 + e * 140, 246, 10, 8);
      }
    } else if (e === "swarm") {
      for (let e = 0; e < 10; e++) {
        let t = 1000 - o * 1040 + (e % 4) * 30;
        let r = 80 + (e % 5) * 36;
        this.sprite(i, t, r, 70, 32, Math.PI);
        if (!i) {
          ctx.fillStyle = "#7a4ad4";
          ctx.beginPath();
          ctx.ellipse(t, r, 20, 8, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      if (o > 0.45) {
        ctx.fillStyle = "rgba(226,91,74,0.35)";
        ctx.beginPath();
        ctx.arc(460, 270, (o - 0.45) * 180, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (e === "watch") {
      this.sprite(r && r.complete ? r : undefined, 120, 360, 52, 78);
      ctx.fillStyle = "rgba(226,91,74,0.45)";
      ctx.beginPath();
      ctx.arc(620, 280, 30 + o * 40, 0, Math.PI * 2);
      ctx.fill();
    } else if (e === "duel") {
      this.sprite(r && r.complete ? r : undefined, 280, 340, 52, 78);
      let e = 620 - o * 180;
      this.sprite(i, e, 330, 86, 40, Math.PI);
      if (o > 0.5) {
        ctx.strokeStyle = "#e8efe9";
        ctx.beginPath();
        ctx.moveTo(310, 330);
        ctx.lineTo(e - 20, 330);
        ctx.stroke();
      }
    } else if (e === "line") {
      this.sprite(r && r.complete ? r : undefined, 480, 320, 70, 100);
    } else if (e === "arm") {
      this.sprite(r && r.complete ? r : undefined, 360, 330, 56, 84);
      ctx.fillStyle = "#3ec7c2";
      ctx.fillRect(400, 318, 36, 6);
      if (o > 0.35) {
        ctx.strokeStyle = "#3ec7c2";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(430, 320);
        ctx.lineTo(640, 300 - o * 20);
        ctx.stroke();
      }
    } else if (e === "rescue") {
      let e = this.art.astro[0];
      this.sprite(e && e.complete ? e : undefined, 400, 340, 48, 72);
      this.sprite(r && r.complete ? r : undefined, 460, 348 - o * 16, 48, 72);
    } else if (e === "rebuild" || e === "secured") {
      let t = this.art.prop[0];
      let n = this.art.prop[1];
      this.sprite(t && t.complete ? t : undefined, 400, 320, 80, 74);
      if (e === "secured" || o > 0.4) {
        this.sprite(n && n.complete ? n : undefined, 520, 320, 76, 70);
      }
    } else if (e === "launch") {
      let e = 360 - o * 220;
      this.sprite(a, 480, e, 110, 52);
    } else if (e === "jupiter") {
      if (!this.imgOk(this.rim?.jupiter)) {
        let e = ctx.createRadialGradient(680, 260, 20, 680, 260, 150);
        e.addColorStop(0, "#d4a24a");
        e.addColorStop(1, "#8a4b22");
        ctx.fillStyle = e;
        ctx.beginPath();
        ctx.arc(680, 260, 120, 0, Math.PI * 2);
        ctx.fill();
      }
      this.sprite(a, 180, 300, 90, 42);
      for (let e = 0; e < 6; e++) {
        this.sprite(i, 480 + e * 28, 120 + (e % 3) * 40, 54, 26, Math.PI);
      }
    } else {
      if (e === "victory") {
        this.sprite(a, 300, 280, 100, 48);
        ctx.globalAlpha = 0.45;
        this.sprite(this.art.boss[0], 680, 280, 200, 140);
        ctx.globalAlpha = 1;
      }
    }
  },
};
