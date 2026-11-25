import type { Game } from "../game/Game";
import { INTRO_LOAD } from "../content/introLoad";
import { CUTSCENES } from "../content/cutscenes";

// F-05 Slow 4G dark intro (WP spec = PERF.md WP-01, WP answers Nov 18 06:08 PT):
//  1. Each intro beat waits for its plate: the beat's timer and voice-over don't start
//     until that plate has decoded (img.decode()), so the intro never auto-advances over
//     the dark placeholder. Skip and Space/Enter stepping still work, also during retries.
//  2. A failed plate never holds forever: it is retried after ~1 s, then ~3 s. If it still
//     hasn't decoded, or 12 s after its beat was due (whichever comes first), the beat runs
//     (caption + VO) over a dimmed palette gradient, with no loading bar, and the log
//     records plateFailed.
//  3. Load order: the menu art (only what the menu paints, <= ~200 KB) with the menu
//     shell; then the beat-1 plate and the opening VO on the title; then the title art
//     moved past plate 1 and the one loop the intro plays; then, from Start, plates 2-6
//     one at a time in beat order; then the other music loops with the Ch1 art; then the
//     rest of the gameplay art. A chapter start (Skip, Continue, ?phase=, ?qa=1) releases
//     everything at once.
//  4. While a beat waits, the HUD snapshot carries `loading`, so the shell can show
//     "Loading…" and VP's bar after 300 ms of waiting.
// The timestamped beat log (window.__controlsTest.beatLog()) lets QA/WP check that no beat
// starts or speaks before its plate decoded, and compare ch1-complete with rim-start.

type Entry = { img: any; src: string };

function ensure(g: Game) {
  if (!g.intro) {
    let open: () => void = () => {};
    let gate = new Promise<void>((r) => (open = r));
    g.intro = {
      plates: {},
      order: [],
      requested: {},
      settled: {},
      ready: {},
      failed: {},
      tries: {},
      retryAt: {},
      dueAt: {},
      art: [] as Entry[],
      menuStarted: false,
      menuLeft: 0,
      afterOneStarted: false,
      artStarted: false,
      prefetched: false,
      started: false,
      waitBeat: -1,
      // the intro loop's fetch waits for the beat-1 plate + opening VO (WP 4)
      gate,
      openGate: open,
      gateOpen: false,
      voReady: false,
      loopDone: false,
      log: [],
    };
  }
  return g.intro;
}
/** "rim.miner.2" -> this.rim.miner[2] */
function at(g: Game, path: string) {
  let v: any = g;
  for (let k of path.split(".")) {
    v = v?.[k];
  }
  return v;
}
/** load/error for a plain image; FakeImage-style objects that are already complete count at once */
function whenSettled(img: any, cb: () => void) {
  if (img.complete && img.naturalWidth) {
    cb();
    return;
  }
  let once = false;
  let f = () => {
    if (!once) {
      once = true;
      cb();
    }
  };
  img.onload = f;
  img.onerror = f;
}
/** wall clock for the beat log (QA compares it with the network panel) */
const now = () => performance.now();
/** game clock (ms) for retries and the 12 s cap: it stands still while paused or hidden */
const clock = (g: Game) => g.time * 1000;

