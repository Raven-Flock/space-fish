import type { Game } from "../game/Game";
import { CUTSCENES } from "../content/cutscenes";
export const cutsceneMethods = {
  beginCutscene(this: Game, id) {
    this.cutId = id;
    this.cut = CUTSCENES[id] ?? [];
    this.beat = 0;
    this.beatT = 0;
    this.mode = "cutscene";
    this.push(0, true);
    if (id === "intro") {
      this.playCine();
    }
  },
  finishCut(this: Game) {
    this.stopCine();
    let id = this.cutId;
    this.cut = [];
    switch (id) {
      case "intro": {
        this.startPhase("stealth");
        break;
      }
      case "arm": {
        this.startPhase("rescue");
        break;
      }
      case "toBase": {
        this.startPhase("base");
        break;
      }
      case "launch": {
        this.startPhase("shooter");
        break;
      }
      case "jupiter": {
        this.mode = "play";
        this.spawnEye();
        this.audio.setMood("swarm");
        this.push(0, true);
        break;
      }
      case "victory": {
        this.mode = "victory";
        this.audio.setMood("ending");
        this.push(0, true);
        break;
      }
      default: {
        this.mode = "play";
        this.push(0, true);
        break;
      }
    }
  },
  skipCutscene(this: Game) {
    if (this.mode === "cutscene") {
      this.finishCut();
    }
  },
  advanceBeat(this: Game) {
    if (this.mode === "cutscene") {
      this.beat += 1;
      this.beatT = 0;
      this.beat >= this.cut.length
        ? this.finishCut()
        : (this.playCine(), this.push(0, true));
    }
  },
};
