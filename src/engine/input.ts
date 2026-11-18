import type { Game } from "../game/Game";
import { hyp } from "./math";
// F-02: keys that act (fire, use, throw, step a scene); ignored for 150 ms after a resume
const ACTION_KEYS = ["Space", "Enter", "KeyE", "KeyQ"];
export const inputMethods = {
  bindInputs(this: Game) {
    let e = (e) => {
      if (!e.repeat) {
        if (this.inputLocked() && ACTION_KEYS.includes(e.code)) {
          return; // F-02: just resumed; this press can't fire, swing, use or throw
        }
        this.keys.add(e.code);
        ["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(
          e.code,
        ) && e.preventDefault();
        this.mode === "cutscene" &&
          (e.code === "Space" || e.code === "Enter") &&
          this.advanceBeat();
        let pauseKey = e.code === "Escape" || e.code === "KeyP";
        pauseKey && this.mode === "play"
          ? ((this.mode = "pause"), (this.pauseFrom = "play"), this.onPause(), this.push(0, true))
          : pauseKey && this.mode === "pause" && this.resume();
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
      if (e.pointerType === "touch") {
        return;
      }
      this.aimClientX = e.clientX;
      this.aimClientY = e.clientY;
      this.aimPointer = "mouse";
      this.aimOk = true;
    };
    let a = (e) => {
      let n = e.pointerType === "touch" || e.pointerType === "pen";
      if (n) {
        e.preventDefault();
      }
      if (this.inputLocked()) {
        return; // F-02: no shot, tap-to-walk or repair from the tap that resumed
      }
      let t = this.eventToWorld(e);
      if (!t?.inside) {
        return;
      }
      if (
        this.mode === "play" &&
        this.phase === "base" &&
        this.nearestWreck(t.x, t.y, 72) &&
        !this.clickRepairRefused(t.x, t.y)
      ) {
        this.tryPlace(t.x, t.y);
        return;
      }
      if (n && this.fireLatch && this.mode === "play" && this.weapon === "laser") {
        this.aimX = t.x;
        this.aimY = t.y;
        this.aimPointer = "touch";
        this.aimOk = true;
        this.shotPulse = true;
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
      } else if (this.mode === "play" && this.weapon === "laser") {
        if (!n) {
          this.aimClientX = e.clientX;
          this.aimClientY = e.clientY;
          this.aimPointer = "mouse";
          this.aimOk = true;
        }
        this.shotPulse = true;
      } else if (this.mode === "play" && this.weapon !== "laser") {
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
    if (this.qaKeys == null && this.aimOk && this.aimPointer !== "touch") {
      let w = this.eventToWorld({
        clientX: this.aimClientX,
        clientY: this.aimClientY,
      });
      if (w) {
        let dx = w.x - this.player.x;
        let dy = w.y - this.player.y;
        if (dx * dx + dy * dy > 36) {
          return Math.atan2(dy, dx);
        }
      }
    }
    if (this.qaKeys == null && this.aimOk && this.aimPointer === "touch") {
      let dx = this.aimX - this.player.x;
      let dy = this.aimY - this.player.y;
      if (dx * dx + dy * dy > 36) {
        return Math.atan2(dy, dx);
      }
    }
    let e = this.dirVector();
    return Math.atan2(e.y, e.x);
  },
  /** True when aimAngle() comes from a mouse or touch aim point (same tests as aimAngle). */
  aimFromPointer(this: Game) {
    if (this.qaKeys != null || !this.aimOk) {
      return false;
    }
    let p =
      this.aimPointer === "touch"
        ? { x: this.aimX, y: this.aimY }
        : this.eventToWorld({ clientX: this.aimClientX, clientY: this.aimClientY });
    if (!p) {
      return false;
    }
    let dx = p.x - this.player.x;
    let dy = p.y - this.player.y;
    return dx * dx + dy * dy > 36;
  },
  // A touch aim is a world point picked while Fire is held. It is only valid
  // until Fire is released, the stick moves, or a chapter (re)starts; after that
  // the aim falls back to facing. (QA N-1: it used to persist forever.)
  clearTouchAim(this: Game) {
    if (this.aimPointer === "touch") {
      this.aimOk = false;
    }
  },
  setStick(this: Game, x, y, touching) {
    this.stickX = x;
    this.stickY = y;
    if (touching || x !== 0 || y !== 0) {
      this.tap = null;
    }
    if (x !== 0 || y !== 0) {
      this.clearTouchAim();
    }
  },
  setFire(this: Game, down) {
    if (down && this.inputLocked()) {
      return;
    }
    this.fireLatch = down;
    if (down) {
      this.tap = null;
    } else {
      this.clearTouchAim();
    }
  },
  toggleSneak(this: Game) {
    this.sneakLatch = !this.sneakLatch;
    this.tap = null;
  },
  pulseUse(this: Game) {
    if (this.inputLocked()) {
      return;
    }
    this.interactPulse = true;
    this.tap = null;
  },
  pulseNoise(this: Game) {
    if (this.inputLocked()) {
      return;
    }
    this.decoyPulse = true;
    this.tap = null;
  },
};