export const introLoadMethods = {
  /** loader.ts: hold an image's fetch until its turn. Returns true when queued. */
  queueArt(this: Game, img, src) {
    ensure(this).art.push({ img, src });
    return true;
  },
  /** cine.ts: hold an intro plate's fetch until its turn. Returns true when queued. */
  queuePlate(this: Game, name, img) {
    let it = ensure(this);
    it.plates[name] = img;
    it.order.push(name);
    // beat order of the intro script (loadCine already creates them in that order)
    let beat = (n) => CUTSCENES.intro.findIndex((b) => b.plate === n);
    it.order.sort((a, b) => beat(a) - beat(b));
    // WP 4: music waits its turn. The loop a track plays is fetched once the gate opens;
    // the rest of its decode group once plates 2-6 are in (releaseArt).
    this.audio.musicGate = it.gate;
    this.audio.groupHeld = true;
    return true;
  },
  /** true while the current intro beat's plate hasn't decoded (nor failed): its timer and VO wait. */
  holdBeat(this: Game) {
    let it = this.intro;
    if (!it) {
      return false;
    }
    this.introPump(); // retries and the 12 s cap tick on in every cutscene frame
    if (this.cutId !== "intro") {
      return false;
    }
    let name = this.cut[this.beat]?.plate;
    if (!name || !it.plates[name] || it.ready[name] || it.failed[name]) {
      return false;
    }
    if (it.dueAt[name] == null) {
      it.dueAt[name] = clock(this);
    }
    this.requestPlate(name); // stepped ahead of the chain: ask for this plate now
    return true;
  },
  /** Extra HUD fields while a beat waits for its plate (none otherwise, nor once it failed). */
  introSnap(this: Game) {
    let it = this.intro;
    if (!it || this.mode !== "cutscene" || this.cutId !== "intro") {
      return false;
    }
    let name = this.cut[this.beat]?.plate;
    if (!name || !it.plates[name] || it.ready[name] || it.failed[name]) {
      return false;
    }
    return {
      loading: true,
      platesReady: it.order.filter((n) => it.ready[n]).length,
      platesTotal: it.order.length,
    };
  },
  /** Called from Game.tick on the title: after the menu art, fetch the beat-1 plate + VO. */
  introPrefetch(this: Game) {
    let it = this.intro;
    if (!it) {
      return false;
    }
    this.introPump();
    if (!it.menuStarted) {
      it.menuStarted = true;
      let menu = INTRO_LOAD.menuArt.map((p) => at(this, p)).filter(Boolean);
      let items = it.art.filter((e) => menu.includes(e.img));
      it.art = it.art.filter((e) => !menu.includes(e.img));
      it.menuLeft = items.length;
      this.logBeat("menu-art");
      for (let e of items) {
        e.img.src = e.src;
        whenSettled(e.img, () => {
          it.menuLeft -= 1;
        });
      }
    }
    if (it.menuLeft > 0 || it.prefetched) {
      return true;
    }
    this.prefetchBeatOne();
    return true;
  },
  prefetchBeatOne(this: Game) {
    let it = this.intro;
    if (!it || it.prefetched || !it.order.length) {
      return;
    }
    it.prefetched = true;
    this.logBeat("prefetch");
    this.requestPlate(it.order[0]);
    let first = CUTSCENES.intro.find((b) => b.plate === it.order[0])?.voice;
    if (first) {
      // F-07 decodes VO on the Web Audio bus; on the title only its bytes are fetched
      this.audio.prefetch(`opening/${first}.mp3`).then(() => {
        it.voReady = true;
        this.introGate();
      });
    } else {
      it.voReady = true;
    }
  },
  /** WP 4: the beat-1 plate and the opening VO are in: the title art and the intro loop go next. */
  introGate(this: Game) {
    let it = this.intro;
    let one = it?.order[0];
    if (!it || it.gateOpen || !it.voReady || !one || !it.settled[one]) {
      return;
    }
    it.gateOpen = true;
    this.afterPlateOne();
    this.logBeat("music-intro");
    it.openGate();
    // plates 2-6 follow the intro loop (if a loop is playing yet)
    let want = this.audio.want;
    let done = () => {
      it.loopDone = true;
      this.nextPlate();
    };
    if (want) {
      this.audio.prefetch(`music/${want}.mp3`).then(done);
    } else {
      done();
    }
  },
  /** WP 2: title art over ~200 KB (or unpainted) is fetched right after plate 1. */
  afterPlateOne(this: Game) {
    let it = this.intro;
    if (!it || it.afterOneStarted) {
      return;
    }
    it.afterOneStarted = true;
    let late = INTRO_LOAD.afterPlateOne.map((p) => at(this, p)).filter(Boolean);
    let items = it.art.filter((e) => late.includes(e.img));
    if (items.length) {
      this.logBeat("title-art");
    }
    for (let e of items) {
      if (!e.img.src) {
        e.img.src = e.src;
      }
    }
  },
  /** cutscene.ts beginCutscene("intro"), i.e. the Start tap: beat 1 now, then plates 2-6 in order. */
  introStart(this: Game) {
    let it = this.intro;
    if (!it) {
      return;
    }
    it.started = true;
    it.waitBeat = -1; // a replay never inherits a wait from an earlier, skipped intro
    this.logBeat("start");
    this.prefetchBeatOne();
    this.introGate();
    this.nextPlate();
  },
  /** Sequential chain: one plate in flight at a time, in beat order, after the intro loop. */
  nextPlate(this: Game) {
    let it = this.intro;
    if (!it || !it.started || it.artStarted) {
      return;
    }
    let first = it.order[0];
    if (first && !it.requested[first]) {
      this.requestPlate(first);
      return;
    }
    if (!it.loopDone) {
      return;
    }
    if (it.order.some((n) => it.requested[n] && !it.settled[n])) {
      return;
    }
    let next = it.order.find((n) => !it.requested[n]);
    if (next) {
      this.requestPlate(next);
    }
  },
  requestPlate(this: Game, name) {
    let it = this.intro;
    let img = it?.plates[name];
    if (!img || it.requested[name]) {
      return;
    }
    it.requested[name] = true;
    this.logBeat("plate-request", name);
    this.tryPlate(name);
  },
  /** One fetch + decode attempt (the first, or a retry). */
  tryPlate(this: Game, name) {
    let it = this.intro;
    let img = it.plates[name];
    let attempt = (it.tries[name] = (it.tries[name] || 0) + 1);
    // setting src again re-runs the fetch (HTML "update the image data")
    img.src = `opening/${name}.jpg`;
    let done = (ok) => {
      if (it.settled[name] || it.tries[name] !== attempt) {
        return;
      }
      if (ok) {
        this.settlePlate(name, true);
        return;
      }
      let wait = INTRO_LOAD.retryMs[attempt - 1];
      if (wait == null) {
        this.failPlate(name, "retries");
        return;
      }
      it.retryAt[name] = clock(this) + wait;
      this.logBeat("plate-retry", name);
    };
    if (typeof img.decode === "function") {
      img.decode().then(
        () => done(true),
        () => done(!!(img.complete && img.naturalWidth)),
      );
    } else if (img.complete && img.naturalWidth) {
      done(true);
    } else {
      img.onload = () => done(true);
      img.onerror = () => done(false);
    }
  },
  /** Game.tick (title and cutscenes): due retries, and the 12 s cap on a waiting beat. */
  introPump(this: Game) {
    let it = this.intro;
    if (!it) {
      return;
    }
    let t = clock(this);
    for (let name of it.order) {
      let at = it.retryAt[name];
      if (at != null && t >= at && !it.settled[name]) {
        delete it.retryAt[name];
        this.tryPlate(name);
      }
      let due = it.dueAt[name];
      if (due != null && !it.settled[name] && t - due >= INTRO_LOAD.plateDeadlineMs) {
        this.failPlate(name, "deadline");
      }
    }
  },
  settlePlate(this: Game, name, ok) {
    let it = this.intro;
    if (it.settled[name]) {
      return;
    }
    it.settled[name] = true;
    delete it.retryAt[name];
    if (ok) {
      it.ready[name] = true;
    }
    this.logBeat(ok ? "plate-decoded" : "plateFailed", name);
    this.push(0, true);
    this.introGate();
    if (it.order.every((n) => it.settled[n])) {
      this.releaseArt();
    } else {
      this.nextPlate();
    }
  },
  /** WP 3: give up on a plate: its beat runs over the fallback gradient, without the bar. */
  failPlate(this: Game, name, why) {
    let it = this.intro;
    if (it.settled[name]) {
      return;
    }
    it.failed[name] = why;
    this.settlePlate(name, false);
  },
  /** Music group + gameplay art: Ch1 first, the rest once Ch1 has settled. Idempotent. */
  releaseArt(this: Game) {
    let it = this.intro;
    if (!it || it.artStarted) {
      return;
    }
    it.artStarted = true;
    // a chapter start (or the last plate) frees the music too
    it.openGate();
    this.audio.musicGate = null;
    this.audio.releaseGroup();
    let ch1 = INTRO_LOAD.ch1Art.map((p) => at(this, p)).filter(Boolean);
    let first = it.art.filter((e) => ch1.includes(e.img));
    let rest = it.art.filter((e) => !ch1.includes(e.img));
    it.art = [];
    let go = (list: Entry[]) => {
      for (let e of list) {
        if (!e.img.src) {
          e.img.src = e.src;
        }
      }
    };
    this.logBeat("art-ch1");
    let left = first.length;
    let restGo = () => {
      this.logBeat("ch1-complete");
      this.logBeat("art-rest");
      go(rest);
    };
    if (!left) {
      restGo();
      return;
    }
    go(first);
    for (let e of first) {
      whenSettled(e.img, () => {
        left -= 1;
        if (left === 0) {
          restGo();
        }
      });
    }
  },
  /** cine.ts: the plate for the beat that was waiting just decoded (or failed): start that beat now. */
  startHeldBeat(this: Game) {
    let it = this.intro;
    if (it && it.waitBeat === this.beat) {
      it.waitBeat = -1;
      this.playCine();
    }
  },
  /** cine.ts: true when this beat's plate failed, so it draws the palette fallback. */
  plateFailed(this: Game, name) {
    return !!this.intro?.failed?.[name];
  },
  logBeat(this: Game, ev, plate?) {
    let it = this.intro;
    if (!it) {
      return;
    }
    let entry: any = {
      t: Math.round(now() * 10) / 10,
      ev,
      beat: this.mode === "cutscene" && this.cutId === "intro" ? this.beat : null,
      plate: plate ?? (this.mode === "cutscene" && this.cutId === "intro" ? this.cut[this.beat]?.plate ?? null : null),
    };
    if (ev === "plateFailed" && plate) entry.why = it.failed[plate];
    if (ev === "plate-retry" && plate) entry.attempt = it.tries[plate];
    it.log.push(entry);
  },
};
