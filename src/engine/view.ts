import type { Game } from "../game/Game";
import { clamp } from "./math";
export const viewMethods = {
  resize(this: Game) {
    let canvas = this.canvas;
    if (!canvas) {
      return;
    }
    let w = canvas.clientWidth;
    let h = canvas.clientHeight;
    if (w < 2 || h < 2) {
      let t = canvas.getBoundingClientRect();
      w = t.width;
      h = t.height;
    }
    if (w < 2 || h < 2) {
      return;
    }
    let dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.max(1, Math.floor(w * dpr));
    canvas.height = Math.max(1, Math.floor(h * dpr));
    let scale = Math.min(w / 960, h / 540);
    this.view = {
      dpr: dpr,
      scale: scale,
      ox: (w - 960 * scale) / 2,
      oy: (h - 540 * scale) / 2,
    };
  },
  updateCam(this: Game) {
    this.camX = clamp(this.player.x - 480, 0, Math.max(0, this.world.w - 960));
    this.camY = clamp(this.player.y - 270, 0, Math.max(0, this.world.h - 540));
  },
  eventToWorld(this: Game, ev) {
    let canvas = this.canvas;
    if (!canvas) {
      return null;
    }
    let rect = canvas.getBoundingClientRect();
    let w = canvas.clientWidth;
    let h = canvas.clientHeight;
    let x;
    let y;
    if (Math.abs(rect.width - w) > 4 || Math.abs(rect.height - h) > 4) {
      x = ev.clientY - rect.top;
      y = rect.right - ev.clientX;
    } else {
      x = ev.clientX - rect.left;
      y = ev.clientY - rect.top;
    }
    let vx = (x - this.view.ox) / this.view.scale;
    let vy = (y - this.view.oy) / this.view.scale;
    return {
      x: vx + this.camX,
      y: vy + this.camY,
      inside: vx >= 0 && vy >= 0 && vx <= 960 && vy <= 540,
    };
  },
};
