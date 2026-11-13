import type { Game } from "../Game";
import { hyp } from "../../engine/math";
import { EYE } from "../../content/boss";

// The Eye over Jupiter (R0: one phase, 700 HP, exactly as live 69cf5be).
export const eyeMethods = {
  /** Called when the "jupiter" cutscene ends. */
  spawnEye(this: Game) {
    this.bossOn = true;
    this.boss = {
      x: this.scroll + 960 - 180,
      y: 270,
      hp: EYE.hp,
      max: EYE.hp,
      t: 0,
      shot: EYE.firstShot,
    };
  },
  /** One fixed step of the Eye. Returns true when it broke and the victory cut began. */
  tickEye(this: Game, dt): boolean {
    const b = this.boss;
    b.t += dt;
    b.x = this.scroll + 960 - 210;
    b.y = 270 + Math.sin(b.t * 0.9) * 150;
    b.shot -= dt;
    if (b.shot <= 0) {
      const enraged = b.t > EYE.enrageAfter;
      b.shot = enraged ? EYE.shotEveryEnraged : EYE.shotEvery;
      const offsets = enraged ? EYE.spread : [0];
      for (const off of offsets) {
        const a = Math.atan2(this.player.y - b.y, this.player.x - b.x) + off;
        this.bullets.push({
          x: b.x - 40,
          y: b.y,
          vx: Math.cos(a) * EYE.bulletSpeed,
          vy: Math.sin(a) * EYE.bulletSpeed,
          r: 6,
          dmg: EYE.bulletDamage,
          friendly: false,
          life: 4,
        });
      }
    }
    if (hyp(b.x - this.player.x, b.y - this.player.y) < EYE.contactRadius) {
      this.hurtPlayer(EYE.contactDamage);
    }
    if (b.hp <= 0 && !this.winning) {
      this.winning = true;
      this.beginCutscene("victory");
      return true;
    }
    return false;
  },
};
