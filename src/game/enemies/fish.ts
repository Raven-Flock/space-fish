import type { Game } from "../Game";
import { FISH } from "../../content/tuning/fish";
import { hyp } from "../../engine/math";
import { segmentHitsRect } from "../../engine/collision";
import { random } from "../../engine/rng";
export const fishMethods = {
  makeFish(this: Game, x, y, wps) {
    return {
      x: x,
      y: y,
      hp: this.phase === "stealth" ? FISH.hpRim : FISH.hpCombat,
      facing: 0,
      wps: wps,
      wi: 0,
      aggro: false,
    };
  },
  tickFish(this: Game, dt, sneaking) {
    for (let n of this.fish) {
      if (n.hp > 0) {
        this.phase === "stealth"
          ? this.steerStealth(n, dt, sneaking)
          : this.steerCombat(n, dt);
        if (
          hyp(n.x - this.player.x, n.y - this.player.y) < FISH.contactRadius &&
          this.invuln <= 0
        ) {
          this.player.hp -= FISH.contactDamage;
          this.invuln = 0.65;
          this.shake = 0.8;
          this.audio.hit();
        }
      }
    }
    this.fish = this.fish.filter((e) => e.hp > 0);
    if (
      this.phase === "base" &&
      this.nest.hp > 0 &&
      ((this.nestTimer -= dt),
      this.nestTimer <= 0 && this.fish.length < FISH.nestCap)
    ) {
      this.nestTimer = FISH.nestEvery;
      let e = random() * Math.PI * 2;
      this.fish.push(
        this.makeFish(
          this.nest.x + Math.cos(e) * 70,
          this.nest.y + Math.sin(e) * 70,
          [],
        ),
      );
    }
  },
  steerStealth(this: Game, fish, dt, sneaking) {
    if (this.fishSees(fish, sneaking)) {
      this.alert = FISH.alertTime;
      this.lastSeen = {
        x: this.player.x,
        y: this.player.y,
      };
      this.alerted || this.audio.alarm();
      this.alerted = true;
    }
    let tx = fish.wps[fish.wi]?.x ?? fish.x;
    let ty = fish.wps[fish.wi]?.y ?? fish.y;
    let speed: number = FISH.patrolSpeed;
    if (this.alert > 0) {
      tx = this.lastSeen.x;
      ty = this.lastSeen.y;
      speed = FISH.chaseSpeed;
    } else if (
      this.decoy &&
      hyp(this.decoy.x - fish.x, this.decoy.y - fish.y) < FISH.decoyPullRange
    ) {
      tx = this.decoy.x;
      ty = this.decoy.y;
      speed = FISH.decoySpeed;
    }
    this.stepToward(fish, tx, ty, speed, dt);
    if (this.alert <= 0 && !this.decoy && hyp(tx - fish.x, ty - fish.y) < 10) {
      fish.wi = (fish.wi + 1) % Math.max(1, fish.wps.length);
    }
  },
  fishSees(this: Game, fish, sneaking) {
    let dx = this.player.x - fish.x;
    let dy = this.player.y - fish.y;
    if (hyp(dx, dy) > (sneaking ? FISH.sightRangeSneaking : FISH.sightRange)) {
      return false;
    }
    let da = Math.atan2(dy, dx) - fish.facing;
    while (da > Math.PI) {
      da -= Math.PI * 2;
    }
    while (da < -Math.PI) {
      da += Math.PI * 2;
    }
    if (Math.abs(da) > FISH.sightHalfAngle) {
      return false;
    }
    for (let t of this.covers) {
      if (segmentHitsRect(fish.x, fish.y, this.player.x, this.player.y, t)) {
        return false;
      }
    }
    return true;
  },
  steerCombat(this: Game, fish, dt) {
    let d = hyp(this.player.x - fish.x, this.player.y - fish.y);
    let clear = true;
    if (this.phase === "rescue") {
      for (let t of this.covers) {
        if (segmentHitsRect(fish.x, fish.y, this.player.x, this.player.y, t)) {
          clear = false;
        }
      }
    }
    if (d < FISH.aggroRange && clear) {
      fish.aggro = true;
    }
    if (fish.aggro && d > FISH.leashRange) {
      fish.aggro = false;
    }
    if (fish.aggro) {
      this.stepToward(
        fish,
        this.player.x,
        this.player.y,
        this.phase === "rescue" ? FISH.rescueSpeed : FISH.baseSpeed,
        dt,
      );
    }
  },
  stepToward(this: Game, fish, tx, ty, speed, dt) {
    let dx = tx - fish.x;
    let dy = ty - fish.y;
    let d = hyp(dx, dy) || 1;
    fish.x += (dx / d) * speed * dt;
    fish.y += (dy / d) * speed * dt;
    fish.facing = Math.atan2(dy, dx);
  },
};
