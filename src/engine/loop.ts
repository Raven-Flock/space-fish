import type { Game } from "../game/Game";
export const loopMethods = {
  startLoop(this: Game) {
    this.stopped = false;
    this.last = performance.now();
    let e = (t) => {
      if (this.stopped) {
        return;
      }
      let n = Math.min(0.05, (t - this.last) / 1000);
      this.last = t;
      for (this.acc += n; this.acc >= 1 / 60;) {
        this.tick(1 / 60);
        this.acc -= 1 / 60;
      }
      this.draw();
      this.raf = requestAnimationFrame(e);
    };
    this.raf = requestAnimationFrame(e);
  },
};
