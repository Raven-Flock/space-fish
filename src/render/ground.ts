import type { Game } from "../game/Game";
import { SHOVEL } from "../content/tuning/shovel";
export const groundMethods = {
  drawGround(this: Game) {
    let ctx = this.ctx;
    if (!ctx) {
      return;
    }
    this.updateCam();
    this.paintSky();
    ctx.save();
    ctx.translate(-this.camX, -this.camY);
    if (this.phase === "stealth" && this.imgOk(this.rim?.ground)) {
      this.drawRimTerrain(ctx);
    } else if (this.phase === "rescue" && this.imgOk(this.rim?.rescue)) {
      ctx.drawImage(this.rim.rescue, 0, 0, this.world.w, this.world.h);
      this.drawBulkheads(ctx);
    } else if (this.phase === "base" && this.imgOk(this.rim?.yard)) {
      ctx.drawImage(this.rim.yard, 0, 0, this.world.w, this.world.h);
      this.drawBulkheads(ctx);
    } else {
      ctx.fillStyle = this.phase === "rescue" ? "#12181e" : "#1a242c";
      ctx.fillRect(0, 0, this.world.w, this.world.h);
      ctx.strokeStyle = "rgba(232,239,233,0.05)";
      ctx.lineWidth = 1;
      for (let t = 0; t < this.world.w; t += 80) {
        ctx.beginPath();
        ctx.moveTo(t, 0);
        ctx.lineTo(t, this.world.h);
        ctx.stroke();
      }
      for (let t of this.covers) {
        ctx.fillStyle = this.phase === "rescue" ? "#24303a" : "#2c3a44";
        ctx.fillRect(t.x, t.y, t.w, t.h);
        ctx.strokeStyle = "rgba(62,199,194,0.35)";
        ctx.strokeRect(
          t.x + 4,
          t.y + 4,
          Math.max(0, t.w - 8),
          Math.max(0, t.h - 8),
        );
      }
    }
    if (this.phase === "stealth") {
      for (let t of this.fish) {
        this.drawCone(t);
      }
      if (this.imgOk(this.rim?.crate)) {
        ctx.save();
        ctx.translate(this.cache.x, this.cache.y);
        let t = ctx.createRadialGradient(0, 0, 4, 0, 0, 48);
        t.addColorStop(0, "rgba(212,162,74,0.55)");
        t.addColorStop(1, "rgba(212,162,74,0)");
        ctx.fillStyle = t;
        ctx.beginPath();
        ctx.arc(0, 0, 48, 0, Math.PI * 2);
        ctx.fill();
        ctx.drawImage(this.rim.crate, -28, -24, 56, 48);
        ctx.restore();
      } else {
        ctx.fillStyle = "rgba(212,162,74,0.9)";
        ctx.beginPath();
        ctx.arc(this.cache.x, this.cache.y, 18, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#e8efe9";
      ctx.font = "12px Sora, sans-serif";
      ctx.fillText("CACHE", this.cache.x - 22, this.cache.y - 34);
    }
    if (this.phase === "base") {
      let padLive =
        this.structures.filter((e) => e.kind === "gen" && e.repaired).length >=
          1 &&
        this.structures.filter((e) => e.kind === "turret" && e.repaired)
          .length >= 2 &&
        this.structures.filter((e) => e.kind === "lab" && e.repaired).length >=
          1;
      this.drawPadRig(ctx, padLive);
      for (let t of this.nodes) {
        if (!t.taken) {
          this.drawScrap(ctx, t.x, t.y);
        }
      }
      if (this.nest.hp > 0) {
        if (this.imgOk(this.rim?.nest)) {
          ctx.drawImage(
            this.rim.nest,
            this.nest.x - 70,
            this.nest.y - 64,
            140,
            128,
          );
        } else {
          let t = this.art.prop[3];
          if (
            !this.sprite(
              t && t.complete ? t : undefined,
              this.nest.x,
              this.nest.y,
              96,
              90,
            )
          ) {
            ctx.fillStyle = "#7a4ad4";
            ctx.beginPath();
            ctx.arc(this.nest.x, this.nest.y, this.nest.r, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
      for (let t of this.structures) {
        this.drawRig(ctx, t);
      }
      for (let n = 0; n < this.freedCount; n++) {
        let r = this.rim?.miner?.[0];
        if (this.imgOk(r)) {
          ctx.drawImage(r, this.pad.x - 78 + n * 28, this.pad.y + 28, 24, 36);
        } else {
          this.sprite(
            this.art.astro[0],
            this.pad.x - 70 + n * 28,
            this.pad.y + 50,
            28,
            42,
          );
        }
      }
    }
    for (let t of this.holdouts) {
      if (t.freed) {
        continue;
      }
      let n = this.imgOk(this.rim?.miner?.[0])
        ? this.rim.miner[0]
        : this.art.astro[0];
      if (this.imgOk(n)) {
        ctx.drawImage(n, t.x - 16, t.y - 28, 32, 48);
      } else {
        this.sprite(n && n.complete ? n : undefined, t.x, t.y, 36, 54);
      }
      ctx.strokeStyle = "#d4a24a";
      ctx.strokeRect(t.x - 16, t.y - 30, 32, 8);
    }
    if (this.decoy) {
      ctx.fillStyle = "#d4a24a";
      ctx.beginPath();
      ctx.arc(this.decoy.x, this.decoy.y, 6, 0, Math.PI * 2);
      ctx.fill();
    }
    let t = this.frame(this.art.fishtd);
    for (let n of this.fish) {
      if (this.imgOk(this.rim?.fish)) {
        ctx.save();
        ctx.translate(n.x, n.y);
        ctx.rotate(n.facing);
        ctx.fillStyle = "rgba(0,0,0,0.4)";
        ctx.beginPath();
        ctx.ellipse(8, 6, 30, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.drawImage(this.rim.fish, -44, -18, 88, 36);
        ctx.restore();
      } else if (!this.sprite(t, n.x, n.y, 64, 30, n.facing)) {
        ctx.fillStyle = "#7a4ad4";
        ctx.beginPath();
        ctx.ellipse(n.x, n.y, 22, 10, n.facing, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    for (let t of this.bullets) {
      ctx.fillStyle = t.friendly
        ? this.weapon === "laser"
          ? "#3ec7c2"
          : "#e8efe9"
        : "#7a4ad4";
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
      ctx.fill();
    }
    let n = this.art.astro[this.dir];
    let rimMiner = this.rim?.miner?.[this.dir];
    if (this.tap) {
      this.drawTap(ctx);
    }
    if (this.imgOk(rimMiner)) {
      ctx.save();
      ctx.translate(this.player.x, this.player.y);
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.beginPath();
      ctx.ellipse(8, 18, 14, 5, 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.drawImage(rimMiner, -24, -38, 48, 74);
      ctx.restore();
      this.drawHeldTool(ctx);
    } else {
      if (
        !this.sprite(
          n && n.complete ? n : undefined,
          this.player.x,
          this.player.y,
          42,
          64,
        )
      ) {
        ctx.fillStyle = "#e8efe9";
        ctx.fillRect(this.player.x - 8, this.player.y - 14, 16, 28);
      }
      this.drawHeldTool(ctx);
    }
    this.drawShovelTrail(ctx);
    if (this.weapon === "laser" && this.phase !== "shooter") {
      this.drawAim(ctx);
    }
    for (let t of this.particles) {
      ctx.globalAlpha = Math.max(0, t.life / t.max);
      ctx.fillStyle = t.color;
      ctx.fillRect(t.x, t.y, t.s, t.s);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    if (this.phase === "stealth" && this.imgOk(this.rim?.ground)) {
      this.drawRimAtmosphere(ctx);
    }
    this.drawArrow();
    if (this.invuln > 0) {
      ctx.fillStyle = "rgba(226,91,74,0.18)";
      ctx.fillRect(0, 0, 960, 540);
    }
  },
  drawBulkheads(this: Game, ctx) {
    for (let t of this.covers) {
      ctx.fillStyle =
        this.phase === "rescue" ? "rgba(10,14,18,0.8)" : "rgba(16,18,20,0.45)";
      ctx.fillRect(t.x, t.y, t.w, t.h);
      ctx.strokeStyle = "rgba(212,162,74,0.3)";
      ctx.strokeRect(
        t.x + 1,
        t.y + 1,
        Math.max(0, t.w - 2),
        Math.max(0, t.h - 2),
      );
    }
  },
  drawRimTerrain(this: Game, ctx) {
    let t = this.rim.ground;
    ctx.drawImage(t, 0, 0, this.world.w, this.world.h);
    let n = ctx.createLinearGradient(0, 0, this.world.w, this.world.h * 0.35);
    n.addColorStop(0, "rgba(255,168,90,0.08)");
    n.addColorStop(1, "rgba(0,0,0,0.28)");
    ctx.fillStyle = n;
    ctx.fillRect(0, 0, this.world.w, this.world.h);
    for (let t = 0; t < this.covers.length; t++) {
      let n = this.covers[t];
      let r = n.h > 180;
      let i = n.x === 700 && n.y === 990;
      let a = this.rim.rock;
      if (this.imgOk(a)) {
        ctx.save();
        ctx.globalAlpha = r ? 0.72 : 1;
        ctx.drawImage(a, n.x, n.y, n.w, n.h);
        ctx.restore();
      }
      let o = i ? this.rim.robot : r ? this.rim.dome : null;
      if (!this.imgOk(o)) {
        continue;
      }
      let s = Math.min(n.w / o.naturalWidth, n.h / o.naturalHeight);
      let c = o.naturalWidth * s;
      let l = o.naturalHeight * s;
      ctx.save();
      ctx.translate(n.x + n.w / 2, n.y + n.h / 2);
      if (t % 2) {
        ctx.scale(-1, 1);
      }
      ctx.drawImage(o, -c / 2, -l / 2, c, l);
      ctx.restore();
    }
    ctx.fillStyle = "rgba(232,224,208,0.7)";
    for (let t = 0; t < 40; t++) {
      let n = (t * 173 + this.time * (8 + (t % 6))) % this.world.w;
      let r = (t * 97 + Math.sin(this.time * 0.6 + t) * 8) % this.world.h;
      ctx.globalAlpha = 0.12 + (t % 5) * 0.05;
      ctx.fillRect(n, r < 0 ? r + this.world.h : r, t % 4 === 0 ? 2 : 1, 1);
    }
    ctx.globalAlpha = 1;
  },
  drawRimAtmosphere(this: Game, ctx) {
    let t = this.rim?.horizon;
    if (this.imgOk(t)) {
      ctx.save();
      let n = -((this.camX * 0.15) % 220);
      ctx.drawImage(
        t,
        0,
        Math.floor(t.naturalHeight * 0.12),
        t.naturalWidth,
        Math.floor(t.naturalHeight * 0.46),
        n - 40,
        0,
        1120,
        108,
      );
      let r = ctx.createLinearGradient(0, 36, 0, 112);
      r.addColorStop(0, "rgba(8,10,14,0)");
      r.addColorStop(1, "rgba(8,10,14,0.97)");
      ctx.fillStyle = r;
      ctx.fillRect(0, 0, 960, 116);
      ctx.restore();
    }
    ctx.save();
    let n = ctx.createRadialGradient(480, 310, 150, 480, 280, 640);
    n.addColorStop(0, "rgba(0,0,0,0)");
    n.addColorStop(1, "rgba(0,0,0,0.42)");
    ctx.fillStyle = n;
    ctx.fillRect(0, 0, 960, 540);
    ctx.restore();
  },
  drawCone(this: Game, fish) {
    let ctx = this.ctx;
    if (ctx) {
      ctx.fillStyle =
        this.alert > 0 ? "rgba(226,91,74,0.16)" : "rgba(62,199,194,0.10)";
      ctx.beginPath();
      ctx.moveTo(fish.x, fish.y);
      ctx.arc(fish.x, fish.y, 236, fish.facing - 0.62, fish.facing + 0.62);
      ctx.closePath();
      ctx.fill();
    }
  },
  drawArrow(this: Game) {
    let ctx = this.ctx;
    if (!ctx || this.mode !== "play") {
      return;
    }
    let t = 0;
    let n = 0;
    if (this.phase === "stealth") {
      t = this.cache.x;
      n = this.cache.y;
    } else if (this.phase === "rescue") {
      let e = this.holdouts.find((e) => !e.freed);
      if (!e) {
        return;
      }
      t = e.x;
      n = e.y;
    } else if (this.phase === "base") {
      if (this.launchReady()) {
        t = this.pad.x;
        n = this.pad.y;
      } else if (this.nest.hp > 0 && this.repairedTotal() >= 3) {
        t = this.nest.x;
        n = this.nest.y;
      } else {
        let e = this.nodes.find((e) => !e.taken);
        if (!e) {
          return;
        }
        t = e.x;
        n = e.y;
      }
    } else {
      return;
    }
    let r = t - this.camX;
    let i = n - this.camY;
    if (r > 24 && i > 24 && r < 936 && i < 516) {
      return;
    }
    let a = Math.atan2(i - 270, r - 480);
    let o = 480 + Math.cos(a) * 200;
    let s = 270 + Math.sin(a) * 120;
    ctx.save();
    ctx.translate(o, s);
    ctx.rotate(a);
    ctx.fillStyle = "#d4a24a";
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.lineTo(-8, 7);
    ctx.lineTo(-8, -7);
    ctx.fill();
    ctx.restore();
  },
  repairedTotal(this: Game) {
    return this.structures.filter((e) => e.repaired).length;
  },
  drawScrap(this: Game, ctx, x, y) {
    let crate = this.rim?.crate;
    if (this.imgOk(crate)) {
      ctx.save();
      ctx.translate(x, y);
      ctx.drawImage(crate, -16, -14, 32, 26);
      ctx.fillStyle = "rgba(212,162,74,0.85)";
      ctx.fillRect(-6, -4, 8, 5);
      ctx.restore();
      return;
    }
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = "#8a7044";
    ctx.beginPath();
    ctx.moveTo(-12, 4);
    ctx.lineTo(-8, -8);
    ctx.lineTo(4, -10);
    ctx.lineTo(12, 2);
    ctx.lineTo(6, 10);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#d4a24a";
    ctx.fillRect(-4, -3, 9, 6);
    ctx.restore();
  },
  drawPadRig(this: Game, ctx, live) {
    ctx.save();
    ctx.translate(this.pad.x, this.pad.y);
    if (!live) {
      ctx.filter = "saturate(0.15) brightness(0.5)";
    }
    if (this.imgOk(this.rim?.pad)) {
      ctx.drawImage(this.rim.pad, -54, -54, 108, 108);
    } else {
      ctx.filter = "none";
      ctx.strokeStyle = live ? "#d4a24a" : "#5c5348";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, 40, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 22, 0, Math.PI * 2);
      ctx.stroke();
      for (let i = 0; i < 4; i++) {
        ctx.rotate(Math.PI / 2);
        ctx.fillStyle = live ? "#c8b48a" : "#3a342c";
        ctx.fillRect(18, -4, 16, 8);
      }
    }
    ctx.filter = "none";
    if (!live) {
      ctx.strokeStyle = "rgba(40,28,18,0.85)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-30, -8);
      ctx.lineTo(-6, 6);
      ctx.lineTo(18, -14);
      ctx.lineTo(34, 10);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-18, 22);
      ctx.lineTo(8, 4);
      ctx.stroke();
      let puff = (this.time * 14) % 26;
      ctx.fillStyle = "rgba(160,160,160,0.22)";
      ctx.beginPath();
      ctx.arc(-10, -28 - puff * 0.4, 5 + puff * 0.08, 0, Math.PI * 2);
      ctx.fill();
    } else {
      let glow = ctx.createRadialGradient(0, 0, 8, 0, 0, 58);
      glow.addColorStop(0, "rgba(212,162,74,0.45)");
      glow.addColorStop(1, "rgba(212,162,74,0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, 58, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    ctx.fillStyle = "#e8efe9";
    ctx.font = "12px Sora, sans-serif";
    ctx.fillText(live ? "PAD" : "PAD WRECK", this.pad.x - (live ? 14 : 32), this.pad.y - 58);
  },
  drawRig(this: Game, ctx, rig) {
    let img =
      rig.kind === "gen"
        ? this.rim?.gen
        : rig.kind === "turret"
          ? this.rim?.turret
          : this.rim?.lab;
    ctx.save();
    ctx.translate(rig.x, rig.y);
    if (!rig.repaired) {
      ctx.rotate(rig.kind === "turret" ? 0.22 : rig.kind === "lab" ? -0.1 : 0.06);
      ctx.filter = "saturate(0.18) brightness(0.58) contrast(1.2)";
    }
    if (this.imgOk(img)) {
      ctx.drawImage(img, -40, -38, 80, 76);
    } else {
      ctx.filter = "none";
      this.drawRigShape(ctx, rig.kind, !!rig.repaired);
    }
    ctx.filter = "none";
    if (!rig.repaired) {
      ctx.fillStyle = "rgba(18,10,6,0.5)";
      ctx.beginPath();
      ctx.ellipse(8, 10, 24, 11, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#4a4036";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-22, -12);
      ctx.lineTo(-4, 8);
      ctx.lineTo(14, -4);
      ctx.stroke();
      if (Math.sin(this.time * 9 + rig.x) > 0.65) {
        ctx.fillStyle = "rgba(255,176,80,0.4)";
        ctx.beginPath();
        ctx.arc(12, -16, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ffc27a";
        ctx.fillRect(11, -17, 3, 3);
      }
      let puff = (this.time * 16 + (rig.x % 17)) % 24;
      ctx.fillStyle = "rgba(190,190,190,0.22)";
      ctx.beginPath();
      ctx.arc(-8, -24 - puff * 0.35, 4 + puff * 0.1, 0, Math.PI * 2);
      ctx.fill();
      if (this.build === rig.kind) {
        ctx.strokeStyle = "#d4a24a";
        ctx.setLineDash([4, 3]);
        ctx.lineWidth = 1.5;
        ctx.strokeRect(-44, -42, 88, 84);
        ctx.setLineDash([]);
      }
    } else {
      let glow = ctx.createRadialGradient(0, 0, 6, 0, 0, 46);
      let color =
        rig.kind === "gen"
          ? "rgba(62,199,194,0.4)"
          : rig.kind === "turret"
            ? "rgba(212,162,74,0.35)"
            : "rgba(122,74,212,0.35)";
      glow.addColorStop(0, color);
      glow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, 46, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  },
  drawRigShape(this: Game, ctx, kind, live) {
    ctx.fillStyle = live ? "#2c3a40" : "#1a1816";
    ctx.strokeStyle = live ? "#d4a24a" : "#5a5046";
    ctx.lineWidth = 2;
    if (kind === "gen") {
      ctx.fillRect(-28, -16, 56, 32);
      ctx.strokeRect(-28, -16, 56, 32);
      ctx.fillStyle = live ? "#3ec7c2" : "#3a342c";
      ctx.beginPath();
      ctx.arc(-10, -2, 10, 0, Math.PI * 2);
      ctx.arc(12, -2, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#8a8174";
      ctx.beginPath();
      ctx.moveTo(-28, 8);
      ctx.lineTo(-36, 18);
      ctx.moveTo(28, 8);
      ctx.lineTo(36, 18);
      ctx.stroke();
    } else if (kind === "turret") {
      ctx.beginPath();
      ctx.arc(0, 4, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.save();
      ctx.rotate(-0.4);
      ctx.fillStyle = live ? "#c8b48a" : "#4a433c";
      ctx.fillRect(0, -4, 36, 8);
      ctx.restore();
    } else {
      ctx.fillRect(-26, -6, 52, 28);
      ctx.strokeRect(-26, -6, 52, 28);
      ctx.beginPath();
      ctx.arc(0, -6, 16, Math.PI, 0);
      ctx.fillStyle = live ? "rgba(122,74,212,0.85)" : "#2a2430";
      ctx.fill();
      ctx.stroke();
    }
  },
  drawHeldTool(this: Game, ctx) {
    let ang =
      this.dir === 1
        ? Math.PI
        : this.dir === 2
          ? 0
          : this.dir === 3
            ? -Math.PI / 2
            : Math.PI / 2;
    let swing =
      this.shovelT > 0 ? Math.sin((1 - this.shovelT / 0.34) * Math.PI) * 0.9 : 0;
    ctx.save();
    ctx.translate(this.player.x, this.player.y);
    ctx.rotate(ang + (this.weapon === "shovel" ? swing : 0));
    if (this.weapon === "shovel") {
      ctx.strokeStyle = "#6b5e50";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(6, 8);
      ctx.lineTo(28, -10);
      ctx.stroke();
      ctx.fillStyle = "#d9d3c6";
      ctx.strokeStyle = "#8d867a";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(22, -18);
      ctx.lineTo(40, -8);
      ctx.lineTo(32, 8);
      ctx.lineTo(16, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#b7b1a4";
      ctx.fillRect(24, -12, 8, 3);
    } else if (this.weapon === "laser") {
      ctx.fillStyle = "#1c2428";
      ctx.fillRect(8, -3, 28, 6);
      ctx.fillStyle = "#3ec7c2";
      ctx.fillRect(34, -2, 8, 4);
      ctx.fillStyle = "#d4a24a";
      ctx.fillRect(14, -5, 6, 2);
    }
    ctx.restore();
  },
  // D-11 shovel: brass arc trail over the 100° reach during wind-up and the hit
  // window. Player-side colour only (never teal or magenta). Off with reduced motion.
  drawShovelTrail(this: Game, ctx) {
    let s = this.swing;
    if (!s || this.reduce) {
      return;
    }
    let half = (SHOVEL.arcDeg * Math.PI) / 360;
    let k = Math.min(1, s.t / (SHOVEL.windup + SHOVEL.active));
    ctx.save();
    ctx.globalAlpha = 0.85 * (1 - k * 0.6);
    ctx.strokeStyle = SHOVEL.trailColor;
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(this.player.x, this.player.y, SHOVEL.reach - 8, s.ang - half, s.ang - half + half * 2 * Math.max(0.15, k));
    ctx.stroke();
    ctx.restore();
  },
  drawAim(this: Game, ctx) {
    let ang = this.aimAngle();
    ctx.save();
    ctx.translate(this.player.x, this.player.y);
    ctx.rotate(ang);
    ctx.strokeStyle = "rgba(62,199,194,0.9)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(22, 0);
    ctx.lineTo(46, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(46, 0);
    ctx.lineTo(38, -4);
    ctx.lineTo(38, 4);
    ctx.closePath();
    ctx.fillStyle = "#3ec7c2";
    ctx.fill();
    ctx.restore();
  },
};
