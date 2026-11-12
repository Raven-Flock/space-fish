import type { Game } from "./Game";
import { clamp, hyp } from "../engine/math";
import { SHIP } from "../content/tuning/player";

// The player's ship in Transit: movement inside the scrolling window, guns, drone.
export const shipMethods = {
  moveShip(this: Game, dt, wish, speed) {
    const x0 = this.player.x;
    const y0 = this.player.y;
    this.player.x = clamp(
      this.player.x + wish.x * speed * wish.mag * dt,
      this.scroll + 36,
      this.scroll + 400,
    );
    this.player.y = clamp(
      this.player.y + wish.y * speed * wish.mag * dt,
      36,
      504,
    );
    this.vx = (this.player.x - x0) / dt;
    this.vy = (this.player.y - y0) / dt;
    this.speed = hyp(this.vx, this.vy);
    if (wish.mag > 0.1) {
      this.lastYaw = Math.atan2(-wish.x, -wish.y);
    }
    this.dir = 2;
  },
  fireShipGuns(this: Game, dt) {
    const held = this.held();
    if (
      (this.fireLatch || this.shotPulse || held.has("Space")) &&
      this.fireCd <= 0
    ) {
      this.fireCd = SHIP.fireEvery;
      const angles = this.shipKit.spread ? SHIP.spread : [0];
      for (const a of angles) {
        this.bullets.push({
          x: this.player.x + 28,
          y: this.player.y,
          vx: Math.cos(a) * SHIP.bulletSpeed,
          vy: Math.sin(a) * SHIP.bulletSpeed,
          r: 4,
          dmg: SHIP.bulletDamage,
          friendly: true,
          life: 1.3,
        });
      }
      this.audio.shoot(true);
    }
    this.shotPulse = false;
    if (this.shipKit.drone) {
      this.droneCd -= dt;
      if (this.droneCd <= 0) {
        this.droneCd = SHIP.droneEvery;
        this.bullets.push({
          x: this.player.x + 10,
          y: this.player.y + Math.sin(this.time * 6) * 26,
          vx: 500,
          vy: 0,
          r: 3,
          dmg: SHIP.droneDamage,
          friendly: true,
          life: 1.2,
        });
      }
    }
  },
};
