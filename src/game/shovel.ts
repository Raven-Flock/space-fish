import type { Game } from "./Game";
import { SHOVEL } from "../content/tuning/shovel";
import { FISH } from "../content/tuning/fish";
import { clamp, hyp } from "../engine/math";

// D-11 shovel melee on Use (ADDENDUM §U.9). On foot only: Rim, Holdouts, Pad.
const ON_FOOT = ["stealth", "rescue", "base"];
const HALF_ARC = (SHOVEL.arcDeg * Math.PI) / 360;

export const shovelMethods = {
  /** Anything Use (or the Rim cache trigger) would act on, within `range` px of the player. */
  useInteractableNear(this: Game, range) {
    let near = (x, y) => hyp(x - this.player.x, y - this.player.y) <= range;
    if (this.phase === "stealth") return near(this.cache.x, this.cache.y);
    if (this.phase === "rescue") return this.holdouts.some((h) => !h.freed && near(h.x, h.y));
    if (this.phase === "base") {
      if (this.launchReady() && near(this.pad.x, this.pad.y)) return true;
      return this.structures.some((s) => !s.repaired && near(s.x, s.y));
    }
    return false;
  },
  /** Called when Use did nothing else. Returns true if a swing started. */
  tryShovel(this: Game) {
    if (this.mode !== "play" || !ON_FOOT.includes(this.phase)) return false;
    if (this.swingCd > 0 || this.swing) return false;
    if (this.useInteractableNear(SHOVEL.interactGate)) return false;
    let f = this.dirVector();
    this.swing = { t: 0, ang: Math.atan2(f.y, f.x), hits: [], landed: false };
    this.swingCd = SHOVEL.cooldown;
    this.shovelT = SHOVEL.poseTime;
    this.audio.swing();
    return true;
  },
  /**
   * Rim Fire/Dig (the phone touch path), GD ruling 4: same rule as Use. Returns
   * false when a dig spot is within 40 px, so the caller digs as before. Live has
   * no separate dig spots, so a dig spot is anything Use would act on there
   * (on the Rim: the weapons cache). Otherwise it swings, or waits out the
   * cooldown, and returns true.
   */
  shovelFire(this: Game) {
    if (this.useInteractableNear(SHOVEL.interactGate)) return false;
    this.tryShovel();
    return true;
  },
  /** Advance the swing, the hit window, and fish stagger / search timers. */
  tickShovel(this: Game, dt) {
    this.swingCd = Math.max(0, this.swingCd - dt);
    for (let n of this.fish) {
      // F-01 search (GD ruling): timers count down in sim time
      if (n.searchLock > 0) n.searchLock = Math.max(0, n.searchLock - dt);
      if (n.search > 0) n.search = n.search - dt > 1e-9 ? n.search - dt : 0;
      if (n.stagger > 0) {
        n.stagger = n.stagger - dt > 1e-9 ? n.stagger - dt : 0;
        if (n.stagger === 0) {
          n.staggerImmune = SHOVEL.staggerImmune;
          // the hit broke the chase: search starts when the stagger ends
          if (n.searchPending) {
            n.searchPending = false;
            n.search = FISH.searchTime;
            n.searchLock = FISH.searchLockout;
          }
        }
      } else if (n.staggerImmune > 0) {
        n.staggerImmune = Math.max(0, n.staggerImmune - dt);
      }
    }
    let s = this.swing;
    if (!s) return;
    s.t += dt;
    if (s.t > SHOVEL.windup + SHOVEL.active + 1e-9) {
      this.swing = null;
      return;
    }
    if (s.t + 1e-9 < SHOVEL.windup) return;
    let inArc = (x, y, pad) => {
      let dx = x - this.player.x;
      let dy = y - this.player.y;
      if (hyp(dx, dy) - pad > SHOVEL.reach) return false;
      let bear = Math.atan2(dy, dx);
      return Math.abs(Math.atan2(Math.sin(bear - s.ang), Math.cos(bear - s.ang))) <= HALF_ARC + 1e-9;
    };
    let hitAny = false;
    for (let n of this.fish) {
      if (n.hp <= 0 || s.hits.includes(n) || !inArc(n.x, n.y, 0)) continue;
      s.hits.push(n);
      hitAny = true;
      n.hp -= SHOVEL.damage;
      let dx = n.x - this.player.x;
      let dy = n.y - this.player.y;
      let d = hyp(dx, dy);
      let ux = d > 0.001 ? dx / d : Math.cos(s.ang);
      let uy = d > 0.001 ? dy / d : Math.sin(s.ang);
      n.x = clamp(n.x + ux * SHOVEL.knockback, 0, this.world.w);
      n.y = clamp(n.y + uy * SHOVEL.knockback, 0, this.world.h);
      if (!(n.stagger > 0) && !(n.staggerImmune > 0)) {
        n.stagger = SHOVEL.stagger;
        // F-01 (Rim only): this stagger leads into search, unless the fish entered
        // search less than FISH.searchLockout s ago (anti-lock) or is searching now.
        // Damage, knockback and the stagger above apply either way.
        if (this.phase === "stealth" && !(n.searchLock > 0) && !(n.search > 0)) n.searchPending = true;
      }
      this.burst(n.x, n.y, SHOVEL.trailColor);
      n.hp <= 0 && this.audio.hit();
    }
    // The Pad nest is the grounded hive of the reclaim kernel: hit, no knockback or stagger.
    if (
      this.phase === "base" &&
      this.nest.hp > 0 &&
      !s.hits.includes(this.nest) &&
      inArc(this.nest.x, this.nest.y, this.nest.r)
    ) {
      s.hits.push(this.nest);
      hitAny = true;
      this.nest.hp -= SHOVEL.damage;
      this.burst(this.nest.x, this.nest.y, SHOVEL.trailColor);
      this.nest.hp <= 0 && this.audio.pickup();
    }
    if (hitAny && !s.landed) {
      s.landed = true;
      this.audio.tonk();
      if (!this.reduce) this.hitStop = SHOVEL.hitStop;
      if (this.phase === "stealth") this.shovelNoise(this.player.x, this.player.y);
    }
  },
  /**
   * Rim noise ping from a landed hit. Live has no suspicion meter and footsteps make
   * no noise, so the nearest equivalent is used: every fish within the radius turns
   * to face the ping. Its normal sight check (range, cone, cover, sneak) then decides
   * whether you are spotted, exactly as for any other fish. A hit never clears a spot.
   */
  shovelNoise(this: Game, x, y) {
    for (let n of this.fish) {
      if (n.hp > 0 && hyp(n.x - x, n.y - y) <= SHOVEL.noiseRadius) {
        n.facing = Math.atan2(y - n.y, x - n.x);
      }
    }
  },
};
