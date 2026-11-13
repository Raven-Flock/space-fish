import type { Game } from "./Game";
import { clamp, hyp } from "../engine/math";
import { circleHitsRect } from "../engine/collision";
export const playerMethods = {
  tickGround(this: Game, dt, wish, speed, sneaking) {
    let x0 = this.player.x;
    let y0 = this.player.y;
    let nx = x0 + wish.x * speed * wish.mag * dt;
    let ny = y0 + wish.y * speed * wish.mag * dt;
    if (this.blocked(nx, y0, 14)) {
      nx = x0;
    }
    if (this.blocked(nx, ny, 14)) {
      ny = y0;
    }
    this.player.x = clamp(nx, 14, this.world.w - 14);
    this.player.y = clamp(ny, 14, this.world.h - 14);
    this.vx = (this.player.x - x0) / dt;
    this.vy = (this.player.y - y0) / dt;
    this.speed = hyp(this.vx, this.vy);
    if (this.speed > 12) {
      this.dir =
        Math.abs(this.vx) > Math.abs(this.vy)
          ? this.vx < 0
            ? 1
            : 2
          : this.vy < 0
            ? 3
            : 0;
    }
    let held = this.held();
    let usePressed = this.interactPulse || (!this.prevE && held.has("KeyE"));
    let noisePressed = this.decoyPulse || (!this.prevQ && held.has("KeyQ"));
    this.prevE = held.has("KeyE");
    this.prevQ = held.has("KeyQ");
    this.interactPulse = false;
    this.decoyPulse = false;
    if (noisePressed && this.decoyCd <= 0 && this.phase === "stealth") {
      let e = this.aimAngle();
      this.decoy = {
        x: this.player.x + Math.cos(e) * 190,
        y: this.player.y + Math.sin(e) * 190,
        life: 4,
      };
      this.decoyCd = 3.2;
      this.audio.blip();
    }
    if (this.decoy) {
      this.decoy.life -= dt;
      this.decoy.life <= 0 && (this.decoy = null);
    }
    let firing = this.fireLatch || this.shotPulse || held.has("Space");
    this.shotPulse = false;
    if (firing && this.fireCd <= 0) {
      this.shootGround();
    }
    this.tickFish(dt, sneaking);
    this.tickBullets(dt);
    this.tickNodes();
    this.tickStructures(dt);
    if (this.phase === "stealth") {
      if (
        hyp(this.player.x - this.cache.x, this.player.y - this.cache.y) < 46
      ) {
        this.beginCutscene("arm");
      }
    } else if (this.phase === "rescue" && usePressed) {
      this.tryFree();
    } else if (
      this.phase === "base" &&
      usePressed &&
      this.launchReady() &&
      hyp(this.player.x - this.pad.x, this.player.y - this.pad.y) < 78
    ) {
      this.beginCutscene("launch");
    }
    if (this.alert > 0) {
      this.alert -= dt;
    }
  },
  hurtPlayer(this: Game, dmg) {
    if (this.invuln <= 0) {
      if (this.phase === "shooter" && this.shipKit.shield) {
        this.shipKit.shield = false;
        this.invuln = 0.4;
        this.audio.alarm();
      } else {
        this.player.hp -= dmg;
        this.invuln = 0.45;
        this.shake = 0.7;
        this.audio.hit();
      }
    }
  },
  blocked(this: Game, x, y, n) {
    for (let r of this.covers) {
      if (circleHitsRect(x, y, n, r)) {
        return true;
      }
    }
    for (let r of this.structures) {
      if (
        circleHitsRect(x, y, n, {
          x: r.x - 28,
          y: r.y - 28,
          w: 56,
          h: 56,
        })
      ) {
        return true;
      }
    }
    return false;
  },
};
