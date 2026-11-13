import type { Game } from "../game/Game";
import { BUILD_COST } from "../content/tuning/build";
import { hyp } from "../engine/math";
export const padMethods = {
  selectBuild(this: Game, kind) {
    this.build = this.build === kind ? null : kind;
    this.push(0, true);
  },
  dropBuild(this: Game) {
    let e = this.dirVector();
    this.tryPlace(this.player.x + e.x * 78, this.player.y + e.y * 78);
  },
  tickNodes(this: Game) {
    if (this.phase === "base") {
      for (let e of this.nodes) {
        if (!e.taken) {
          if (hyp(e.x - this.player.x, e.y - this.player.y) < 28) {
            e.taken = true;
            this.scrap += e.amount;
            this.audio.pickup();
          }
        }
      }
    }
  },
  tickStructures(this: Game, dt) {
    if (this.structures.some((e) => e.kind === "gen")) {
      for (let t of this.structures) {
        if (t.kind !== "turret" || ((t.cool -= dt), t.cool > 0)) {
          continue;
        }
        let n = this.nearestHostile(t.x, t.y, 280);
        if (!n) {
          continue;
        }
        t.cool = 0.55;
        let r = Math.atan2(n.y - t.y, n.x - t.x);
        this.bullets.push({
          x: t.x,
          y: t.y,
          vx: Math.cos(r) * 460,
          vy: Math.sin(r) * 460,
          r: 4,
          dmg: 11,
          friendly: true,
          life: 1.1,
        });
      }
    }
  },
  nearestHostile(this: Game, x, y, range) {
    let best = null;
    let bestD = range;
    for (let n of this.fish) {
      let a = hyp(n.x - x, n.y - y);
      if (a < bestD) {
        bestD = a;
        best = n;
      }
    }
    if (
      !best &&
      this.nest.hp > 0 &&
      hyp(this.nest.x - x, this.nest.y - y) < range
    ) {
      best = this.nest;
    }
    return best;
  },
  tryPlace(this: Game, x, y) {
    if (this.mode !== "play" || this.phase !== "base" || !this.build) {
      return;
    }
    let cost = BUILD_COST[this.build];
    if (
      this.scrap < cost ||
      x < 50 ||
      y < 50 ||
      x > this.world.w - 50 ||
      y > this.world.h - 50 ||
      hyp(x - this.nest.x, y - this.nest.y) < 120
    ) {
      return;
    }
    for (let n of this.structures) {
      if (hyp(n.x - x, n.y - y) < 78) {
        return;
      }
    }
    this.scrap -= cost;
    this.structures.push({
      kind: this.build,
      x: x,
      y: y,
      cool: 0,
    });
    this.audio.pickup();
    let first = !this.sawFirstBuild;
    this.sawFirstBuild = true;
    if (first) {
      this.beginCutscene("firstbuild");
    }
  },
  launchReady(this: Game) {
    let gens = this.structures.filter((e) => e.kind === "gen").length;
    let turrets = this.structures.filter((e) => e.kind === "turret").length;
    let labs = this.structures.filter((e) => e.kind === "lab").length;
    return gens >= 1 && turrets >= 2 && labs >= 1 && this.nest.hp <= 0;
  },
};
