import { AudioDirector } from "../audio/AudioDirector";
import { installMethods } from "./install";
import { installControlsTest, removeControlsTest } from "../debug/controlsTest";
import { arcadeMethods } from "../modes/arcade";
import { saveMethods } from "../save/save";
import { loopMethods } from "../engine/loop";
import { viewMethods } from "../engine/view";
import { inputMethods } from "../engine/input";
import { playerMethods } from "./player";
import { weaponsMethods } from "./weapons";
import { projectilesMethods } from "./projectiles";
import { particlesMethods } from "./particles";
import { holdoutsMethods } from "./holdouts";
import { fishMethods } from "./enemies/fish";
import { eyeMethods } from "./enemies/eye";
import { shipMethods } from "./ship";
import { PLAYER, SHIP } from "../content/tuning/player";
import { transitMethods } from "../waves/transit";
import { padMethods } from "../reclaim/pad";
import { cutsceneMethods } from "../cutscenes/cutscene";
import { cineMethods } from "../cutscenes/cine";
import { loaderMethods } from "../assets/loader";
import { drawMethods } from "../render/draw";
import { groundMethods } from "../render/ground";
import { shooterMethods } from "../render/shooter";
import { scenesMethods } from "../render/scenes";
export class Game {
  mode = "menu";
  phase = "stealth";
  audio = new AudioDirector();
  onSnap;
  keys = new Set();
  qaKeys = null;
  fireLatch = false;
  shotPulse = false;
  sneakLatch = false;
  interactPulse = false;
  decoyPulse = false;
  stickX = 0;
  stickY = 0;
  aimX = 0;
  aimY = 0;
  aimOk = false;
  prevE = false;
  prevQ = false;
  hudAcc = 0;
  reduce = false;
  player = {
    x: 180,
    y: 920,
    hp: 100,
    maxHp: 100,
  };
  vx = 0;
  vy = 0;
  speed = 0;
  lastYaw = 0;
  dir = 0;
  invuln = 0;
  weapon = "pistol";
  fireCd = 0;
  alert = 0;
  alerted = false;
  lastSeen = {
    x: 0,
    y: 0,
  };
  decoy = null;
  decoyCd = 0;
  world = {
    w: 2000,
    h: 1100,
  };
  covers = [];
  fish = [];
  bullets = [];
  particles = [];
  nodes = [];
  structures = [];
  holdouts = [];
  scrap = 0;
  nest = {
    x: 1320,
    y: 280,
    r: 54,
    hp: 280,
    max: 280,
  };
  nestTimer = 4;
  pad = {
    x: 420,
    y: 700,
  };
  cache = {
    x: 1880,
    y: 1020,
  };
  build = null;
  sawFirstBuild = false;
  freedCount = 0;
  scroll = 0;
  spawnAcc = 0;
  spawnN = 0;
  bossOn = false;
  boss = {
    x: 0,
    y: 0,
    hp: 0,
    max: 700,
    t: 0,
    shot: 0,
  };
  jupiterPlayed = false;
  winning = false;
  shipKit = {
    speed: false,
    spread: false,
    drone: false,
    shield: false,
  };
  droneCd = 0;
  pickups = [];
  camX = 0;
  camY = 0;
  shake = 0;
  time = 0;
  cutId = "";
  cut = [];
  beat = 0;
  beatT = 0;
  canvas = null;
  ctx = null;
  raf = 0;
  stopped = false;
  last = 0;
  acc = 0;
  unbind = [];
  art = {
    astro: [],
    fishtd: [],
    fishside: [],
    ship: [],
    prop: [],
    boss: [],
  };
  rim = null;
  view = {
    dpr: 1,
    scale: 1,
    ox: 0,
    oy: 0,
  };
  tap = null;
  declare cine: any;
  declare cineVid: any;
  declare voiceEl: any;
  constructor(onSnap) {
    this.onSnap = onSnap;
  }
  attach(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.reduce =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    this.bindInputs();
    this.loadArt();
    this.loadCine();
    this.resize();
    installControlsTest(this);
    this.push(0, true);
  }
  detach() {
    this.stopped = true;
    cancelAnimationFrame(this.raf);
    for (let e of this.unbind) {
      e();
    }
    this.unbind = [];
    this.audio.close();
    this.stopCine();
    removeControlsTest(this);
  }
  setMusic(vol) {
    this.audio.setMusic(vol);
  }
  getYaw() {
    return this.lastYaw;
  }
  getSpeed() {
    return this.speed;
  }
  getX() {
    return this.player.x;
  }
  tick(dt) {
    this.time += dt;
    this.invuln = Math.max(0, this.invuln - dt);
    this.fireCd = Math.max(0, this.fireCd - dt);
    this.decoyCd = Math.max(0, this.decoyCd - dt);
    this.shake = Math.max(0, this.shake - dt * 1.8);
    this.stepParticles(dt);
    if (this.mode === "cutscene") {
      this.beatT += dt;
      let t = this.cut[this.beat];
      if (t && this.beatT >= t.dur) {
        this.advanceBeat();
      }
      this.push(dt);
      return;
    }
    if (this.mode !== "play") {
      this.shotPulse = false;
      this.push(dt);
      return;
    }
    let wish = this.wish();
    if (wish.mag > 0.1) {
      this.lastYaw = Math.atan2(-wish.x, -wish.y);
    }
    let held = this.held();
    let sneaking =
      this.phase === "stealth" &&
      (this.sneakLatch || held.has("ShiftLeft") || held.has("ShiftRight"));
    let speed =
      this.phase === "shooter"
        ? SHIP.speed * (this.shipKit.speed ? SHIP.speedKit : 1)
        : sneaking
          ? PLAYER.sneakSpeed
          : PLAYER.walkSpeed;
    if (this.phase === "shooter") {
      this.tickShooter(dt, wish, speed);
    } else {
      this.tickGround(dt, wish, speed, sneaking);
    }
    if (this.player.hp <= 0 && this.mode === "play") {
      this.mode = "dead";
      this.audio.hit();
      this.shake = 1;
    }
    let mood = this.bossOn
      ? "swarm"
      : this.alert > 0 && this.phase === "stealth"
        ? "swarm"
        : this.phase === "shooter"
          ? "transit"
          : this.phase === "base"
            ? "base"
            : this.phase === "rescue"
              ? "holdouts"
              : "rim";
    this.audio.setMood(mood);
    this.push(dt);
  }
  push(dt, force = false) {
    this.hudAcc += dt;
    if (!force && this.hudAcc < 0.12) {
      return;
    }
    this.hudAcc = 0;
    let counts = this.counts();
    let beat = this.cut[this.beat];
    this.onSnap({
      mode: this.mode,
      phase: this.phase,
      hp: Math.max(0, Math.round(this.player.hp)),
      maxHp: this.player.maxHp,
      objective:
        this.mode === "play" || this.mode === "pause" ? this.objective() : "",
      alert: this.alert > 0 && this.phase === "stealth",
      scrap: this.scrap,
      gens: counts.gens,
      turrets: counts.turrets,
      labs: counts.labs,
      nestHp: Math.max(0, Math.round(this.nest.hp)),
      nestMax: this.nest.max,
      freed: this.freedCount,
      caption: beat?.caption ?? "",
      bossHp: Math.max(0, Math.round(this.boss.hp)),
      bossMax: this.boss.max,
      canLaunch: this.phase === "base" && this.launchReady(),
      hasSave: this.readSave() != null,
      weapon:
        this.weapon === "laser"
          ? "Laser"
          : this.weapon === "ship"
            ? "Ship guns"
            : "Sidearm",
      build: this.build,
      shield: this.shipKit.shield,
      spread: this.shipKit.spread,
      drone: this.shipKit.drone,
      speedKit: this.shipKit.speed,
      powered: counts.gens > 0,
    });
  }
  counts() {
    return {
      gens: this.structures.filter((e) => e.kind === "gen").length,
      turrets: this.structures.filter((e) => e.kind === "turret").length,
      labs: this.structures.filter((e) => e.kind === "lab").length,
    };
  }
  objective() {
    return this.phase === "stealth"
      ? "Reach the weapons cache. Stay out of the cones."
      : this.phase === "rescue"
        ? `Free the holdouts (${this.freedCount}/3). Clear fish, then Use.`
        : this.phase === "base"
          ? this.nest.hp > 0
            ? "Gather scrap. Build power, two turrets, and a lab. Burn the nest."
            : this.launchReady()
              ? "Launch is ready. Stand on the brass pad and press Use."
              : "Nest is cold. Finish the generator, two turrets, and the lab."
          : this.bossOn
            ? "Break the eye over Jupiter."
            : "Fly east. Take the kits. Jupiter is ahead.";
  }
}
type Methods = typeof arcadeMethods &
  typeof saveMethods &
  typeof loopMethods &
  typeof viewMethods &
  typeof inputMethods &
  typeof playerMethods &
  typeof weaponsMethods &
  typeof projectilesMethods &
  typeof particlesMethods &
  typeof holdoutsMethods &
  typeof fishMethods &
  typeof eyeMethods &
  typeof shipMethods &
  typeof transitMethods &
  typeof padMethods &
  typeof cutsceneMethods &
  typeof cineMethods &
  typeof loaderMethods &
  typeof drawMethods &
  typeof groundMethods &
  typeof shooterMethods &
  typeof scenesMethods;
export interface Game extends Methods {}
installMethods(
  Game,
  arcadeMethods,
  saveMethods,
  loopMethods,
  viewMethods,
  inputMethods,
  playerMethods,
  weaponsMethods,
  projectilesMethods,
  particlesMethods,
  holdoutsMethods,
  fishMethods,
  eyeMethods,
  shipMethods,
  transitMethods,
  padMethods,
  cutsceneMethods,
  cineMethods,
  loaderMethods,
  drawMethods,
  groundMethods,
  shooterMethods,
  scenesMethods,
);
