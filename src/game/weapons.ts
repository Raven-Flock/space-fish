import type { Game } from "./Game";
import { hyp } from "../engine/math";
import { AIM } from "../content/tuning/aim";
export const weaponsMethods = {
  shootGround(this: Game) {
    if (this.weapon !== "laser") {
      // D-11 (GD ruling 4): Rim Fire/Dig follows the Use rule -- it swings the
      // shovel unless a dig spot is within 40 px, where it digs as before.
      if (this.shovelFire()) {
        return;
      }
      this.shovelT = 0.34;
      this.fireCd = 0.42;
      return;
    }
    let angle = this.aimAngle();
    let e = this.laserTarget(angle);
    if (e) {
      angle = Math.atan2(e.y - this.player.y, e.x - this.player.x);
    }
    this.fireCd = 0.2;
    this.bullets.push({
      x: this.player.x + Math.cos(angle) * 20,
      y: this.player.y + Math.sin(angle) * 20,
      vx: Math.cos(angle) * 640,
      vy: Math.sin(angle) * 640,
      r: 5,
      dmg: 18,
      friendly: true,
      life: 1.1,
    });
    this.audio.shoot(true);
  },
  /** QA N-8: true when the shot aims along the 4-way facing (no mouse or touch aim point). */
  facingAimLock(this: Game) {
    return !this.aimFromPointer();
  },
  laserTarget(this: Game, aim) {
    let facing = typeof aim === "number" ? aim : this.aimAngle();
    let best = this.lockTarget(facing, AIM.lockHalfAngle);
    // QA N-8 (GD, Nov 18): with no aim point (keyboard only, phone Fire with no tap-aim)
    // the in-cone target above wins; only if there is none, fall back to the nearest
    // target in any direction. A mouse or touch aim keeps the ±0.55 cone only.
    if (!best && this.facingAimLock()) {
      best = this.lockTarget(facing, AIM.facingFallbackHalfAngle);
    }
    return best;
  },
  /** Nearest fish within AIM.lockRange and ±half of `facing`; else the Pad nest (live rule). */
  lockTarget(this: Game, facing, half) {
    let best = null;
    let bestD: number = AIM.lockRange;
    for (let n of this.fish) {
      let dx = n.x - this.player.x;
      let dy = n.y - this.player.y;
      let r = hyp(dx, dy);
      if (r >= bestD) continue;
      let bear = Math.atan2(dy, dx);
      let delta = Math.atan2(Math.sin(bear - facing), Math.cos(bear - facing));
      if (Math.abs(delta) > half) continue;
      bestD = r;
      best = n;
    }
    if (!best && this.phase === "base" && this.nest.hp > 0) {
      let dx = this.nest.x - this.player.x;
      let dy = this.nest.y - this.player.y;
      let r = hyp(dx, dy);
      if (r < AIM.nestLockRange) {
        let bear = Math.atan2(dy, dx);
        let delta = Math.atan2(Math.sin(bear - facing), Math.cos(bear - facing));
        if (Math.abs(delta) <= half) best = this.nest;
      }
    }
    return best;
  },
};