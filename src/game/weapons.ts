import type { Game } from "./Game";
import { hyp } from "../engine/math";
export const weaponsMethods = {
  shootGround(this: Game) {
    if (this.weapon !== "laser") {
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
  laserTarget(this: Game, aim) {
    let best = null;
    let bestD = 280;
    let facing = typeof aim === "number" ? aim : this.aimAngle();
    for (let n of this.fish) {
      let dx = n.x - this.player.x;
      let dy = n.y - this.player.y;
      let r = hyp(dx, dy);
      if (r >= bestD) continue;
      let bear = Math.atan2(dy, dx);
      let delta = Math.atan2(Math.sin(bear - facing), Math.cos(bear - facing));
      if (Math.abs(delta) > 0.55) continue;
      bestD = r;
      best = n;
    }
    if (!best && this.phase === "base" && this.nest.hp > 0) {
      let dx = this.nest.x - this.player.x;
      let dy = this.nest.y - this.player.y;
      let r = hyp(dx, dy);
      if (r < 340) {
        let bear = Math.atan2(dy, dx);
        let delta = Math.atan2(Math.sin(bear - facing), Math.cos(bear - facing));
        if (Math.abs(delta) <= 0.55) best = this.nest;
      }
    }
    return best;
  },
};