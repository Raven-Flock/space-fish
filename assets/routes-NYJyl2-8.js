import { n as e, r as t, t as n } from "./index-CMaL7jzG.js";
var r = t(e(), 1),
  i = class {
    ctx = null;
    master = null;
    music = null;
    musicGain = null;
    mood = ``;
    unlock() {
      let e = window.AudioContext || window.webkitAudioContext;
      e &&
        (this.ctx ||
          ((this.ctx = new e()),
          (this.master = this.ctx.createGain()),
          (this.master.gain.value = 0.22),
          this.master.connect(this.ctx.destination),
          (this.music = this.ctx.createOscillator()),
          (this.music.type = `triangle`),
          (this.musicGain = this.ctx.createGain()),
          (this.musicGain.gain.value = 0.028),
          this.music.connect(this.musicGain),
          this.musicGain.connect(this.master),
          (this.music.frequency.value = 74),
          this.music.start(),
          (this.mood = ``)),
        this.ctx.resume());
    }
    close() {
      (this.music?.stop(),
        this.ctx?.close(),
        (this.ctx = null),
        (this.music = null));
    }
    setMood(e) {
      if (!this.ctx || !this.music || e === this.mood) return;
      this.mood = e;
      let t =
        e === `stealth`
          ? 68
          : e === `alert`
            ? 196
            : e === `base`
              ? 92
              : e === `shooter`
                ? 156
                : 58;
      this.music.frequency.setTargetAtTime(t, this.ctx.currentTime, 0.25);
    }
    tone(e, t, n, r) {
      if (!this.ctx || !this.master) return;
      let i = this.ctx.createOscillator(),
        a = this.ctx.createGain();
      ((i.type = n),
        (i.frequency.value = e),
        a.gain.setValueAtTime(r, this.ctx.currentTime),
        a.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + t),
        i.connect(a),
        a.connect(this.master),
        i.start(),
        i.stop(this.ctx.currentTime + t));
    }
    shoot(e) {
      this.tone(e ? 720 : 196, 0.07, `square`, 0.045);
    }
    hit() {
      this.tone(110, 0.14, `sawtooth`, 0.06);
    }
    blip() {
      this.tone(320, 0.06, `square`, 0.035);
    }
    pickup() {
      (this.tone(540, 0.08, `triangle`, 0.05),
        this.tone(810, 0.12, `triangle`, 0.04));
    }
    alarm() {
      this.tone(466, 0.16, `square`, 0.04);
    }
  },
  a = `spacefish-v1`,
  o = { gen: 40, turret: 45, lab: 60 },
  s = {
    intro: [
      {
        dur: 6.8,
        kind: `cine`,
        plate: `dig`,
        clip: `dig`,
        voice: `open`,
        caption: `On the rim of the base, the work is quiet. The miner digs. The robot keeps the light.`,
      },
      {
        dur: 7,
        kind: `cine`,
        plate: `turn`,
        voice: `turn`,
        caption: `Then the sound reaches him. Not the usual machinery. Something tearing.`,
      },
      {
        dur: 6.4,
        kind: `cine`,
        plate: `swarm`,
        clip: `swarm`,
        voice: `reveal`,
        caption: `He turns. Behind him the base is already coming apart. The swarm is here.`,
      },
      {
        dur: 5.2,
        kind: `cine`,
        plate: `fish`,
        voice: `attack`,
        caption: `One breaks free. The robot goes down hard.`,
      },
      {
        dur: 6.4,
        kind: `cine`,
        plate: `fight`,
        clip: `fight`,
        voice: `fight`,
        caption: `There is no time to run. Only the shovel.`,
      },
      {
        dur: 6.5,
        kind: `cine`,
        plate: `close`,
        voice: `close`,
        caption: `I need to get to the weapons cache.`,
      },
    ],
    arm: [{ dur: 3.1, kind: `arm`, caption: `Now I can fight back.` }],
    freed: [
      {
        dur: 2.3,
        kind: `rescue`,
        caption: `They're up. They'll work if we take the base.`,
      },
    ],
    toBase: [
      { dur: 2.3, kind: `rescue`, caption: `All three are with you.` },
      {
        dur: 2.8,
        kind: `rebuild`,
        caption: `Take the pad. Build. Burn the nest.`,
      },
    ],
    firstbuild: [
      {
        dur: 2.5,
        kind: `rebuild`,
        caption: `Power's back on a single spar. Hold it.`,
      },
    ],
    launch: [
      {
        dur: 2.6,
        kind: `secured`,
        caption: `The moon is ours again. The swarm is not.`,
      },
      { dur: 3, kind: `launch`, caption: `Time to take the fight to them.` },
    ],
    jupiter: [
      {
        dur: 3.3,
        kind: `jupiter`,
        caption: `Jupiter. The center of the invasion.`,
      },
    ],
    victory: [
      {
        dur: 3.4,
        kind: `victory`,
        caption: `The eye breaks. The rim can breathe.`,
      },
    ],
  };
