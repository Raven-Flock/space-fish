import type { Game } from "../game/Game";
export const shooterMethods = {
  drawShooter(this: Game) {
    let ctx = this.ctx;
    if (!ctx) {
      return;
    }
    this.camX = this.scroll;
    this.camY = 0;
    if (this.imgOk(this.rim?.jupiter)) {
      this.paintFlight(ctx);
    } else {
      this.paintSky();
    }
    ctx.save();
    ctx.translate(-this.camX, 0);
    this.drawTap(ctx);
    if (this.imgOk(this.rim?.ship)) {
      ctx.drawImage(
        this.rim.ship,
        this.player.x - 63,
        this.player.y - 21,
        126,
        42,
      );
    } else {
      let t = this.frame(this.art.ship, 10);
      if (!this.sprite(t, this.player.x, this.player.y, 84, 40)) {
        ctx.fillStyle = "#e8efe9";
        ctx.fillRect(this.player.x - 20, this.player.y - 8, 40, 16);
      }
    }
    if (this.shipKit.drone) {
      ctx.fillStyle = "#3ec7c2";
      ctx.beginPath();
      ctx.arc(
        this.player.x + 8,
        this.player.y + Math.sin(this.time * 6) * 26,
        5,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
    let n = this.frame(this.art.fishside);
    for (let t of this.fish) {
      if (this.imgOk(this.rim?.fishside)) {
        ctx.drawImage(this.rim.fishside, t.x - 52, t.y - 18, 104, 36);
      } else if (!this.sprite(n, t.x, t.y, 78, 42)) {
        ctx.fillStyle = "#7a4ad4";
        ctx.beginPath();
        ctx.ellipse(t.x, t.y, 26, 12, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (this.bossOn && this.boss.hp > 0) {
      if (this.imgOk(this.rim?.boss)) {
        ctx.drawImage(
          this.rim.boss,
          this.boss.x - 160,
          this.boss.y - 60,
          320,
          120,
        );
      } else if (
        !this.sprite(
          this.art.boss[0]?.complete ? this.art.boss[0] : undefined,
          this.boss.x,
          this.boss.y,
          250,
          170,
        )
      ) {
        ctx.fillStyle = "#7a4ad4";
        ctx.beginPath();
        ctx.ellipse(this.boss.x, this.boss.y, 90, 50, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    for (let t of this.pickups) {
      ctx.fillStyle = t.kind === "shield" ? "#d4a24a" : "#3ec7c2";
      ctx.beginPath();
      ctx.arc(t.x, t.y, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#06211f";
      ctx.font = "10px Oxanium, sans-serif";
      let n =
        t.kind === "speed"
          ? "S"
          : t.kind === "spread"
            ? "M"
            : t.kind === "drone"
              ? "O"
              : "H";
      ctx.fillText(n, t.x - 4, t.y + 3);
    }
    for (let t of this.bullets) {
      ctx.fillStyle = t.friendly ? "#3ec7c2" : "#c084fc";
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  },
  paintFlight(this: Game, e) {
    e.fillStyle = "#05070c";
    e.fillRect(0, 0, 960, 540);
    let t = this.rim.jupiter;
    let n = -((this.scroll * 0.03) % 80);
    e.drawImage(t, n - 220, -16, 1320, 572);
    for (let t = 0; t < 36; t++) {
      let n = (((t * 97 + this.scroll * 0.35) % 960) + 960) % 960;
      let r = (t * 53) % 220;
      e.fillStyle = "rgba(232,239,233,0.75)";
      e.fillRect(n, r, t % 6 === 0 ? 2 : 1, 1);
    }
  },
  paintSky(this: Game) {
    let ctx = this.ctx;
    if (ctx) {
      ctx.fillStyle = "#0c1218";
      ctx.fillRect(0, 0, 960, 540);
      for (let t = 0; t < 48; t++) {
        let n = (((t * 137 + this.camX * 0.2) % 960) + 960) % 960;
        let r = (t * 89) % 540;
        ctx.fillStyle = "rgba(232,239,233,0.75)";
        ctx.fillRect(n, r, t % 5 == 0 ? 2 : 1, t % 5 == 0 ? 2 : 1);
      }
    }
  },
};
