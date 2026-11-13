import type { Game } from "../game/Game";
import { SAVE_KEY } from "./keys";
export const saveMethods = {
  readSave(this: Game) {
    try {
      let e = localStorage.getItem(SAVE_KEY);
      if (!e) {
        return null;
      }
      let t = JSON.parse(e).phase;
      if (
        t === "stealth" ||
        t === "rescue" ||
        t === "base" ||
        t === "shooter"
      ) {
        return t;
      }
    } catch {}
    return null;
  },
  writeSave(this: Game, phase) {
    try {
      localStorage.setItem(
        SAVE_KEY,
        JSON.stringify({
          version: 1,
          phase: phase,
        }),
      );
    } catch {}
  },
};
