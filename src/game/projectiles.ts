import type { Game } from "./Game";
import { hyp } from "../engine/math";
export const projectilesMethods = {
  tickBullets(this: Game, dt) {
    for (let t of this.bullets) {
      t.x += t.vx * dt;
      t.y += t.vy * dt;
      t.life -= dt;
      if (!t.friendly) {
        if (hyp(t.x - this.player.x, t.y - this.player.y) < 16 + t.r) {
          this.hurtPlayer(t.dmg);
        }
      } else {
        for (let e of this.fish) {
          if (e.hp > 0 && hyp(t.x - e.x, t.y - e.y) < 18) {
            e.hp -= t.dmg;
            t.life = 0;
            this.burst(t.x, t.y, "#7a4ad4");
            e.hp <= 0 && this.audio.hit();
          }
        }
        if (
          this.phase === "base" &&
          this.nest.hp > 0 &&
          hyp(t.x - this.nest.x, t.y - this.nest.y) < this.nest.r
        ) {
          this.nest.hp -= t.dmg;
          t.life = 0;
          this.burst(t.x, t.y, "#3ec7c2");
          this.nest.hp <= 0 && this.audio.pickup();
        }
        if (this.bossOn && hyp(t.x - this.boss.x, t.y - this.boss.y) < 120) {
          this.boss.hp -= t.dmg;
          t.life = 0;
          this.burst(t.x, t.y, "#3ec7c2");
        }
      }
    }
    this.bullets = this.bullets.filter(
      (e) =>
        e.life > 0 &&
        e.x > -80 &&
        e.y > -80 &&
        e.x < this.world.w + 80 &&
        e.y < this.world.h + 200,
    );
  },
};
