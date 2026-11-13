import type { Game } from "./Game";
import { random } from "../engine/rng";
export const particlesMethods = {
  burst(this: Game, x, y, color) {
    for (let r = 0; r < 6; r++) {
      let r = random() * Math.PI * 2;
      let i = 40 + random() * 80;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(r) * i,
        vy: Math.sin(r) * i,
        life: 0.35,
        max: 0.35,
        color: color,
        s: 2 + random() * 2,
      });
    }
    if (this.particles.length > 120) {
      this.particles.splice(0, this.particles.length - 120);
    }
  },
  stepParticles(this: Game, dt) {
    for (let t of this.particles) {
      t.x += t.vx * dt;
      t.y += t.vy * dt;
      t.life -= dt;
    }
    this.particles = this.particles.filter((e) => e.life > 0);
  },
};