function c(e, t, n) {
  return Math.max(t, Math.min(n, e));
}
function l(e, t) {
  return Math.hypot(e, t);
}
function u(e, t, n, r, i) {
  let a = 0,
    o = 1,
    s = n - e,
    c = r - t,
    l = [-s, s, -c, c],
    u = [e - i.x, i.x + i.w - e, t - i.y, i.y + i.h - t];
  for (let e = 0; e < 4; e++) {
    let t = l[e] ?? 0,
      n = u[e] ?? 0;
    if (Math.abs(t) < 1e-8) {
      if (n < 0) return !1;
    } else {
      let e = n / t;
      if (t < 0) {
        if (e > o) return !1;
        e > a && (a = e);
      } else {
        if (e < a) return !1;
        e < o && (o = e);
      }
    }
  }
  return !0;
}
function d(e, t, n, r) {
  let i = c(e, r.x, r.x + r.w),
    a = c(t, r.y, r.y + r.h);
  return (e - i) ** 2 + (t - a) ** 2 < n * n;
}
function f() {
  return {
    mode: `menu`,
    phase: `stealth`,
    hp: 100,
    maxHp: 100,
    objective: ``,
    alert: !1,
    scrap: 0,
    gens: 0,
    turrets: 0,
    labs: 0,
    nestHp: 0,
    nestMax: 1,
    freed: 0,
    caption: ``,
    bossHp: 0,
    bossMax: 1,
    canLaunch: !1,
    hasSave: !1,
    weapon: `Sidearm`,
    build: null,
    shield: !1,
    spread: !1,
    drone: !1,
    speedKit: !1,
    powered: !1,
  };
}
var p = class {
    mode = `menu`;
    phase = `stealth`;
    audio = new i();
    onSnap;
    keys = new Set();
    qaKeys = null;
    fireLatch = !1;
    shotPulse = !1;
    sneakLatch = !1;
    interactPulse = !1;
    decoyPulse = !1;
    stickX = 0;
    stickY = 0;
    aimX = 0;
    aimY = 0;
    aimOk = !1;
    prevE = !1;
    prevQ = !1;
    hudAcc = 0;
    reduce = !1;
    player = { x: 180, y: 920, hp: 100, maxHp: 100 };
    vx = 0;
    vy = 0;
    speed = 0;
    lastYaw = 0;
    dir = 0;
    invuln = 0;
    weapon = `pistol`;
    fireCd = 0;
    alert = 0;
    alerted = !1;
    lastSeen = { x: 0, y: 0 };
    decoy = null;
    decoyCd = 0;
    world = { w: 2e3, h: 1100 };
    covers = [];
    fish = [];
    bullets = [];
    particles = [];
    nodes = [];
    structures = [];
    holdouts = [];
    scrap = 0;
    nest = { x: 1320, y: 280, r: 54, hp: 280, max: 280 };
    nestTimer = 4;
    pad = { x: 420, y: 700 };
    cache = { x: 1880, y: 1020 };
    build = null;
    sawFirstBuild = !1;
    freedCount = 0;
    scroll = 0;
    spawnAcc = 0;
    spawnN = 0;
    bossOn = !1;
    boss = { x: 0, y: 0, hp: 0, max: 700, t: 0, shot: 0 };
    jupiterPlayed = !1;
    winning = !1;
    shipKit = { speed: !1, spread: !1, drone: !1, shield: !1 };
    droneCd = 0;
    pickups = [];
    camX = 0;
    camY = 0;
    shake = 0;
    time = 0;
    cutId = ``;
    cut = [];
    beat = 0;
    beatT = 0;
    canvas = null;
    ctx = null;
    raf = 0;
    stopped = !1;
    last = 0;
    acc = 0;
    unbind = [];
    art = { astro: [], fishtd: [], fishside: [], ship: [], prop: [], boss: [] };
    view = { dpr: 1, scale: 1, ox: 0, oy: 0 };
    tap = null;
    constructor(e) {
      this.onSnap = e;
    }
    attach(e) {
      ((this.canvas = e),
        (this.ctx = e.getContext(`2d`)),
        (this.reduce =
          window.matchMedia?.(`(prefers-reduced-motion: reduce)`).matches ??
          !1),
        this.bindInputs(),
        this.loadArt(),
        this.loadCine(),
        this.resize(),
        (window.__controlsTest = {
          getYaw: () => this.getYaw(),
          getSpeed: () => this.getSpeed(),
          getX: () => this.getX(),
          setKeys: (e) => this.setQaKeys(e),
        }),
        this.push(0, !0));
    }
    detach() {
      ((this.stopped = !0), cancelAnimationFrame(this.raf));
      for (let e of this.unbind) e();
      ((this.unbind = []),
        this.audio.close(),
        this.stopCine(),
        window.__controlsTest?.getYaw === this.getYaw.bind(this) &&
          delete window.__controlsTest);
    }
    startLoop() {
      ((this.stopped = !1), (this.last = performance.now()));
      let e = (t) => {
        if (this.stopped) return;
        let n = Math.min(0.05, (t - this.last) / 1e3);
        for (this.last = t, this.acc += n; this.acc >= 1 / 60;)
          (this.tick(1 / 60), (this.acc -= 1 / 60));
        (this.draw(), (this.raf = requestAnimationFrame(e)));
      };
      this.raf = requestAnimationFrame(e);
    }
    resize() {
      let e = this.canvas;
      if (!e) return;
      let t = e.getBoundingClientRect(),
        n = Math.min(2, window.devicePixelRatio || 1);
      ((e.width = Math.max(1, Math.floor(t.width * n))),
        (e.height = Math.max(1, Math.floor(t.height * n))));
      let r = Math.min(t.width / 960, t.height / 540);
      this.view = {
        dpr: n,
        scale: r,
        ox: (t.width - 960 * r) / 2,
        oy: (t.height - 540 * r) / 2,
      };
    }
    setQaKeys(e) {
      this.qaKeys = new Set(e);
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
    setStick(e, t, n) {
      ((this.stickX = e), (this.stickY = t));
      if (n || e !== 0 || t !== 0) this.tap = null;
    }
    setFire(e) {
      this.fireLatch = e;
      if (e) this.tap = null;
    }
    toggleSneak() {
      this.sneakLatch = !this.sneakLatch;
      this.tap = null;
    }
    pulseUse() {
      this.interactPulse = !0;
      this.tap = null;
    }
    pulseNoise() {
      this.decoyPulse = !0;
      this.tap = null;
    }
    selectBuild(e) {
      ((this.build = this.build === e ? null : e), this.push(0, !0));
    }
    dropBuild() {
      let e = this.dirVector();
      this.tryPlace(this.player.x + e.x * 78, this.player.y + e.y * 78);
    }
    startNew() {
      this.audio.unlock();
      let e = new URLSearchParams(window.location.search),
        t = e.get(`phase`);
      t === `rescue` || t === `base` || t === `shooter` || t === `stealth`
        ? this.startPhase(t)
        : e.get(`qa`) === `1`
          ? this.startPhase(`stealth`)
          : this.beginCutscene(`intro`);
    }
    continueGame() {
      this.audio.unlock();
      let e = this.readSave();
      e && this.startPhase(e);
    }
    openCredits() {
      ((this.mode = `credits`), this.push(0, !0));
    }
    backToMenu() {
      ((this.mode = `menu`), this.push(0, !0));
    }
    resume() {
      (this.mode === `pause` && (this.mode = `play`), this.push(0, !0));
    }
    retry() {
      (this.audio.unlock(), this.startPhase(this.phase));
    }
    skipCutscene() {
      this.mode === `cutscene` && this.finishCut();
    }
    advanceBeat() {
      this.mode === `cutscene` &&
        ((this.beat += 1),
        (this.beatT = 0),
        this.beat >= this.cut.length
          ? this.finishCut()
          : (this.playCine(), this.push(0, !0)));
    }
    readSave() {
      try {
        let e = localStorage.getItem(a);
        if (!e) return null;
        let t = JSON.parse(e).phase;
        if (
          t === `stealth` ||
          t === `rescue` ||
          t === `base` ||
          t === `shooter`
        )
          return t;
      } catch {}
      return null;
    }
    writeSave(e) {
      try {
        localStorage.setItem(a, JSON.stringify({ version: 1, phase: e }));
      } catch {}
    }
    startPhase(e) {
      ((this.phase = e),
        (this.mode = `play`),
        (this.fish = []),
        (this.bullets = []),
        (this.particles = []),
        (this.structures = []),
        (this.nodes = []),
        (this.holdouts = []),
        (this.decoy = null),
        (this.alert = 0),
        (this.alerted = !1),
        (this.bossOn = !1),
        (this.winning = !1),
        (this.jupiterPlayed = !1),
        (this.scroll = 0),
        (this.spawnAcc = 0),
        (this.spawnN = 0),
        (this.pickups = []),
        (this.shipKit = { speed: !1, spread: !1, drone: !1, shield: !1 }),
        (this.invuln = 0),
        (this.fireCd = 0),
        (this.player.hp = 100),
        (this.player.maxHp = 100),
        (this.build = null),
        (this.shake = 0),
        e === `stealth`
          ? ((this.weapon = `pistol`),
            (this.world = { w: 2e3, h: 1100 }),
            (this.player.x = 180),
            (this.player.y = 920),
            (this.cache = { x: 1860, y: 1e3 }),
            (this.covers = [
              { x: 80, y: 70, w: 520, h: 280 },
              { x: 700, y: 110, w: 280, h: 210 },
              { x: 1080, y: 70, w: 360, h: 250 },
              { x: 1560, y: 90, w: 360, h: 230 },
              { x: 400, y: 500, w: 150, h: 110 },
              { x: 760, y: 600, w: 120, h: 100 },
              { x: 1120, y: 470, w: 160, h: 120 },
              { x: 1450, y: 560, w: 110, h: 120 },
              { x: 700, y: 990, w: 80, h: 110 },
            ]),
            (this.fish = [
              this.makeFish(360, 460, [
                { x: 360, y: 460 },
                { x: 640, y: 460 },
                { x: 640, y: 560 },
                { x: 360, y: 560 },
              ]),
              this.makeFish(620, 800, [
                { x: 560, y: 800 },
                { x: 980, y: 800 },
              ]),
              this.makeFish(1680, 640, [
                { x: 1600, y: 640 },
                { x: 1860, y: 640 },
                { x: 1680, y: 500 },
              ]),
            ]))
          : e === `rescue`
            ? ((this.weapon = `laser`),
              (this.freedCount = 0),
              (this.world = { w: 1900, h: 1e3 }),
              (this.player.x = 120),
              (this.player.y = 500),
              (this.covers = [
                { x: 0, y: 0, w: 1900, h: 36 },
                { x: 0, y: 964, w: 1900, h: 36 },
                { x: 0, y: 0, w: 36, h: 1e3 },
                { x: 1864, y: 0, w: 36, h: 1e3 },
                { x: 420, y: 36, w: 36, h: 400 },
                { x: 420, y: 600, w: 36, h: 364 },
                { x: 980, y: 180, w: 36, h: 520 },
                { x: 1400, y: 36, w: 36, h: 360 },
                { x: 1400, y: 560, w: 36, h: 404 },
              ]),
              (this.holdouts = [
                { x: 250, y: 180, freed: !1 },
                { x: 700, y: 800, freed: !1 },
                { x: 1620, y: 240, freed: !1 },
              ]),
              (this.fish = [
                this.makeFish(340, 240, []),
                this.makeFish(760, 700, []),
                this.makeFish(1540, 320, []),
              ]))
            : e === `base`
              ? ((this.weapon = `laser`),
                (this.freedCount = 3),
                (this.scrap = 80),
                (this.sawFirstBuild = !1),
                (this.world = { w: 1700, h: 1100 }),
                (this.player.x = 280),
                (this.player.y = 700),
                (this.pad = { x: 420, y: 700 }),
                (this.nest = { x: 1360, y: 280, r: 56, hp: 280, max: 280 }),
                (this.nestTimer = 3),
                (this.covers = [
                  { x: 980, y: 140, w: 90, h: 70 },
                  { x: 1180, y: 820, w: 120, h: 80 },
                ]),
                (this.nodes = [
                  { x: 180, y: 280, amount: 40, taken: !1 },
                  { x: 640, y: 200, amount: 40, taken: !1 },
                  { x: 900, y: 860, amount: 40, taken: !1 },
                  { x: 200, y: 980, amount: 40, taken: !1 },
                  { x: 780, y: 480, amount: 40, taken: !1 },
                ]),
                (this.fish = [
                  this.makeFish(1100, 420, []),
                  this.makeFish(1240, 520, []),
                ]))
              : ((this.weapon = `ship`),
                (this.world = { w: 8e3, h: 540 }),
                (this.player.x = 160),
                (this.player.y = 270),
                (this.covers = []),
                this.scheduleKits()),
        this.writeSave(e),
        this.audio.setMood(
          e === `shooter` ? `shooter` : e === `base` ? `base` : `stealth`,
        ),
        this.push(0, !0));
    }
    scheduleKits() {
      this.pickups = [
        { x: 700, y: 160, kind: `speed` },
        { x: 1300, y: 380, kind: `spread` },
        { x: 1900, y: 220, kind: `drone` },
        { x: 2300, y: 340, kind: `shield` },
      ];
    }
    makeFish(e, t, n) {
      return {
        x: e,
        y: t,
        hp: this.phase === `stealth` ? 40 : 32,
        facing: 0,
        wps: n,
        wi: 0,
        aggro: !1,
      };
    }
    beginCutscene(e) {
      ((this.cutId = e),
        (this.cut = s[e] ?? []),
        (this.beat = 0),
        (this.beatT = 0),
        (this.mode = `cutscene`),
        this.push(0, !0),
        e === `intro` && this.playCine());
    }
    finishCut() {
      this.stopCine();
      let e = this.cutId;
      ((this.cut = []),
        e === `intro`
          ? this.startPhase(`stealth`)
          : e === `arm`
            ? this.startPhase(`rescue`)
            : e === `toBase`
              ? this.startPhase(`base`)
              : e === `launch`
                ? this.startPhase(`shooter`)
                : e === `jupiter`
                  ? ((this.mode = `play`),
                    (this.bossOn = !0),
                    (this.boss = {
                      x: this.scroll + 960 - 180,
                      y: 270,
                      hp: 700,
                      max: 700,
                      t: 0,
                      shot: 0.6,
                    }),
                    this.audio.setMood(`alert`),
                    this.push(0, !0))
                  : e === `victory`
                    ? ((this.mode = `victory`),
                      this.audio.setMood(`menu`),
                      this.push(0, !0))
                    : ((this.mode = `play`), this.push(0, !0)));
    }
    held() {
      return this.qaKeys ?? this.keys;
    }
    wish() {
      let e = this.held(),
        t = 0,
        n = 0;
      ((e.has(`KeyA`) || e.has(`ArrowLeft`)) && --t,
        (e.has(`KeyD`) || e.has(`ArrowRight`)) && (t += 1),
        (e.has(`KeyW`) || e.has(`ArrowUp`)) && --n,
        (e.has(`KeyS`) || e.has(`ArrowDown`)) && (n += 1));
      if (t !== 0 || n !== 0) this.tap = null;
      if (
        this.qaKeys == null &&
        (this.stickX !== 0 || this.stickY !== 0)
      )
        ((this.tap = null), (t = this.stickX), (n = this.stickY));
      else if (this.qaKeys == null && this.tap && t === 0 && n === 0) {
        let r = this.tap.x - this.player.x,
          i = this.tap.y - this.player.y,
          a = Math.hypot(r, i);
        a < 22 ? (this.tap = null) : ((t = r / a), (n = i / a));
      }
      let r = Math.min(1, l(t, n));
      return (
        r > 0.001 && ((t /= l(t, n)), (n /= l(t, n))),
        { x: t, y: n, mag: r }
      );
    }
    dirVector() {
      return this.dir === 1
        ? { x: -1, y: 0 }
        : this.dir === 2
          ? { x: 1, y: 0 }
          : this.dir === 3
            ? { x: 0, y: -1 }
            : { x: 0, y: 1 };
    }
    aimAngle() {
      if (this.aimOk && this.qaKeys == null)
        return Math.atan2(this.aimY - this.player.y, this.aimX - this.player.x);
      let e = this.dirVector();
      return Math.atan2(e.y, e.x);
    }
    tick(e) {
      if (
        ((this.time += e),
        (this.invuln = Math.max(0, this.invuln - e)),
        (this.fireCd = Math.max(0, this.fireCd - e)),
        (this.decoyCd = Math.max(0, this.decoyCd - e)),
        (this.shake = Math.max(0, this.shake - e * 1.8)),
        this.stepParticles(e),
        this.mode === `cutscene`)
      ) {
        this.beatT += e;
        let t = this.cut[this.beat];
        (t && this.beatT >= t.dur && this.advanceBeat(), this.push(e));
        return;
      }
      if (this.mode !== `play`) {
        ((this.shotPulse = !1), this.push(e));
        return;
      }
      let t = this.wish();
      t.mag > 0.1 && (this.lastYaw = Math.atan2(-t.x, -t.y));
      let n = this.held(),
        r =
          this.phase === `stealth` &&
          (this.sneakLatch || n.has(`ShiftLeft`) || n.has(`ShiftRight`)),
        i =
          this.phase === `shooter`
            ? 280 * (this.shipKit.speed ? 1.35 : 1)
            : r
              ? 72
              : 156;
      (this.phase === `shooter`
        ? this.tickShooter(e, t, i)
        : this.tickGround(e, t, i, r),
        this.player.hp <= 0 &&
          this.mode === `play` &&
          ((this.mode = `dead`), this.audio.hit(), (this.shake = 1)));
      let a =
        this.alert > 0 && this.phase === `stealth`
          ? `alert`
          : this.phase === `shooter`
            ? `shooter`
            : this.phase === `base`
              ? `base`
              : `stealth`;
      (this.audio.setMood(this.bossOn ? `alert` : a), this.push(e));
    }
    tickGround(e, t, n, r) {
      let i = this.player.x,
        a = this.player.y,
        o = i + t.x * n * t.mag * e,
        s = a + t.y * n * t.mag * e;
      (this.blocked(o, a, 14) && (o = i),
        this.blocked(o, s, 14) && (s = a),
        (this.player.x = c(o, 14, this.world.w - 14)),
        (this.player.y = c(s, 14, this.world.h - 14)),
        (this.vx = (this.player.x - i) / e),
        (this.vy = (this.player.y - a) / e),
        (this.speed = l(this.vx, this.vy)),
        this.speed > 12 &&
          (this.dir =
            Math.abs(this.vx) > Math.abs(this.vy)
              ? this.vx < 0
                ? 1
                : 2
              : this.vy < 0
                ? 3
                : 0));
      let u = this.held(),
        d = this.interactPulse || (!this.prevE && u.has(`KeyE`)),
        f = this.decoyPulse || (!this.prevQ && u.has(`KeyQ`));
      if (
        ((this.prevE = u.has(`KeyE`)),
        (this.prevQ = u.has(`KeyQ`)),
        (this.interactPulse = !1),
        (this.decoyPulse = !1),
        f && this.decoyCd <= 0 && this.phase === `stealth`)
      ) {
        let e = this.aimAngle();
        ((this.decoy = {
          x: this.player.x + Math.cos(e) * 190,
          y: this.player.y + Math.sin(e) * 190,
          life: 4,
        }),
          (this.decoyCd = 3.2),
          this.audio.blip());
      }
      this.decoy &&
        ((this.decoy.life -= e), this.decoy.life <= 0 && (this.decoy = null));
      let p = this.fireLatch || this.shotPulse || u.has(`Space`);
      ((this.shotPulse = !1),
        p && this.fireCd <= 0 && this.shootGround(),
        this.tickFish(e, r),
        this.tickBullets(e),
        this.tickNodes(),
        this.tickStructures(e),
        this.phase === `stealth`
          ? l(this.player.x - this.cache.x, this.player.y - this.cache.y) <
              46 && this.beginCutscene(`arm`)
          : this.phase === `rescue` && d
            ? this.tryFree()
            : this.phase === `base` &&
              d &&
              this.launchReady() &&
              l(this.player.x - this.pad.x, this.player.y - this.pad.y) < 78 &&
              this.beginCutscene(`launch`),
        this.alert > 0 && (this.alert -= e));
    }
    shootGround() {
      let e = this.weapon === `laser`,
        t = this.aimAngle();
      if (e) {
        let e = this.laserTarget();
        e && (t = Math.atan2(e.y - this.player.y, e.x - this.player.x));
      }
      ((this.fireCd = e ? 0.2 : 0.42),
        this.bullets.push({
          x: this.player.x + Math.cos(t) * 20,
          y: this.player.y + Math.sin(t) * 20,
          vx: Math.cos(t) * (e ? 640 : 420),
          vy: Math.sin(t) * (e ? 640 : 420),
          r: e ? 5 : 4,
          dmg: e ? 18 : 12,
          friendly: !0,
          life: 1.1,
        }),
        this.audio.shoot(e),
        !e &&
          this.phase === `stealth` &&
          ((this.alert = 3.4),
          (this.lastSeen = { x: this.player.x, y: this.player.y }),
          this.alerted || this.audio.alarm(),
          (this.alerted = !0)));
    }
    laserTarget() {
      let e = null,
        t = 280;
      for (let n of this.fish) {
        let r = l(n.x - this.player.x, n.y - this.player.y);
        r < t && ((t = r), (e = n));
      }
      return (
        !e &&
          this.phase === `base` &&
          this.nest.hp > 0 &&
          l(this.nest.x - this.player.x, this.nest.y - this.player.y) < 340 &&
          (e = this.nest),
        e
      );
    }
    tickFish(e, t) {
      for (let n of this.fish)
        n.hp <= 0 ||
          (this.phase === `stealth`
            ? this.steerStealth(n, e, t)
            : this.steerCombat(n, e),
          l(n.x - this.player.x, n.y - this.player.y) < 26 &&
            this.invuln <= 0 &&
            ((this.player.hp -= 10),
            (this.invuln = 0.65),
            (this.shake = 0.8),
            this.audio.hit()));
      if (
        ((this.fish = this.fish.filter((e) => e.hp > 0)),
        this.phase === `base` &&
          this.nest.hp > 0 &&
          ((this.nestTimer -= e), this.nestTimer <= 0 && this.fish.length < 5))
      ) {
        this.nestTimer = 6.5;
        let e = Math.random() * Math.PI * 2;
        this.fish.push(
          this.makeFish(
            this.nest.x + Math.cos(e) * 70,
            this.nest.y + Math.sin(e) * 70,
            [],
          ),
        );
      }
    }
    steerStealth(e, t, n) {
      this.fishSees(e, n) &&
        ((this.alert = 3.4),
        (this.lastSeen = { x: this.player.x, y: this.player.y }),
        this.alerted || this.audio.alarm(),
        (this.alerted = !0));
      let r = e.wps[e.wi]?.x ?? e.x,
        i = e.wps[e.wi]?.y ?? e.y,
        a = 74;
      (this.alert > 0
        ? ((r = this.lastSeen.x), (i = this.lastSeen.y), (a = 160))
        : this.decoy &&
          l(this.decoy.x - e.x, this.decoy.y - e.y) < 540 &&
          ((r = this.decoy.x), (i = this.decoy.y), (a = 120)),
        this.stepToward(e, r, i, a, t),
        this.alert <= 0 &&
          !this.decoy &&
          l(r - e.x, i - e.y) < 10 &&
          (e.wi = (e.wi + 1) % Math.max(1, e.wps.length)));
    }
    fishSees(e, t) {
      let n = this.player.x - e.x,
        r = this.player.y - e.y;
      if (l(n, r) > (t ? 150 : 236)) return !1;
      let i = Math.atan2(r, n) - e.facing;
      for (; i > Math.PI;) i -= Math.PI * 2;
      for (; i < -Math.PI;) i += Math.PI * 2;
      if (Math.abs(i) > 0.62) return !1;
      for (let t of this.covers)
        if (u(e.x, e.y, this.player.x, this.player.y, t)) return !1;
      return !0;
    }
    steerCombat(e, t) {
      let n = l(this.player.x - e.x, this.player.y - e.y),
        r = !0;
      if (this.phase === `rescue`)
        for (let t of this.covers)
          u(e.x, e.y, this.player.x, this.player.y, t) && (r = !1);
      (n < 200 && r && (e.aggro = !0),
        e.aggro && n > 620 && (e.aggro = !1),
        e.aggro &&
          this.stepToward(
            e,
            this.player.x,
            this.player.y,
            this.phase === `rescue` ? 96 : 132,
            t,
          ));
    }
    stepToward(e, t, n, r, i) {
      let a = t - e.x,
        o = n - e.y,
        s = l(a, o) || 1;
      ((e.x += (a / s) * r * i),
        (e.y += (o / s) * r * i),
        (e.facing = Math.atan2(o, a)));
    }
    tickBullets(e) {
      for (let t of this.bullets)
        if (((t.x += t.vx * e), (t.y += t.vy * e), (t.life -= e), !t.friendly))
          l(t.x - this.player.x, t.y - this.player.y) < 16 + t.r &&
            this.hurtPlayer(t.dmg);
        else {
          for (let e of this.fish)
            e.hp > 0 &&
              l(t.x - e.x, t.y - e.y) < 18 &&
              ((e.hp -= t.dmg),
              (t.life = 0),
              this.burst(t.x, t.y, `#7a4ad4`),
              e.hp <= 0 && this.audio.hit());
          (this.phase === `base` &&
            this.nest.hp > 0 &&
            l(t.x - this.nest.x, t.y - this.nest.y) < this.nest.r &&
            ((this.nest.hp -= t.dmg),
            (t.life = 0),
            this.burst(t.x, t.y, `#3ec7c2`),
            this.nest.hp <= 0 && this.audio.pickup()),
            this.bossOn &&
              l(t.x - this.boss.x, t.y - this.boss.y) < 120 &&
              ((this.boss.hp -= t.dmg),
              (t.life = 0),
              this.burst(t.x, t.y, `#3ec7c2`)));
        }
      this.bullets = this.bullets.filter(
        (e) =>
          e.life > 0 &&
          e.x > -80 &&
          e.y > -80 &&
          e.x < this.world.w + 80 &&
          e.y < this.world.h + 200,
      );
    }
    hurtPlayer(e) {
      this.invuln > 0 ||
        (this.phase === `shooter` && this.shipKit.shield
          ? ((this.shipKit.shield = !1),
            (this.invuln = 0.4),
            this.audio.alarm())
          : ((this.player.hp -= e),
            (this.invuln = 0.45),
            (this.shake = 0.7),
            this.audio.hit()));
    }
    tickNodes() {
      if (this.phase === `base`)
        for (let e of this.nodes)
          e.taken ||
            (l(e.x - this.player.x, e.y - this.player.y) < 28 &&
              ((e.taken = !0), (this.scrap += e.amount), this.audio.pickup()));
    }
    tickStructures(e) {
      if (this.structures.some((e) => e.kind === `gen`))
        for (let t of this.structures) {
          if (t.kind !== `turret` || ((t.cool -= e), t.cool > 0)) continue;
          let n = this.nearestHostile(t.x, t.y, 280);
          if (!n) continue;
          t.cool = 0.55;
          let r = Math.atan2(n.y - t.y, n.x - t.x);
          this.bullets.push({
            x: t.x,
            y: t.y,
            vx: Math.cos(r) * 460,
            vy: Math.sin(r) * 460,
            r: 4,
            dmg: 11,
            friendly: !0,
            life: 1.1,
          });
        }
    }
    nearestHostile(e, t, n) {
      let r = null,
        i = n;
      for (let n of this.fish) {
        let a = l(n.x - e, n.y - t);
        a < i && ((i = a), (r = n));
      }
      return (
        !r &&
          this.nest.hp > 0 &&
          l(this.nest.x - e, this.nest.y - t) < n &&
          (r = this.nest),
        r
      );
    }
    tryFree() {
      for (let e of this.holdouts)
        if (!e.freed && !(l(e.x - this.player.x, e.y - this.player.y) > 64)) {
          if (this.fish.some((t) => l(t.x - e.x, t.y - e.y) < 110)) return;
          ((e.freed = !0),
            (this.freedCount += 1),
            this.audio.pickup(),
            this.freedCount >= 3
              ? this.beginCutscene(`toBase`)
              : this.beginCutscene(`freed`));
          return;
        }
    }
    tryPlace(e, t) {
      if (this.mode !== `play` || this.phase !== `base` || !this.build) return;
      let n = o[this.build];
      if (
        this.scrap < n ||
        e < 50 ||
        t < 50 ||
        e > this.world.w - 50 ||
        t > this.world.h - 50 ||
        l(e - this.nest.x, t - this.nest.y) < 120
      )
        return;
      for (let n of this.structures) if (l(n.x - e, n.y - t) < 78) return;
      ((this.scrap -= n),
        this.structures.push({ kind: this.build, x: e, y: t, cool: 0 }),
        this.audio.pickup());
      let r = !this.sawFirstBuild;
      ((this.sawFirstBuild = !0), r && this.beginCutscene(`firstbuild`));
    }
    launchReady() {
      let e = this.structures.filter((e) => e.kind === `gen`).length,
        t = this.structures.filter((e) => e.kind === `turret`).length,
        n = this.structures.filter((e) => e.kind === `lab`).length;
      return e >= 1 && t >= 2 && n >= 1 && this.nest.hp <= 0;
    }
    tickShooter(e, t, n) {
      !this.bossOn && !this.jupiterPlayed && (this.scroll += 150 * e);
      let r = this.player.x,
        i = this.player.y;
      ((this.player.x = c(
        this.player.x + t.x * n * t.mag * e,
        this.scroll + 36,
        this.scroll + 400,
      )),
        (this.player.y = c(this.player.y + t.y * n * t.mag * e, 36, 504)),
        (this.vx = (this.player.x - r) / e),
        (this.vy = (this.player.y - i) / e),
        (this.speed = l(this.vx, this.vy)),
        t.mag > 0.1 && (this.lastYaw = Math.atan2(-t.x, -t.y)),
        (this.dir = 2));
      let a = this.held();
      if (
        (this.fireLatch || this.shotPulse || a.has(`Space`)) &&
        this.fireCd <= 0
      ) {
        this.fireCd = 0.18;
        let e = this.shipKit.spread ? [-0.16, 0, 0.16] : [0];
        for (let t of e)
          this.bullets.push({
            x: this.player.x + 28,
            y: this.player.y,
            vx: Math.cos(t) * 560,
            vy: Math.sin(t) * 560,
            r: 4,
            dmg: 10,
            friendly: !0,
            life: 1.3,
          });
        this.audio.shoot(!0);
      }
      if (
        ((this.shotPulse = !1),
        this.shipKit.drone &&
          ((this.droneCd -= e),
          this.droneCd <= 0 &&
            ((this.droneCd = 0.38),
            this.bullets.push({
              x: this.player.x + 10,
              y: this.player.y + Math.sin(this.time * 6) * 26,
              vx: 500,
              vy: 0,
              r: 3,
              dmg: 6,
              friendly: !0,
              life: 1.2,
            }))),
        !this.bossOn && this.scroll > 2600 && !this.jupiterPlayed)
      )
        ((this.jupiterPlayed = !0), this.beginCutscene(`jupiter`));
      else {
        if (!this.bossOn)
          ((this.spawnAcc += e),
            this.spawnAcc > 0.85 &&
              ((this.spawnAcc = 0),
              (this.spawnN += 1),
              this.fish.push({
                x: this.scroll + 960 + 40,
                y: 70 + ((this.spawnN * 97) % 400),
                hp: 16,
                facing: Math.PI,
                wps: [],
                wi: 0,
                aggro: !0,
              })));
        else {
          if (
            ((this.boss.t += e),
            (this.boss.x = this.scroll + 960 - 210),
            (this.boss.y = 270 + Math.sin(this.boss.t * 0.9) * 150),
            (this.boss.shot -= e),
            this.boss.shot <= 0)
          ) {
            this.boss.shot = this.boss.t > 6 ? 0.85 : 1.15;
            let e = this.boss.t > 6 ? [-0.16, 0, 0.16] : [0];
            for (let t of e) {
              let e =
                Math.atan2(
                  this.player.y - this.boss.y,
                  this.player.x - this.boss.x,
                ) + t;
              this.bullets.push({
                x: this.boss.x - 40,
                y: this.boss.y,
                vx: Math.cos(e) * 280,
                vy: Math.sin(e) * 280,
                r: 6,
                dmg: 10,
                friendly: !1,
                life: 4,
              });
            }
          }
          if (
            (l(this.boss.x - this.player.x, this.boss.y - this.player.y) < 86 &&
              this.hurtPlayer(18),
            this.boss.hp <= 0 && !this.winning)
          ) {
            ((this.winning = !0), this.beginCutscene(`victory`));
            return;
          }
        }
        for (let t of this.fish)
          ((t.x -= 150 * e),
            (t.y += Math.sin(this.time * 3 + t.x * 0.01) * 20 * e),
            (t.facing = Math.PI),
            l(t.x - this.player.x, t.y - this.player.y) < 28 &&
              ((t.hp = 0), this.hurtPlayer(16)));
        this.fish = this.fish.filter((e) => e.hp > 0 && e.x > this.scroll - 80);
        for (let e of this.pickups)
          l(e.x - this.player.x, e.y - this.player.y) < 30 &&
            (e.kind === `speed` && (this.shipKit.speed = !0),
            e.kind === `spread` && (this.shipKit.spread = !0),
            e.kind === `drone` && (this.shipKit.drone = !0),
            e.kind === `shield` && (this.shipKit.shield = !0),
            (e.x = -9999),
            this.audio.pickup());
        ((this.pickups = this.pickups.filter((e) => e.x > 0)),
          (this.world.w = this.scroll + 960 + 200),
          this.tickBullets(e));
      }
    }
    blocked(e, t, n) {
      for (let r of this.covers) if (d(e, t, n, r)) return !0;
      for (let r of this.structures)
        if (d(e, t, n, { x: r.x - 28, y: r.y - 28, w: 56, h: 56 })) return !0;
      return !1;
    }
    burst(e, t, n) {
      for (let r = 0; r < 6; r++) {
        let r = Math.random() * Math.PI * 2,
          i = 40 + Math.random() * 80;
        this.particles.push({
          x: e,
          y: t,
          vx: Math.cos(r) * i,
          vy: Math.sin(r) * i,
          life: 0.35,
          max: 0.35,
          color: n,
          s: 2 + Math.random() * 2,
        });
      }
      this.particles.length > 120 &&
        this.particles.splice(0, this.particles.length - 120);
    }
    stepParticles(e) {
      for (let t of this.particles)
        ((t.x += t.vx * e), (t.y += t.vy * e), (t.life -= e));
      this.particles = this.particles.filter((e) => e.life > 0);
    }
    counts() {
      return {
        gens: this.structures.filter((e) => e.kind === `gen`).length,
        turrets: this.structures.filter((e) => e.kind === `turret`).length,
        labs: this.structures.filter((e) => e.kind === `lab`).length,
      };
    }
    objective() {
      return this.phase === `stealth`
        ? `Reach the weapons cache. Stay out of the cones.`
        : this.phase === `rescue`
          ? `Free the holdouts (${this.freedCount}/3). Clear fish, then Use.`
          : this.phase === `base`
            ? this.nest.hp > 0
              ? `Gather scrap. Build power, two turrets, and a lab. Burn the nest.`
              : this.launchReady()
                ? `Launch is ready. Stand on the brass pad and press Use.`
                : `Nest is cold. Finish the generator, two turrets, and the lab.`
            : this.bossOn
              ? `Break the eye over Jupiter.`
              : `Fly east. Take the kits. Jupiter is ahead.`;
    }
    push(e, t = !1) {
      if (((this.hudAcc += e), !t && this.hudAcc < 0.12)) return;
      this.hudAcc = 0;
      let n = this.counts(),
        r = this.cut[this.beat];
      this.onSnap({
        mode: this.mode,
        phase: this.phase,
        hp: Math.max(0, Math.round(this.player.hp)),
        maxHp: this.player.maxHp,
        objective:
          this.mode === `play` || this.mode === `pause` ? this.objective() : ``,
        alert: this.alert > 0 && this.phase === `stealth`,
        scrap: this.scrap,
        gens: n.gens,
        turrets: n.turrets,
        labs: n.labs,
        nestHp: Math.max(0, Math.round(this.nest.hp)),
        nestMax: this.nest.max,
        freed: this.freedCount,
        caption: r?.caption ?? ``,
        bossHp: Math.max(0, Math.round(this.boss.hp)),
        bossMax: this.boss.max,
        canLaunch: this.phase === `base` && this.launchReady(),
        hasSave: this.readSave() != null,
        weapon:
          this.weapon === `laser`
            ? `Laser`
            : this.weapon === `ship`
              ? `Ship guns`
              : `Sidearm`,
        build: this.build,
        shield: this.shipKit.shield,
        spread: this.shipKit.spread,
        drone: this.shipKit.drone,
        speedKit: this.shipKit.speed,
        powered: n.gens > 0,
      });
    }
    loadCine() {
      this.cine = {};
      for (let e of [`dig`, `turn`, `swarm`, `fish`, `fight`, `close`]) {
        let t = new Image();
        ((t.src = `/space-fish/opening/${e}.jpg`), (this.cine[e] = t));
      }
      ((this.cineVid = null), (this.voiceEl = null));
    }
    playCine() {
      this.stopCine();
      if (this.cutId !== `intro` || this.mode !== `cutscene`) return;
      let e = this.cut[this.beat];
      if (!e) return;
      if (e.voice) {
        let t = new Audio(`/space-fish/opening/${e.voice}.mp3`);
        ((t.volume = 0.95), (this.voiceEl = t), t.play().catch(() => {}));
      }
      if (e.clip && !this.reduce) {
        let t = document.createElement(`video`);
        ((t.src = `/space-fish/opening/${e.clip}.mp4`),
          (t.muted = !0),
          t.setAttribute(`playsinline`, ``),
          (t.preload = `auto`),
          (this.cineVid = t),
          t.play().catch(() => {}));
      }
    }
    stopCine() {
      (this.voiceEl && (this.voiceEl.pause(), (this.voiceEl.src = ``)),
        (this.voiceEl = null),
        this.cineVid &&
          (this.cineVid.pause(),
          this.cineVid.removeAttribute(`src`),
          this.cineVid.load()),
        (this.cineVid = null));
    }
    loadArt() {
      let e = (e) => {
          let t = new Image();
          return ((t.crossOrigin = `anonymous`), (t.src = e), t);
        },
        t = (t, n) =>
          Array.from({ length: n }, (n, r) =>
            e(`/space-fish/sprites/${t}-${r + 1}.png`),
          );
      this.art = {
        astro: t(`astro`, 4),
        fishtd: t(`fishtd`, 4),
        fishside: t(`fishside`, 4),
        ship: t(`ship`, 4),
        prop: t(`prop`, 4),
        boss: t(`boss`, 1),
      };
    }
    frame(e, t = 8) {
      if (!e.length) return;
      let n = e[Math.floor(this.time * t) % e.length];
      if (n && n.complete && n.naturalWidth !== 0) return n;
    }
    sprite(e, t, n, r, i, a = 0) {
      let o = this.ctx;
      return !o || !e
        ? !1
        : (o.save(),
          o.translate(t, n),
          a && o.rotate(a),
          o.drawImage(e, -r / 2, -i / 2, r, i),
          o.restore(),
          !0);
    }
    draw() {
      let e = this.ctx,
        t = this.canvas;
      if (!e || !t) return;
      let { dpr: n, scale: r, ox: i, oy: a } = this.view;
      if (
        (e.setTransform(1, 0, 0, 1, 0, 0),
        (e.fillStyle = `#070b10`),
        e.fillRect(0, 0, t.width, t.height),
        e.setTransform(n * r, 0, 0, n * r, i * n, a * n),
        e.save(),
        e.beginPath(),
        e.rect(0, 0, 960, 540),
        e.clip(),
        !this.reduce &&
          this.shake > 0 &&
          e.translate(
            (Math.random() - 0.5) * this.shake * 12,
            (Math.random() - 0.5) * this.shake * 8,
          ),
        this.mode === `menu` || this.mode === `credits`)
      )
        this.drawMoonScene(0.15);
      else if (this.mode === `cutscene` || this.mode === `victory`) {
        let e = this.cut[this.beat];
        this.drawScene(
          e?.kind ?? (this.mode === `victory` ? `victory` : `wide`),
          e ? this.beatT / e.dur : 1,
        );
      } else this.phase === `shooter` ? this.drawShooter() : this.drawGround();
      e.restore();
    }
    drawGround() {
      let e = this.ctx;
      if (!e) return;
      (this.updateCam(),
        this.paintSky(),
        e.save(),
        e.translate(-this.camX, -this.camY),
        (e.fillStyle = this.phase === `rescue` ? `#12181e` : `#1a242c`),
        e.fillRect(0, 0, this.world.w, this.world.h),
        (e.strokeStyle = `rgba(232,239,233,0.05)`),
        (e.lineWidth = 1));
      for (let t = 0; t < this.world.w; t += 80)
        (e.beginPath(), e.moveTo(t, 0), e.lineTo(t, this.world.h), e.stroke());
      for (let t of this.covers)
        ((e.fillStyle = this.phase === `rescue` ? `#24303a` : `#2c3a44`),
          e.fillRect(t.x, t.y, t.w, t.h),
          (e.strokeStyle = `rgba(62,199,194,0.35)`),
          e.strokeRect(
            t.x + 4,
            t.y + 4,
            Math.max(0, t.w - 8),
            Math.max(0, t.h - 8),
          ));
      if (this.phase === `stealth`) {
        for (let e of this.fish) this.drawCone(e);
        ((e.fillStyle = `rgba(212,162,74,0.9)`),
          e.beginPath(),
          e.arc(this.cache.x, this.cache.y, 18, 0, Math.PI * 2),
          e.fill(),
          (e.fillStyle = `#e8efe9`),
          (e.font = `12px Sora, sans-serif`),
          e.fillText(`CACHE`, this.cache.x - 22, this.cache.y - 26));
      }
      if (this.phase === `base`) {
        ((e.strokeStyle = `#d4a24a`),
          (e.lineWidth = 2),
          e.beginPath(),
          e.arc(this.pad.x, this.pad.y, 36, 0, Math.PI * 2),
          e.stroke(),
          (e.fillStyle = `#e8efe9`),
          (e.font = `12px Sora, sans-serif`),
          e.fillText(`PAD`, this.pad.x - 14, this.pad.y - 44));
        for (let t of this.nodes)
          t.taken ||
            ((e.fillStyle = `#d4a24a`),
            e.beginPath(),
            e.arc(t.x, t.y, 10, 0, Math.PI * 2),
            e.fill());
        if (this.nest.hp > 0) {
          let t = this.art.prop[3];
          this.sprite(
            t && t.complete ? t : void 0,
            this.nest.x,
            this.nest.y,
            96,
            90,
          ) ||
            ((e.fillStyle = `#7a4ad4`),
            e.beginPath(),
            e.arc(this.nest.x, this.nest.y, this.nest.r, 0, Math.PI * 2),
            e.fill());
        }
        for (let t of this.structures) {
          let n = t.kind === `gen` ? 0 : t.kind === `turret` ? 1 : 2,
            r = this.art.prop[n];
          this.sprite(r && r.complete ? r : void 0, t.x, t.y, 72, 68) ||
            ((e.fillStyle = `#3ec7c2`), e.fillRect(t.x - 20, t.y - 20, 40, 40));
        }
        for (let e = 0; e < this.freedCount; e++) {
          let t = this.art.astro[0];
          this.sprite(
            t && t.complete ? t : void 0,
            this.pad.x - 70 + e * 28,
            this.pad.y + 50,
            28,
            42,
          );
        }
      }
      for (let t of this.holdouts) {
        if (t.freed) continue;
        let n = this.art.astro[0];
        (this.sprite(n && n.complete ? n : void 0, t.x, t.y, 36, 54),
          (e.strokeStyle = `#d4a24a`),
          e.strokeRect(t.x - 16, t.y - 30, 32, 8));
      }
      this.decoy &&
        ((e.fillStyle = `#d4a24a`),
        e.beginPath(),
        e.arc(this.decoy.x, this.decoy.y, 6, 0, Math.PI * 2),
        e.fill());
      let t = this.frame(this.art.fishtd);
      for (let n of this.fish)
        this.sprite(t, n.x, n.y, 64, 30, n.facing) ||
          ((e.fillStyle = `#7a4ad4`),
          e.beginPath(),
          e.ellipse(n.x, n.y, 22, 10, n.facing, 0, Math.PI * 2),
          e.fill());
      for (let t of this.bullets)
        ((e.fillStyle = t.friendly
          ? this.weapon === `laser`
            ? `#3ec7c2`
            : `#e8efe9`
          : `#7a4ad4`),
          e.beginPath(),
          e.arc(t.x, t.y, t.r, 0, Math.PI * 2),
          e.fill());
      let n = this.art.astro[this.dir];
      if (this.tap) this.drawTap(e);
      this.sprite(
        n && n.complete ? n : void 0,
        this.player.x,
        this.player.y,
        42,
        64,
      ) ||
        ((e.fillStyle = `#e8efe9`),
        e.fillRect(this.player.x - 8, this.player.y - 14, 16, 28));
      for (let t of this.particles)
        ((e.globalAlpha = Math.max(0, t.life / t.max)),
          (e.fillStyle = t.color),
          e.fillRect(t.x, t.y, t.s, t.s),
          (e.globalAlpha = 1));
      (e.restore(),
        this.drawArrow(),
        this.invuln > 0 &&
          ((e.fillStyle = `rgba(226,91,74,0.18)`), e.fillRect(0, 0, 960, 540)));
    }
    drawCone(e) {
      let t = this.ctx;
      t &&
        ((t.fillStyle =
          this.alert > 0 ? `rgba(226,91,74,0.16)` : `rgba(62,199,194,0.10)`),
        t.beginPath(),
        t.moveTo(e.x, e.y),
        t.arc(e.x, e.y, 236, e.facing - 0.62, e.facing + 0.62),
        t.closePath(),
        t.fill());
    }
    updateCam() {
      ((this.camX = c(this.player.x - 480, 0, Math.max(0, this.world.w - 960))),
        (this.camY = c(
          this.player.y - 270,
          0,
          Math.max(0, this.world.h - 540),
        )));
    }
    drawArrow() {
      let e = this.ctx;
      if (!e || this.mode !== `play`) return;
      let t = 0,
        n = 0;
      if (this.phase === `stealth`) ((t = this.cache.x), (n = this.cache.y));
      else if (this.phase === `rescue`) {
        let e = this.holdouts.find((e) => !e.freed);
        if (!e) return;
        ((t = e.x), (n = e.y));
      } else if (this.phase === `base`) {
        if (this.launchReady()) ((t = this.pad.x), (n = this.pad.y));
        else if (this.nest.hp > 0 && this.structures.length >= 3)
          ((t = this.nest.x), (n = this.nest.y));
        else {
          let e = this.nodes.find((e) => !e.taken);
          if (!e) return;
          ((t = e.x), (n = e.y));
        }
      } else return;
      let r = t - this.camX,
        i = n - this.camY;
      if (r > 24 && i > 24 && r < 936 && i < 516) return;
      let a = Math.atan2(i - 270, r - 480),
        o = 480 + Math.cos(a) * 200,
        s = 270 + Math.sin(a) * 120;
      (e.save(),
        e.translate(o, s),
        e.rotate(a),
        (e.fillStyle = `#d4a24a`),
        e.beginPath(),
        e.moveTo(12, 0),
        e.lineTo(-8, 7),
        e.lineTo(-8, -7),
        e.fill(),
        e.restore());
    }
    drawShooter() {
      let e = this.ctx;
      if (!e) return;
      ((this.camX = this.scroll),
        (this.camY = 0),
        this.paintSky(),
        e.save(),
        e.translate(-this.camX, 0));
      let t = this.frame(this.art.ship, 10);
      (this.drawTap(e),
        this.sprite(t, this.player.x, this.player.y, 84, 40) ||
        ((e.fillStyle = `#e8efe9`),
        e.fillRect(this.player.x - 20, this.player.y - 8, 40, 16)),
        this.shipKit.drone &&
          ((e.fillStyle = `#3ec7c2`),
          e.beginPath(),
          e.arc(
            this.player.x + 8,
            this.player.y + Math.sin(this.time * 6) * 26,
            5,
            0,
            Math.PI * 2,
          ),
          e.fill()));
      let n = this.frame(this.art.fishside);
      for (let t of this.fish)
        this.sprite(n, t.x, t.y, 78, 42) ||
          ((e.fillStyle = `#7a4ad4`),
          e.beginPath(),
          e.ellipse(t.x, t.y, 26, 12, 0, 0, Math.PI * 2),
          e.fill());
      if (this.bossOn && this.boss.hp > 0) {
        let t = this.art.boss[0];
        this.sprite(
          t && t.complete ? t : void 0,
          this.boss.x,
          this.boss.y,
          250,
          170,
        ) ||
          ((e.fillStyle = `#7a4ad4`),
          e.beginPath(),
          e.ellipse(this.boss.x, this.boss.y, 90, 50, 0, 0, Math.PI * 2),
          e.fill());
      }
      for (let t of this.pickups) {
        ((e.fillStyle = t.kind === `shield` ? `#d4a24a` : `#3ec7c2`),
          e.beginPath(),
          e.arc(t.x, t.y, 10, 0, Math.PI * 2),
          e.fill(),
          (e.fillStyle = `#06211f`),
          (e.font = `10px Oxanium, sans-serif`));
        let n =
          t.kind === `speed`
            ? `S`
            : t.kind === `spread`
              ? `M`
              : t.kind === `drone`
                ? `O`
                : `H`;
        e.fillText(n, t.x - 4, t.y + 3);
      }
      for (let t of this.bullets)
        ((e.fillStyle = t.friendly ? `#3ec7c2` : `#c084fc`),
          e.beginPath(),
          e.arc(t.x, t.y, t.r, 0, Math.PI * 2),
          e.fill());
      e.restore();
    }
    paintSky() {
      let e = this.ctx;
      if (e) {
        ((e.fillStyle = `#0c1218`), e.fillRect(0, 0, 960, 540));
        for (let t = 0; t < 48; t++) {
          let n = (((t * 137 + this.camX * 0.2) % 960) + 960) % 960,
            r = (t * 89) % 540;
          ((e.fillStyle = `rgba(232,239,233,0.75)`),
            e.fillRect(n, r, t % 5 == 0 ? 2 : 1, t % 5 == 0 ? 2 : 1));
        }
      }
    }
    drawMoonScene(e) {
      this.drawScene(`walk`, e);
    }
    drawScene(e, t) {
      if (e === `cine`) {
        this.drawCine(t);
        return;
      }
      let n = this.ctx;
      if (!n) return;
      ((this.camX = 0),
        this.paintSky(),
        (n.fillStyle = `#1a242c`),
        n.fillRect(0, 300, 960, 240),
        (n.fillStyle = `#24303a`),
        n.fillRect(80, 250, 220, 70),
        n.fillRect(340, 230, 160, 90),
        n.fillRect(540, 260, 200, 60));
      let r = this.art.astro[2],
        i = this.frame(this.art.fishtd, 8),
        a = this.frame(this.art.ship, 10),
        o = c(t, 0, 1);
      if (e === `walk`) {
        let e = 80 + o * 220;
        this.sprite(r && r.complete ? r : void 0, e, 340, 48, 72);
      } else if (e === `wide`) {
        n.fillStyle = `rgba(62,199,194,0.8)`;
        for (let e = 0; e < 5; e++) n.fillRect(120 + e * 140, 246, 10, 8);
      } else if (e === `swarm`) {
        for (let e = 0; e < 10; e++) {
          let t = 1e3 - o * 1040 + (e % 4) * 30,
            r = 80 + (e % 5) * 36;
          (this.sprite(i, t, r, 70, 32, Math.PI),
            i ||
              ((n.fillStyle = `#7a4ad4`),
              n.beginPath(),
              n.ellipse(t, r, 20, 8, 0, 0, Math.PI * 2),
              n.fill()));
        }
        o > 0.45 &&
          ((n.fillStyle = `rgba(226,91,74,0.35)`),
          n.beginPath(),
          n.arc(460, 270, (o - 0.45) * 180, 0, Math.PI * 2),
          n.fill());
      } else if (e === `watch`)
        (this.sprite(r && r.complete ? r : void 0, 120, 360, 52, 78),
          (n.fillStyle = `rgba(226,91,74,0.45)`),
          n.beginPath(),
          n.arc(620, 280, 30 + o * 40, 0, Math.PI * 2),
          n.fill());
      else if (e === `duel`) {
        this.sprite(r && r.complete ? r : void 0, 280, 340, 52, 78);
        let e = 620 - o * 180;
        (this.sprite(i, e, 330, 86, 40, Math.PI),
          o > 0.5 &&
            ((n.strokeStyle = `#e8efe9`),
            n.beginPath(),
            n.moveTo(310, 330),
            n.lineTo(e - 20, 330),
            n.stroke()));
      } else if (e === `line`)
        this.sprite(r && r.complete ? r : void 0, 480, 320, 70, 100);
      else if (e === `arm`)
        (this.sprite(r && r.complete ? r : void 0, 360, 330, 56, 84),
          (n.fillStyle = `#3ec7c2`),
          n.fillRect(400, 318, 36, 6),
          o > 0.35 &&
            ((n.strokeStyle = `#3ec7c2`),
            (n.lineWidth = 3),
            n.beginPath(),
            n.moveTo(430, 320),
            n.lineTo(640, 300 - o * 20),
            n.stroke()));
      else if (e === `rescue`) {
        let e = this.art.astro[0];
        (this.sprite(e && e.complete ? e : void 0, 400, 340, 48, 72),
          this.sprite(r && r.complete ? r : void 0, 460, 348 - o * 16, 48, 72));
      } else if (e === `rebuild` || e === `secured`) {
        let t = this.art.prop[0],
          n = this.art.prop[1];
        (this.sprite(t && t.complete ? t : void 0, 400, 320, 80, 74),
          (e === `secured` || o > 0.4) &&
            this.sprite(n && n.complete ? n : void 0, 520, 320, 76, 70));
      } else if (e === `launch`) {
        let e = 360 - o * 220;
        this.sprite(a, 480, e, 110, 52);
      } else if (e === `jupiter`) {
        let e = n.createRadialGradient(680, 260, 20, 680, 260, 150);
        (e.addColorStop(0, `#d4a24a`),
          e.addColorStop(1, `#8a4b22`),
          (n.fillStyle = e),
          n.beginPath(),
          n.arc(680, 260, 120, 0, Math.PI * 2),
          n.fill(),
          this.sprite(a, 180, 300, 90, 42));
        for (let e = 0; e < 6; e++)
          this.sprite(i, 480 + e * 28, 120 + (e % 3) * 40, 54, 26, Math.PI);
      } else
        e === `victory` &&
          (this.sprite(a, 300, 280, 100, 48),
          (n.globalAlpha = 0.45),
          this.sprite(this.art.boss[0], 680, 280, 200, 140),
          (n.globalAlpha = 1));
    }
    drawCine(e) {
      let t = this.ctx;
      if (!t) return;
      ((t.fillStyle = `#000`), t.fillRect(0, 0, 960, 540));
      let n = this.cut[this.beat],
        r =
          this.cineVid && this.cineVid.readyState >= 2
            ? this.cineVid
            : this.cine?.[n?.plate];
      if (r) {
        let n = r.videoWidth || r.naturalWidth,
          i = r.videoHeight || r.naturalHeight;
        if (n && i) {
          let r = 1 + (this.reduce ? 0 : e * 0.04),
            a = Math.max(960 / n, 540 / i) * r,
            o = n * a,
            s = i * a;
          t.drawImage(
            this.cineVid && this.cineVid.readyState >= 2
              ? this.cineVid
              : this.cine[this.cut[this.beat].plate],
            (960 - o) / 2,
            (540 - s) / 2 - (this.reduce ? 0 : (e - 0.5) * 10),
            o,
            s,
          );
        }
      }
      let i = t.createLinearGradient(0, 430, 0, 540);
      (i.addColorStop(0, `rgba(0,0,0,0)`),
        i.addColorStop(1, `rgba(0,0,0,0.62)`),
        (t.fillStyle = i),
        t.fillRect(0, 430, 960, 110));
    }
    bindInputs() {
      let e = (e) => {
          e.repeat ||
            (this.keys.add(e.code),
            [
              `Space`,
              `ArrowUp`,
              `ArrowDown`,
              `ArrowLeft`,
              `ArrowRight`,
            ].includes(e.code) && e.preventDefault(),
            this.mode === `cutscene` &&
              (e.code === `Space` || e.code === `Enter`) &&
              this.advanceBeat(),
            e.code === `Escape` && this.mode === `play`
              ? ((this.mode = `pause`), this.push(0, !0))
              : e.code === `Escape` && this.mode === `pause` && this.resume(),
            this.mode === `play` &&
              this.phase === `base` &&
              (e.code === `Digit1` && this.selectBuild(`gen`),
              e.code === `Digit2` && this.selectBuild(`turret`),
              e.code === `Digit3` && this.selectBuild(`lab`)));
        },
        t = (e) => this.keys.delete(e.code),
        n = () => this.keys.clear();
      (window.addEventListener(`keydown`, e),
        window.addEventListener(`keyup`, t),
        window.addEventListener(`blur`, n));
      let r = this.canvas,
        i = (e) => {
          let t = this.eventToWorld(e);
          t && ((this.aimX = t.x), (this.aimY = t.y), (this.aimOk = t.inside));
        },
        a = (e) => {
          let n = e.pointerType === `touch` || e.pointerType === `pen`;
          if (n) e.preventDefault();
          let t = this.eventToWorld(e);
          if (!t?.inside) return;
          if (
            n &&
            this.mode === `play` &&
            !(this.phase === `base` && this.build)
          ) {
            this.tap = { x: t.x, y: t.y };
            return;
          }
          this.mode === `play` && this.phase === `base` && this.build
            ? this.tryPlace(t.x, t.y)
            : this.mode === `play` && (this.shotPulse = !0);
        };
      (r?.addEventListener(`pointermove`, i),
        r?.addEventListener(`pointerdown`, a, { passive: !1 }));
      let o = () => this.resize();
      window.addEventListener(`resize`, o);
      let s = new ResizeObserver(() => this.resize());
      (r && s.observe(r),
        this.unbind.push(() => {
          (window.removeEventListener(`keydown`, e),
            window.removeEventListener(`keyup`, t),
            window.removeEventListener(`blur`, n),
            r?.removeEventListener(`pointermove`, i),
            r?.removeEventListener(`pointerdown`, a),
            window.removeEventListener(`resize`, o),
            s.disconnect());
        }));
    }
    drawTap(e) {
      if (!this.tap) return;
      ((e.strokeStyle = `#3ec7c2`),
        (e.globalAlpha = 0.9),
        (e.lineWidth = 2),
        e.setLineDash([6, 5]),
        e.beginPath(),
        e.moveTo(this.player.x, this.player.y),
        e.lineTo(this.tap.x, this.tap.y),
        e.stroke(),
        e.setLineDash([]),
        e.beginPath(),
        e.arc(this.tap.x, this.tap.y, 8, 0, Math.PI * 2),
        e.stroke(),
        (e.globalAlpha = 1),
        (e.lineWidth = 1));
    }
    eventToWorld(e) {
      let t = this.canvas;
      if (!t) return null;
      let n = t.getBoundingClientRect(),
        r = (e.clientX - n.left - this.view.ox) / this.view.scale,
        i = (e.clientY - n.top - this.view.oy) / this.view.scale;
      return {
        x: r + this.camX,
        y: i + this.camY,
        inside: r >= 0 && i >= 0 && r <= 960 && i <= 540,
      };
    }
  },
  m = n();
function stickOut(e, t, n) {
  let r = Math.hypot(e, t),
    i = r ? e / r : 0,
    a = r ? t / r : 0,
    o = Math.max(10, n - 30),
    s = Math.min(o, r),
    c = n > 0 ? Math.min(1, r / n) : 0,
    l = 0.18,
    u = 0,
    d = 0;
  if (c > l) {
    let e = Math.min(1, (c - l) / (1 - l));
    ((u = i * e), (d = a * e));
  }
  return { x: u, y: d, vx: i * s, vy: a * s };
}
function h() {
  let e = (0, r.useRef)(null),
    t = (0, r.useRef)(null),
    n = (0, r.useRef)(null),
    i = (0, r.useRef)(null),
    [a, o] = (0, r.useState)(() => f()),
    [s, c] = (0, r.useState)(!1),
    [knob, setKnob] = (0, r.useState)({ x: 0, y: 0 }),
    [touchUi, setTouchUi] = (0, r.useState)(!1),
    [portrait, setPortrait] = (0, r.useState)(!1),
    [anyway, setAnyway] = (0, r.useState)(!1);
  (0, r.useEffect)(() => {
    let e = () => {
      let t = window.matchMedia?.(`(pointer: coarse)`).matches,
        n = window.matchMedia?.(`(hover: none)`).matches,
        r = Math.min(window.innerWidth, window.innerHeight);
      (setTouchUi(!!(t || n || r <= 520)),
        setPortrait(window.innerHeight > window.innerWidth + 40));
    },
      z = () => {
        ((i.current = null), setKnob({ x: 0, y: 0 }), t.current?.setStick(0, 0));
      };
    return (
      e(),
      window.addEventListener(`resize`, e),
      window.addEventListener(`orientationchange`, e),
      window.addEventListener(`blur`, z),
      () => {
        (window.removeEventListener(`resize`, e),
          window.removeEventListener(`orientationchange`, e),
          window.removeEventListener(`blur`, z));
      }
    );
  }, []);
  (0, r.useEffect)(() => {
    let v = document.querySelector('meta[name="viewport"]');
    if (v) v.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover');
    let n = e.current;
    if (!n) return;
    let r = new p(o);
    return (
      (t.current = r),
      r.attach(n),
      r.startLoop(),
      c(!0),
      () => {
        (r.detach(), (t.current = null));
      }
    );
  }, []);
  let l = a.mode === `play` || a.mode === `pause`,
    u = (e) => {
      if (i.current !== e.pointerId || !n.current) return;
      e.preventDefault();
      let r = n.current.getBoundingClientRect(),
        a = e.clientX - (r.left + r.width / 2),
        o = e.clientY - (r.top + r.height / 2),
        s = stickOut(a, o, r.width / 2);
      (setKnob({ x: s.vx, y: s.vy }), t.current?.setStick(s.x, s.y, !0));
    },
    releaseStick = (e) => {
      if (i.current !== e.pointerId) return;
      ((i.current = null), setKnob({ x: 0, y: 0 }), t.current?.setStick(0, 0));
    },
    showTouch = touchUi && (!portrait || anyway);
  return (0, m.jsxs)(`main`, {
    className: `relative flex h-dvh flex-col bg-bg text-fg`,
    children: [
      (0, m.jsxs)(`div`, {
        className: `relative min-h-0 flex-1`,
        children: [
          (0, m.jsx)(`canvas`, {
            ref: e,
            className: `absolute inset-0 h-full w-full touch-none`,
          }),
          (0, m.jsxs)(`div`, {
            className: `pointer-events-none absolute inset-0 flex flex-col`,
            children: [
              l &&
                (0, m.jsxs)(`header`, {
                  className: `flex items-start justify-between gap-3 p-3 sm:p-4`,
                  children: [
                    (0, m.jsxs)(`div`, {
                      className: `max-w-xl rounded-lg border border-border bg-surface/90 px-3 py-2 backdrop-blur-sm`,
                      children: [
                        (0, m.jsxs)(`div`, {
                          className: `flex items-center gap-3`,
                          children: [
                            (0, m.jsx)(`p`, {
                              className: `font-display text-sm font-bold tracking-wide text-primary`,
                              children:
                                a.phase === `stealth`
                                  ? `Rim`
                                  : a.phase === `rescue`
                                    ? `Holdouts`
                                    : a.phase === `base`
                                      ? `Pad`
                                      : `Transit`,
                            }),
                            (0, m.jsx)(`p`, {
                              className: `text-xs text-muted`,
                              children: a.weapon,
                            }),
                            a.alert &&
                              (0, m.jsx)(`p`, {
                                className: `text-xs font-bold text-danger`,
                                children: `Spotted`,
                              }),
                          ],
                        }),
                        (0, m.jsx)(`div`, {
                          className: `mt-2 h-2 w-40 overflow-hidden rounded-full bg-border sm:w-56`,
                          children: (0, m.jsx)(`div`, {
                            className: `h-full bg-danger`,
                            style: { width: `${(a.hp / a.maxHp) * 100}%` },
                          }),
                        }),
                        (0, m.jsx)(`p`, {
                          className: `mt-2 text-sm leading-snug`,
                          children: a.objective,
                        }),
                        showTouch &&
                          (0, m.jsx)(`p`, {
                            className: `mt-1 text-xs text-muted`,
                            children: `Stick or tap the ground to walk.`,
                          }),
                      ],
                    }),
                    a.phase === `base` &&
                      (0, m.jsxs)(`div`, {
                        className: `rounded-lg border border-border bg-surface/90 px-3 py-2 text-sm backdrop-blur-sm`,
                        children: [
                          (0, m.jsxs)(`p`, { children: [`Scrap `, a.scrap] }),
                          (0, m.jsxs)(`p`, {
                            className: `text-muted`,
                            children: [
                              `Power `,
                              a.gens,
                              ` · Turrets `,
                              a.turrets,
                              `/2 · Lab `,
                              a.labs,
                            ],
                          }),
                          (0, m.jsx)(`p`, {
                            className: `text-muted`,
                            children: a.powered ? `Grid live` : `No power`,
                          }),
                          a.nestHp > 0 &&
                            (0, m.jsxs)(`p`, {
                              className: `text-brass`,
                              children: [`Nest `, a.nestHp],
                            }),
                        ],
                      }),
                    a.phase === `shooter` &&
                      (0, m.jsxs)(`div`, {
                        className: `rounded-lg border border-border bg-surface/90 px-3 py-2 text-sm backdrop-blur-sm`,
                        children: [
                          (0, m.jsx)(`p`, {
                            className: `text-muted`,
                            children:
                              [
                                a.speedKit && `Speed`,
                                a.spread && `Spread`,
                                a.drone && `Drone`,
                                a.shield && `Shield`,
                              ]
                                .filter(Boolean)
                                .join(` · `) || `Kits ahead`,
                          }),
                          a.phase === `shooter` &&
                            a.bossHp > 0 &&
                            (0, m.jsx)(`div`, {
                              className: `mt-2 h-2 w-36 overflow-hidden rounded-full bg-border`,
                              children: (0, m.jsx)(`div`, {
                                className: `h-full bg-primary`,
                                style: {
                                  width: `${(a.bossHp / a.bossMax) * 100}%`,
                                },
                              }),
                            }),
                        ],
                      }),
                  ],
                }),
              (0, m.jsx)(`div`, { className: `flex-1` }),
              a.mode === `cutscene` &&
                (0, m.jsxs)(`div`, {
                  className: `pointer-events-auto m-3 flex items-end justify-between gap-3 sm:m-4`,
                  children: [
                    (0, m.jsx)(`p`, {
                      className: `max-w-xl rounded-lg border border-border bg-surface/95 px-4 py-3 font-display text-lg leading-snug`,
                      children: a.caption,
                    }),
                    (0, m.jsx)(`button`, {
                      type: `button`,
                      className: `rounded-lg bg-primary px-4 py-3 font-display text-sm font-bold text-on-primary`,
                      onClick: () => t.current?.skipCutscene(),
                      children: `Skip`,
                    }),
                  ],
                }),
              a.mode === `menu` &&
                (0, m.jsxs)(g, {
                  children: [
                    (0, m.jsx)(`p`, {
                      className: `font-display text-xs tracking-widest text-primary`,
                      children: `MOON RIM`,
                    }),
                    (0, m.jsx)(`h1`, {
                      className: `font-display text-4xl font-bold sm:text-5xl`,
                      children: `Spacefish`,
                    }),
                    (0, m.jsx)(`p`, {
                      className: `max-w-md text-sm leading-relaxed text-muted`,
                      children: `A quiet walk on the rim, then the swarm. Sneak to the laser cache, pull the holdouts out, rebuild the pad, and fly the invasion back to Jupiter.`,
                    }),
                    (0, m.jsxs)(`div`, {
                      className: `flex flex-wrap gap-2`,
                      children: [
                        (0, m.jsx)(`button`, {
                          type: `button`,
                          disabled: !s,
                          className: `rounded-lg bg-primary px-5 py-3 font-display font-bold text-on-primary disabled:opacity-50`,
                          onClick: () => t.current?.startNew(),
                          children: `Start`,
                        }),
                        a.hasSave &&
                          (0, m.jsx)(`button`, {
                            type: `button`,
                            className: `rounded-lg border border-border bg-bg px-5 py-3 font-display font-bold`,
                            onClick: () => t.current?.continueGame(),
                            children: `Continue`,
                          }),
                        (0, m.jsx)(`button`, {
                          type: `button`,
                          className: `rounded-lg border border-border px-5 py-3 font-display font-bold`,
                          onClick: () => t.current?.openCredits(),
                          children: `Credits`,
                        }),
                      ],
                    }),
                    (0, m.jsx)(`p`, {
                      className: `text-xs leading-relaxed text-muted`,
                      children: `WASD moves. Shift sneaks. Space fires. Q throws noise. E uses. Space also steps a scene forward. Esc pauses. On a phone, turn sideways: drag the stick, or tap the ground to walk.`,
                    }),
                  ],
                }),
              a.mode === `credits` &&
                (0, m.jsxs)(g, {
                  children: [
                    (0, m.jsx)(`h1`, {
                      className: `font-display text-3xl font-bold`,
                      children: `Credits`,
                    }),
                    (0, m.jsx)(`p`, {
                      className: `max-w-md text-sm leading-relaxed text-muted`,
                      children: `Spacefish is a three-phase run: stealth on the lunar rim, a short rescue, a small base, then a flight to Jupiter. The crew, the fish, and the ship are painted sprites. Sound is synthesized here when you press Start.`,
                    }),
                    (0, m.jsx)(`button`, {
                      type: `button`,
                      className: `rounded-lg bg-primary px-5 py-3 font-display font-bold text-on-primary`,
                      onClick: () => t.current?.backToMenu(),
                      children: `Back`,
                    }),
                  ],
                }),
              a.mode === `pause` &&
                (0, m.jsxs)(g, {
                  children: [
                    (0, m.jsx)(`h1`, {
                      className: `font-display text-3xl font-bold`,
                      children: `Paused`,
                    }),
                    (0, m.jsxs)(`div`, {
                      className: `flex gap-2`,
                      children: [
                        (0, m.jsx)(`button`, {
                          type: `button`,
                          className: `rounded-lg bg-primary px-5 py-3 font-display font-bold text-on-primary`,
                          onClick: () => t.current?.resume(),
                          children: `Resume`,
                        }),
                        (0, m.jsx)(`button`, {
                          type: `button`,
                          className: `rounded-lg border border-border px-5 py-3 font-display font-bold`,
                          onClick: () => t.current?.backToMenu(),
                          children: `Menu`,
                        }),
                      ],
                    }),
                  ],
                }),
              a.mode === `dead` &&
                (0, m.jsxs)(g, {
                  children: [
                    (0, m.jsx)(`h1`, {
                      className: `font-display text-3xl font-bold`,
                      children: `The swarm takes you`,
                    }),
                    (0, m.jsx)(`p`, {
                      className: `text-sm text-muted`,
                      children: `This phase starts over. Earlier phases stay saved.`,
                    }),
                    (0, m.jsxs)(`div`, {
                      className: `flex gap-2`,
                      children: [
                        (0, m.jsx)(`button`, {
                          type: `button`,
                          className: `rounded-lg bg-primary px-5 py-3 font-display font-bold text-on-primary`,
                          onClick: () => t.current?.retry(),
                          children: `Retry`,
                        }),
                        (0, m.jsx)(`button`, {
                          type: `button`,
                          className: `rounded-lg border border-border px-5 py-3 font-display font-bold`,
                          onClick: () => t.current?.backToMenu(),
                          children: `Menu`,
                        }),
                      ],
                    }),
                  ],
                }),
              a.mode === `victory` &&
                (0, m.jsxs)(g, {
                  children: [
                    (0, m.jsx)(`p`, {
                      className: `font-display text-xs tracking-widest text-primary`,
                      children: `JUPITER`,
                    }),
                    (0, m.jsx)(`h1`, {
                      className: `font-display text-4xl font-bold`,
                      children: `The eye breaks`,
                    }),
                    (0, m.jsx)(`p`, {
                      className: `max-w-md text-sm text-muted`,
                      children: `The rim can breathe. The holdouts have a base. The center of the swarm is dark.`,
                    }),
                    (0, m.jsxs)(`div`, {
                      className: `flex flex-wrap gap-2`,
                      children: [
                        (0, m.jsx)(`button`, {
                          type: `button`,
                          className: `rounded-lg bg-primary px-5 py-3 font-display font-bold text-on-primary`,
                          onClick: () => t.current?.startPhase(`shooter`),
                          children: `Fly it again`,
                        }),
                        (0, m.jsx)(`button`, {
                          type: `button`,
                          className: `rounded-lg border border-border px-5 py-3 font-display font-bold`,
                          onClick: () => t.current?.backToMenu(),
                          children: `Menu`,
                        }),
                      ],
                    }),
                  ],
                }),
            ],
          }),
        ],
      }),
      l &&
        a.phase === `base` &&
        (0, m.jsxs)(`div`, {
          className: `flex gap-2 overflow-x-auto border-t border-border bg-surface px-3 py-2`,
          children: [
            [`gen`, `turret`, `lab`].map((e) =>
              (0, m.jsx)(
                v,
                { kind: e, snap: a, onPick: (e) => t.current?.selectBuild(e) },
                e,
              ),
            ),
            (0, m.jsx)(`button`, {
              type: `button`,
              className: `shrink-0 rounded-lg border border-brass px-3 py-2 text-sm font-bold text-brass`,
              onClick: () => t.current?.dropBuild(),
              children: `Place ahead`,
            }),
          ],
        }),
      a.mode === `play` &&
        showTouch &&
        (0, m.jsxs)(`div`, {
          className: `pointer-events-none absolute inset-0`,
          style: { zIndex: 30 },
          children: [
            (0, m.jsx)(`div`, {
              ref: n,
              className: `pointer-events-auto absolute`,
              style: {
                left: `max(12px, env(safe-area-inset-left))`,
                bottom:
                  a.phase === `base`
                    ? `calc(76px + env(safe-area-inset-bottom))`
                    : `max(12px, env(safe-area-inset-bottom))`,
                width: 148,
                height: 148,
                borderRadius: 999,
                border: `2px solid rgba(232,239,233,0.4)`,
                background: `rgba(12,18,24,0.55)`,
                touchAction: `none`,
              },
              onPointerDown: (e) => {
                (e.preventDefault(),
                  e.stopPropagation(),
                  (i.current = e.pointerId),
                  u(e));
                try {
                  e.currentTarget.setPointerCapture(e.pointerId);
                } catch {}
              },
              onPointerMove: u,
              onPointerUp: releaseStick,
              onPointerCancel: releaseStick,
              children: (0, m.jsx)(`span`, {
                className: `pointer-events-none absolute top-1/2 left-1/2 rounded-full bg-primary`,
                style: {
                  width: 56,
                  height: 56,
                  transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))`,
                },
              }),
            }),
            (0, m.jsxs)(`div`, {
              className: `pointer-events-auto absolute grid grid-cols-2 gap-2`,
              style: {
                right: `max(12px, env(safe-area-inset-right))`,
                bottom:
                  a.phase === `base`
                    ? `calc(76px + env(safe-area-inset-bottom))`
                    : `max(12px, env(safe-area-inset-bottom))`,
                width: 176,
              },
              children: [
                a.phase === `stealth` &&
                  (0, m.jsx)(y, {
                    onPress: () => t.current?.toggleSneak(),
                    children: `Sneak`,
                  }),
                a.phase === `stealth` &&
                  (0, m.jsx)(y, {
                    onPress: () => t.current?.pulseNoise(),
                    children: `Noise`,
                  }),
                (0, m.jsx)(y, {
                  hold: !0,
                  onHold: (e) => t.current?.setFire(e),
                  children: `Fire`,
                }),
                (0, m.jsx)(y, {
                  onPress: () => t.current?.pulseUse(),
                  children: `Use`,
                }),
              ],
            }),
          ],
        }),
      touchUi &&
        portrait &&
        !anyway &&
        (0, m.jsxs)(`div`, {
          className: `absolute inset-0 flex flex-col items-center justify-center gap-4 px-8 text-center`,
          style: {
            background: `#0c1218`,
            zIndex: 40,
            padding: `24px`,
          },
          children: [
            (0, m.jsx)(`p`, {
              className: `font-display text-xs tracking-widest text-primary`,
              children: `SPACEFISH`,
            }),
            (0, m.jsx)(`h1`, {
              className: `font-display text-3xl font-bold`,
              children: `Rotate your phone for the best experience`,
            }),
            (0, m.jsx)(`p`, {
              className: `max-w-xs text-sm text-muted`,
              children: `The rim is wider than it is tall. Turn sideways, then use the stick or tap the ground to walk.`,
            }),
            (0, m.jsx)(`button`, {
              type: `button`,
              className: `rounded-lg border border-border px-5 py-3 font-display font-bold`,
              onClick: () => setAnyway(!0),
              children: `Play anyway`,
            }),
          ],
        }),
    ],
  });
}
function g({ children: e }) {
  return (0, m.jsx)(`div`, {
    className: `pointer-events-none flex flex-1 items-end p-3 sm:items-center sm:justify-center sm:p-6`,
    children: (0, m.jsx)(`div`, {
      className: `pointer-events-auto flex w-full max-w-lg flex-col gap-3 rounded-xl border border-border bg-surface/95 p-5 backdrop-blur-sm`,
      children: e,
    }),
  });
}
var _ = { gen: `Generator`, turret: `Turret`, lab: `Lab` };
function v({ kind: e, snap: t, onPick: n }) {
  let r = t.build === e;
  return (0, m.jsxs)(`button`, {
    type: `button`,
    className: `shrink-0 rounded-lg border px-3 py-2 text-sm font-bold ${r ? `border-primary bg-primary text-on-primary` : `border-border bg-bg`}`,
    onClick: () => n(e),
    children: [_[e], ` `, o[e]],
  });
}
function y({ children: e, onPress: t, hold: n, onHold: r }) {
  return (0, m.jsx)(`button`, {
    type: `button`,
    className: `font-display font-bold`,
    style: {
      minHeight: 64,
      borderRadius: 14,
      border: `1px solid rgba(232,239,233,0.28)`,
      background: `rgba(18,26,34,0.92)`,
      color: `#e8efe9`,
      fontSize: 16,
      touchAction: `none`,
      userSelect: `none`,
    },
    onPointerDown: (e) => {
      (e.preventDefault(),
        e.currentTarget.setPointerCapture(e.pointerId),
        n && r?.(!0));
    },
    onPointerUp: () => {
      n ? r?.(!1) : t?.();
    },
    onPointerCancel: () => {
      n && r?.(!1);
    },
    children: e,
  });
}
function b() {
  return (0, m.jsx)(h, {});
}
export { b as component };
