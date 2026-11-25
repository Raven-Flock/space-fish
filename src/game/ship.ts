import type { Game } from "./Game";
import { clamp, hyp } from "../engine/math";
import { SHIP } from "../content/tuning/player";
import { HUD } from "../content/tuning/hud";

// F-04: the phone stick's guard line (ship-centre x relative to the scroll) that the
// React shell sets in Transit; 0 = no touch stick (desktop, parity sims) = live clamp.
declare module "./Game" {
  interface Game {
    stickGuardX?: number;
  }
}

// The player's ship in Transit: movement inside the scrolling window, guns, drone.
export const shipMethods = {
  moveShip(this: Game, dt, wish, speed) {
    const x0 = this.player.x;
    const y0 = this.player.y;
    // F-04 (VP-01): with the touch stick up, the ship's left edge stays >= stick zone + 24 px
    const minX = Math.min(HUD.shipMaxX, Math.max(HUD.shipMinX, this.stickGuardX || 0));
    this.player.x = clamp(
      this.player.x + wish.x * speed * wish.mag * dt,
      this.scroll + minX,
      this.scroll + HUD.shipMaxX,
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
  /** F-04: set by the React shell from the stick zone (hudLayout.shipGuardX); 0 clears it. */
  setStickGuard(this: Game, x) {
    this.stickGuardX = x > 0 ? x : 0;
    if (this.mode === "play" && this.phase === "shooter" && this.stickGuardX > 0) {
      this.player.x = Math.max(this.player.x, this.scroll + Math.min(HUD.shipMaxX, this.stickGuardX));
    }
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
