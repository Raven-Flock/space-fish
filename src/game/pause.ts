import type { Game } from "./Game";
import { PAUSE } from "../content/tuning/pause";

// F-02 touch pause (GD F02-TOUCH-PAUSE-v0.1, AAA v0.1 §1.5-1.6).
// One pause state for every way in: the Pause button, Esc/P, gamepad Start and
// auto-pause (tab hidden, window blur, pagehide). While paused the whole sim is
// frozen (Game.tick returns before anything moves), audio is held through F-07's
// AudioDirector API (suspend/resume/setMuted: master fades out, then the one
// AudioContext suspends, so music, VO and SFX all stop in place), and all held
// input is cleared. Nothing resumes except an explicit Resume, Esc/P or Start.
// Pausing never writes the save (AAA §4E).

const ACTIVE = ["play", "cutscene"];

export const pauseMethods = {
  /** true while paused: Game.tick returns before any sim work (fixed step, timers, particles). */
  pausedFreeze(this: Game) {
    return this.mode === "pause";
  },
  /** Enter pause from play or a cutscene. Returns true if it paused. */
  pauseGame(this: Game) {
    if (!ACTIVE.includes(this.mode)) {
      return false;
    }
    this.pauseFrom = this.mode;
    this.mode = "pause";
    this.onPause();
    this.push(0, true);
    return true;
  },
  /** Side effects of entering pause (any route, including the Esc path). */
  onPause(this: Game) {
    this.clearHeldInput();
    this.audio.suspend(PAUSE.audioFadeOutMs);
    return true;
  },
  /** Side effects of leaving pause back into play or the cutscene (called by resume()). */
  onResume(this: Game) {
    this.resumeLockUntil = performance.now() + PAUSE.resumeIgnoreMs;
    this.audio.resume(PAUSE.musicFadeInMs);
    return true;
  },
  /** Stick, Fire, Use, Noise, held keys, a pending tap-to-walk and the touch-aim point. */
  clearHeldInput(this: Game) {
    this.keys.clear();
    this.fireLatch = false;
    this.shotPulse = false;
    this.interactPulse = false;
    this.decoyPulse = false;
    this.stickX = 0;
    this.stickY = 0;
    this.tap = null;
    this.clearTouchAim();
  },
  /** For PAUSE.resumeIgnoreMs after a resume, fire/use/noise/canvas taps are dropped. */
  inputLocked(this: Game) {
    return this.mode === "play" && performance.now() < this.resumeLockUntil;
  },
  /** visibilitychange (to hidden), window blur and pagehide: pause, only in play or a cutscene. */
  autoPause(this: Game, ev) {
    if (ev?.type === "visibilitychange" && typeof document !== "undefined" && document.visibilityState !== "hidden") {
      return false; // coming back visible never resumes; the Paused panel stays up
    }
    return this.pauseGame();
  },
  bindPause(this: Game) {
    let onHide = (ev) => this.autoPause(ev);
    window.addEventListener("blur", onHide);
    window.addEventListener("pagehide", onHide);
    let doc = typeof document !== "undefined" ? document : null;
    doc?.addEventListener("visibilitychange", onHide);
    this.unbind.push(() => {
      window.removeEventListener("blur", onHide);
      window.removeEventListener("pagehide", onHide);
      doc?.removeEventListener("visibilitychange", onHide);
    });
  },
  /** Gamepad Start toggles pause (edge-triggered; polled once per animation frame). */
  pollPad(this: Game) {
    let nav: any = typeof navigator !== "undefined" ? navigator : null;
    let pads = nav?.getGamepads?.() ?? [];
    let down = false;
    for (let p of pads) {
      if (p?.buttons?.[PAUSE.padStartButton]?.pressed) {
        down = true;
      }
    }
    if (down && !this.padStart) {
      if (this.mode === "pause") {
        this.resume();
      } else if (this.mode === "play") {
        this.pauseGame();
      }
    }
    this.padStart = down;
    return true;
  },
  /** Panel "Menu" after its confirm: back to the title. Continue keeps the last marker (D-5). */
  quitToTitle(this: Game) {
    if (this.mode === "pause" && this.pauseFrom === "cutscene") {
      this.stopCine();
      this.cut = [];
    }
    this.pauseFrom = "play";
    this.audio.resume();
    this.backToMenu();
  },
};
