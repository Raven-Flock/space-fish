import type { Game } from "../game/Game";
import { hyp } from "../engine/math";
import { TRANSIT, TRANSIT_KITS } from "../content/arcade/transit";

// Ch4 Transit: scroll east, spawn fish on a cadence, Jupiter cut at a distance,
// then the Eye. Live 69cf5be ends Transit by distance (scroll), not by a clock on
// the player; the count-based wave director (AAA §4C) lands here in Phase 4.
export const transitMethods = {
  scheduleKits(this: Game) {
    this.pickups = TRANSIT_KITS.map((k) => ({
      ...k,
    }));
  },
  /** One fixed step of Transit. `wish` is the input vector, `speed` the ship speed. */
  tickShooter(this: Game, dt, wish, speed) {
    if (!this.bossOn && !this.jupiterPlayed) {
      this.scroll += TRANSIT.scrollSpeed * dt;
    }
    this.moveShip(dt, wish, speed);
    this.fireShipGuns(dt);
    if (
      !this.bossOn &&
      this.scroll > TRANSIT.jupiterAt &&
      !this.jupiterPlayed
    ) {
      this.jupiterPlayed = true;
      this.beginCutscene("jupiter");
      return;
    }
    if (!this.bossOn) {
      this.tickTransitSpawns(dt);
    } else if (this.tickEye(dt)) {
      return; // the Eye broke: victory cut started this step
    }
    this.driftTransitFish(dt);
    this.collectKits();
    this.world.w = this.scroll + 960 + 200;
    this.tickBullets(dt);
  },
  tickTransitSpawns(this: Game, dt) {
    this.spawnAcc += dt;
    if (this.spawnAcc > TRANSIT.spawnEvery) {
      this.spawnAcc = 0;
      this.spawnN += 1;
      this.fish.push({
        x: this.scroll + 960 + 40,
        y: 70 + ((this.spawnN * 97) % 400),
        hp: TRANSIT.spawnHp,
        facing: Math.PI,
        wps: [],
        wi: 0,
        aggro: true,
      });
    }
  },
  driftTransitFish(this: Game, dt) {
    for (const f of this.fish) {
      f.x -= TRANSIT.fishSpeed * dt;
      f.y += Math.sin(this.time * 3 + f.x * 0.01) * 20 * dt;
      f.facing = Math.PI;
      if (hyp(f.x - this.player.x, f.y - this.player.y) < 28) {
        f.hp = 0;
        this.hurtPlayer(TRANSIT.contactDamage);
      }
    }
    this.fish = this.fish.filter((f) => f.hp > 0 && f.x > this.scroll - 80);
  },
  collectKits(this: Game) {
    for (const k of this.pickups) {
      if (hyp(k.x - this.player.x, k.y - this.player.y) < 30) {
        if (k.kind === "speed") this.shipKit.speed = true;
        if (k.kind === "spread") this.shipKit.spread = true;
        if (k.kind === "drone") this.shipKit.drone = true;
        if (k.kind === "shield") this.shipKit.shield = true;
        k.x = -9999;
        this.audio.pickup();
      }
    }
    this.pickups = this.pickups.filter((k) => k.x > 0);
  },
};
