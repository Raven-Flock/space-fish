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
    // F-04 extend-width stage: the bleed either side of the 960 column shows world too,
    // so keep the whole visible stage inside the world (b = 0 is the old clamp).
    let b = bleedOf(this.view);
    this.camX = clamp(this.player.x - 480, b, Math.max(b, this.world.w - 960 - b));
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
      inside: vx >= -bleedOf(this.view) && vy >= 0 && vx <= 960 + bleedOf(this.view) && vy <= 540,
    };
  },
};

/**
 * F-04 extend-width stage (VP-10): logical width is 540 * vw / vh. resize() already puts
 * the 960 column at ox; when the stage is wider than 16:9 (oy = 0), ox / scale logical
 * px either side are bleed that backgrounds paint and the controls sit in. Narrower
 * than 16:9 keeps the old fit (bleed 0). At 960x540 (all parity sims) this is 0.
 */
export function bleedOf(view) {
  return view && view.oy < 0.5 && view.ox > 0 && view.scale > 0 ? view.ox / view.scale : 0;
}
