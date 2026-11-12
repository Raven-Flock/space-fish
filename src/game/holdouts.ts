import type { Game } from "./Game";
import { hyp } from "../engine/math";
export const holdoutsMethods = {
  tryFree(this: Game) {
    for (let e of this.holdouts) {
      if (!e.freed && !(hyp(e.x - this.player.x, e.y - this.player.y) > 64)) {
        if (this.fish.some((t) => hyp(t.x - e.x, t.y - e.y) < 110)) {
          return;
        }
        e.freed = true;
        this.freedCount += 1;
        this.audio.pickup();
        if (this.freedCount >= 3) {
          this.beginCutscene("toBase");
        } else {
          this.beginCutscene("freed");
        }
        return;
      }
    }
  },
};
