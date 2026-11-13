import type { Game } from "../game/Game";
import { hyp } from "./math";
export const inputMethods = {
  bindInputs(this: Game) {
    let e = (e) => {
      if (!e.repeat) {
        this.keys.add(e.code);
        ["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(
          e.code,
        ) && e.preventDefault();
        this.mode === "cutscene" &&
          (e.code === "Space" || e.code === "Enter") &&
          this.advanceBeat();
        e.code === "Escape" && this.mode === "play"
          ? ((this.mode = "pause"), this.push(0, true))
          : e.code === "Escape" && this.mode === "pause" && this.resume();
        this.mode === "play" &&
          this.phase === "base" &&
          (e.code === "Digit1" && this.selectBuild("gen"),
          e.code === "Digit2" && this.selectBuild("turret"),
          e.code === "Digit3" && this.selectBuild("lab"));
      }
    };
    let t = (e) => this.keys.delete(e.code);
    let n = () => this.keys.clear();
    window.addEventListener("keydown", e);
    window.addEventListener("keyup", t);
    window.addEventListener("blur", n);
    let r = this.canvas;
    let i = (e) => {
      let t = this.eventToWorld(e);
      if (t) {
        this.aimX = t.x;
        this.aimY = t.y;
        this.aimOk = t.inside;
      }
    };
    let a = (e) => {
      let n = e.pointerType === "touch" || e.pointerType === "pen";
      if (n) {
        e.preventDefault();
      }
      let t = this.eventToWorld(e);
      if (!t?.inside) {
        return;
      }
      if (n && this.mode === "play" && !(this.phase === "base" && this.build)) {
        this.tap = {
          x: t.x,
          y: t.y,
        };
        return;
      }
      if (this.mode === "play" && this.phase === "base" && this.build) {
        this.tryPlace(t.x, t.y);
      } else if (this.mode === "play") {
        this.shotPulse = true;
      }
    };
    r?.addEventListener("pointermove", i);
    r?.addEventListener("pointerdown", a, {
      passive: false,
    });
    let o = () => this.resize();
    window.addEventListener("resize", o);
    let s = new ResizeObserver(() => this.resize());
    if (r) {
      s.observe(r);
    }
    this.unbind.push(() => {
      window.removeEventListener("keydown", e);
      window.removeEventListener("keyup", t);
      window.removeEventListener("blur", n);
      r?.removeEventListener("pointermove", i);
      r?.removeEventListener("pointerdown", a);
      window.removeEventListener("resize", o);
      s.disconnect();
    });
  },
  setQaKeys(this: Game, keys) {
    this.qaKeys = new Set(keys);
  },
  held(this: Game) {
    return this.qaKeys ?? this.keys;
  },
  wish(this: Game) {
    let held = this.held();
    let x = 0;
    let y = 0;
    if (held.has("KeyA") || held.has("ArrowLeft")) {
      --x;
    }
    if (held.has("KeyD") || held.has("ArrowRight")) {
      x += 1;
    }
    if (held.has("KeyW") || held.has("ArrowUp")) {
      --y;
    }
    if (held.has("KeyS") || held.has("ArrowDown")) {
      y += 1;
    }
    if (x !== 0 || y !== 0) {
      this.tap = null;
    }
    if (this.qaKeys == null && (this.stickX !== 0 || this.stickY !== 0)) {
      this.tap = null;
      x = this.stickX;
      y = this.stickY;
    } else if (this.qaKeys == null && this.tap && x === 0 && y === 0) {
      let r = this.tap.x - this.player.x;
      let i = this.tap.y - this.player.y;
      let a = Math.hypot(r, i);
      if (a < 22) {
        this.tap = null;
      } else {
        x = r / a;
        y = i / a;
      }
    }
    let mag = Math.min(1, hyp(x, y));
    if (mag > 0.001) {
      x /= hyp(x, y);
      y /= hyp(x, y);
    }
    return {
      x: x,
      y: y,
      mag: mag,
    };
  },
  dirVector(this: Game) {
    switch (this.dir) {
      case 1: {
        return {
          x: -1,
          y: 0,
        };
      }
      case 2: {
        return {
          x: 1,
          y: 0,
        };
      }
      case 3: {
        return {
          x: 0,
          y: -1,
        };
      }
      default: {
        return {
          x: 0,
          y: 1,
        };
      }
    }
  },
  aimAngle(this: Game) {
    if (this.aimOk && this.qaKeys == null) {
      return Math.atan2(this.aimY - this.player.y, this.aimX - this.player.x);
    }
    let e = this.dirVector();
    return Math.atan2(e.y, e.x);
  },
  setStick(this: Game, x, y, touching) {
    this.stickX = x;
    this.stickY = y;
    if (touching || x !== 0 || y !== 0) {
      this.tap = null;
    }
  },
  setFire(this: Game, down) {
    this.fireLatch = down;
    if (down) {
      this.tap = null;
    }
  },
  toggleSneak(this: Game) {
    this.sneakLatch = !this.sneakLatch;
    this.tap = null;
  },
  pulseUse(this: Game) {
    this.interactPulse = true;
    this.tap = null;
  },
  pulseNoise(this: Game) {
    this.decoyPulse = true;
    this.tap = null;
  },
};
