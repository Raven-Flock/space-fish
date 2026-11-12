import type { Game } from "./Game";
import { hyp } from "../engine/math";
export const weaponsMethods = {
  shootGround(this: Game) {
    let laser = this.weapon === "laser";
    let angle = this.aimAngle();
    if (laser) {
      let e = this.laserTarget();
      if (e) {
        angle = Math.atan2(e.y - this.player.y, e.x - this.player.x);
      }
    }
    this.fireCd = laser ? 0.2 : 0.42;
    this.bullets.push({
      x: this.player.x + Math.cos(angle) * 20,
      y: this.player.y + Math.sin(angle) * 20,
      vx: Math.cos(angle) * (laser ? 640 : 420),
      vy: Math.sin(angle) * (laser ? 640 : 420),
      r: laser ? 5 : 4,
      dmg: laser ? 18 : 12,
      friendly: true,
      life: 1.1,
    });
    this.audio.shoot(laser);
    if (!laser && this.phase === "stealth") {
      this.alert = 3.4;
      this.lastSeen = {
        x: this.player.x,
        y: this.player.y,
      };
      this.alerted || this.audio.alarm();
      this.alerted = true;
    }
  },
  laserTarget(this: Game) {
    let best = null;
    let bestD = 280;
    for (let n of this.fish) {
      let r = hyp(n.x - this.player.x, n.y - this.player.y);
      if (r < bestD) {
        bestD = r;
        best = n;
      }
    }
    if (
      !best &&
      this.phase === "base" &&
      this.nest.hp > 0 &&
      hyp(this.nest.x - this.player.x, this.nest.y - this.player.y) < 340
    ) {
      best = this.nest;
    }
    return best;
  },
};
