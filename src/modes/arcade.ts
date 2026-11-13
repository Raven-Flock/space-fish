import type { Game } from "../game/Game";
import {
  CHAPTERS,
  CHAPTER_MOOD,
  type ChapterLayout,
} from "../content/arcade/chapters";
import { readLaunchPhase } from "../debug/launchParams";

// Arcade mode: title flow and the chapter sequence (Rim -> Holdouts -> Pad -> Transit).
// Modes only sequence content; gameplay lives in game/, waves/, reclaim/.

export const arcadeMethods = {
  startNew(this: Game) {
    this.audio.unlock();
    // QA launch flags from live: ?phase=<name> jumps to a chapter, ?qa=1 skips the intro.
    const jump = readLaunchPhase(window.location.search);
    if (jump) {
      this.startPhase(jump);
    } else {
      this.beginCutscene("intro");
    }
  },
  continueGame(this: Game) {
    this.audio.unlock();
    let e = this.readSave();
    if (e) {
      this.startPhase(e);
    }
  },
  openCredits(this: Game) {
    this.mode = "credits";
    this.push(0, true);
  },
  backToMenu(this: Game) {
    this.mode = "menu";
    if (this.audio.ctx) {
      this.audio.setMood("rim");
    }
    this.push(0, true);
  },
  resume(this: Game) {
    if (this.mode === "pause") {
      this.mode = "play";
    }
    this.push(0, true);
  },
  retry(this: Game) {
    this.audio.unlock();
    this.startPhase(this.phase);
  },
  startPhase(this: Game, phase) {
    this.phase = phase;
    this.mode = "play";
    this.fish = [];
    this.bullets = [];
    this.particles = [];
    this.structures = [];
    this.nodes = [];
    this.holdouts = [];
    this.decoy = null;
    this.alert = 0;
    this.alerted = false;
    this.bossOn = false;
    this.winning = false;
    this.jupiterPlayed = false;
    this.scroll = 0;
    this.spawnAcc = 0;
    this.spawnN = 0;
    this.pickups = [];
    this.shipKit = {
      speed: false,
      spread: false,
      drone: false,
      shield: false,
    };
    this.invuln = 0;
    this.fireCd = 0;
    this.player.hp = 100;
    this.player.maxHp = 100;
    this.build = null;
    this.shake = 0;
    // Chapter layout is data (content/arcade/chapters.ts); unknown names fall
    // back to the transit layout exactly like live's default branch.
    const ch: ChapterLayout = CHAPTERS[phase] ?? CHAPTERS.shooter;
    this.weapon = ch.weapon;
    if (ch.freedCount !== undefined) this.freedCount = ch.freedCount;
    if (ch.scrap !== undefined) this.scrap = ch.scrap;
    if (ch.resetFirstBuild) this.sawFirstBuild = false;
    this.world = {
      ...ch.world,
    };
    this.player.x = ch.start.x;
    this.player.y = ch.start.y;
    if (ch.cache)
      this.cache = {
        ...ch.cache,
      };
    if (ch.pad)
      this.pad = {
        ...ch.pad,
      };
    if (ch.nest)
      this.nest = {
        ...ch.nest,
      };
    if (ch.nestTimer !== undefined) this.nestTimer = ch.nestTimer;
    this.covers = ch.covers.map((c) => ({
      ...c,
    }));
    if (ch.holdouts)
      this.holdouts = ch.holdouts.map((h) => ({
        ...h,
      }));
    if (ch.nodes)
      this.nodes = ch.nodes.map((n) => ({
        ...n,
      }));
    if (ch.fish)
      this.fish = ch.fish.map((f) =>
        this.makeFish(
          f.x,
          f.y,
          f.wps.map((w) => ({
            ...w,
          })),
        ),
      );
    if (ch.kits) this.scheduleKits();
    this.writeSave(phase);
    this.audio.setMood(CHAPTER_MOOD[phase] ?? "rim");
    this.push(0, true);
  },
};
