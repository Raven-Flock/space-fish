import { MUSIC_KEY } from "../save/keys";
import { useEffect, useRef, useState } from "react";
import { initialSnap } from "./snap";
import { Game } from "../game/Game";
import { stickOut, phoneTouch, lockLandscape } from "./controls";
import { musicKnob, Panel, BuildButton, PadButton } from "./widgets";
import { REPAIR_HINT } from "../content/tuning/build";
import { HUD, HUD_TIMING } from "../content/tuning/hud";
import { HUD_HINT, PAUSE_COPY, TITLE_HELP } from "../content/hud";
import { AUDIO } from "../content/tuning/audio";
import { PAUSE } from "../content/tuning/pause";
import { fireSize, shipGuardX, stage, trayFlips, trayStep } from "./hudLayout";
import { tapProps } from "./tap";
import { PointerBook } from "./heldPointers";
export function SpaceFishApp() {
  let canvasRef = useRef(null);
  let gameRef = useRef(null);
  let stickRef = useRef(null);
  let stickPointer = useRef(null);
  // F-04 floating stick: the thumb's landing point is the stick's origin
  let stickOrigin = useRef({ x: 0, y: 0 });
  let deflectTimer = useRef(null);
  // GD ruling 2026-11-18: held stick and Fire re-acquire after a resume (see heldPointers.ts).
  // A re-acquired stick takes the finger's current position as its origin (the floating
  // stick's landing point), so it starts at zero deflection. adopted: re-acquired pointers.
  // Their moves and lifts arrive on the window, because the new stick and Fire elements
  // never captured them.
  let book = useRef(new PointerBook());
  let firePointer = useRef(null);
  let adopted = useRef(new Set());
  let touchRef = useRef(null);
  let moveStickRef = useRef(null);
  let releaseStickRef = useRef(null);
  let phaseRef = useRef("stealth");
  let toastTimer = useRef(null);
  let lastObjective = useRef("");
  let [stickOn, setStickOn] = useState(false);
  let [walkDone, setWalkDone] = useState(false);
  let [toast, setToast] = useState("");
  let [hintLast, setHintLast] = useState("");
  let [snap, setSnap] = useState(() => initialSnap());
  let [ready, setReady] = useState(false);
  let [knob, setKnob] = useState({
    x: 0,
    y: 0,
  });
  let [touchUi, setTouchUi] = useState(false);
  let [portrait, setPortrait] = useState(false);
  let [forced, setForced] = useState(false);
  let [vp, setVp] = useState({
    w: 0,
    h: 0,
  });
  let [music, setMusicUi] = useState(AUDIO.defaults.music);
  // F-02 pause panel: Mute toggle (persisted by AudioDirector) and the Menu confirm step
  let [muted, setMutedUi] = useState(false);
  let [confirmMenu, setConfirmMenu] = useState(false);
  // VP: Stay is the primary button and has focus when the confirm opens
  let stayRef = useRef(null);
  useEffect(() => {
    if (confirmMenu) {
      stayRef.current?.focus();
    }
  }, [confirmMenu]);
  // F-04 right-stack labels hide after the first HUD.labelUses uses of each button (VP v0.1.2)
  let [uses, setUses] = useState({});
  let used = (k) => setUses((u) => (u[k] >= HUD.labelUses ? u : { ...u, [k]: (u[k] || 0) + 1 }));
  // F-04 Pad repair tray (VP v0.1.2 §3): dwell/hysteresis state and the flip under the strip
  let trayState = useRef({ open: false, nearSince: null });
  let trayRef = useRef(null);
  let repairsRef = useRef(-1);
  let [tray, setTray] = useState({ open: false, top: false });
  let [dwellTick, setDwellTick] = useState(0);
  useEffect(() => {
    let e = () => {
      let t = window.matchMedia?.("(pointer: coarse)").matches;
      let n = window.matchMedia?.("(hover: none)").matches;
      let r = Math.min(window.innerWidth, window.innerHeight);
      let phone = !!(t || n);
      let tall = window.innerHeight > window.innerWidth + 40;
      setTouchUi(!!(phone || r <= 520));
      setPortrait(tall);
      setForced(phone && tall);
      setVp({
        w: window.innerWidth,
        h: window.innerHeight,
      });
    };
    let z = () => {
      stickPointer.current = null;
      clearTimeout(deflectTimer.current);
      deflectTimer.current = null;
      setStickOn(false);
      setKnob({
        x: 0,
        y: 0,
      });
      gameRef.current?.setStick(0, 0);
    };
    e();
    window.addEventListener("resize", e);
    window.addEventListener("orientationchange", e);
    window.visualViewport?.addEventListener("resize", e);
    window.addEventListener("blur", z);
    return () => {
      window.removeEventListener("resize", e);
      window.removeEventListener("orientationchange", e);
      window.visualViewport?.removeEventListener("resize", e);
      window.removeEventListener("blur", z);
    };
  }, []);
  useEffect(() => {
    let v = document.querySelector('meta[name="viewport"]');
    if (v) {
      v.setAttribute(
        "content",
        "width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover",
      );
    }
    let n = canvasRef.current;
    if (!n) {
      return;
    }
    let r = new Game(setSnap);
    gameRef.current = r;
    r.attach(n);
    r.onReacquire = () => {
      let fireEl = touchRef.current?.querySelector('[data-f02="fire"]');
      let { stick, fire } = book.current.pick(fireEl ? fireEl.getBoundingClientRect() : null);
      if (stick && stickPointer.current == null && touchRef.current?.querySelector('[data-f02="stick"]')) {
        stickPointer.current = stick.id;
        stickOrigin.current = { x: stick.x, y: stick.y };
        adopted.current.add(stick.id);
        setStickOn(true);
        setKnob({ x: 0, y: 0 });
        r.setStick(0, 0, true);
      }
      if (fire && firePointer.current == null) {
        firePointer.current = fire.id;
        adopted.current.add(fire.id);
        r.setFire(true);
      }
    };
    let offBook = book.current.attach(
      window,
      (e) => adopted.current.has(e.pointerId) && moveStickRef.current?.(e),
      (e) => {
        if (!adopted.current.delete(e.pointerId)) return;
        releaseStickRef.current?.(e);
        if (firePointer.current === e.pointerId) {
          firePointer.current = null;
          gameRef.current?.setFire(false);
        }
      },
    );
    r.startLoop();
    setReady(true);
    return () => {
      offBook();
      r.onReacquire = null;
      r.detach();
      gameRef.current = null;
    };
  }, []);
  useEffect(() => {
    try {
      let e = localStorage.getItem(MUSIC_KEY);
      if (e == null) {
        return;
      }
      let n = Math.max(0, Math.min(1, parseFloat(e) || 0));
      setMusicUi(n);
      gameRef.current?.setMusic(n);
    } catch {}
  }, []);
  useEffect(() => {
    setMutedUi(!!gameRef.current?.audio.muted);
  }, []);
  useEffect(() => {
    // F-02: leaving play drops any held stick (the game clears its own held input on pause)
    if (snap.mode !== "play") {
      firePointer.current = null;
      adopted.current.clear();
    }
    if (snap.mode !== "play" && stickPointer.current != null) {
      stickPointer.current = null;
      clearTimeout(deflectTimer.current);
      deflectTimer.current = null;
      setStickOn(false);
      setKnob({
        x: 0,
        y: 0,
      });
    }
    if (snap.mode !== "pause") {
      setConfirmMenu(false);
    }
  }, [snap.mode]);
  // F-04 (VP-01): in Transit the ship's left edge stays >= the stick zone + 24 px.
  // offsetLeft/offsetWidth are layout px in <main>'s own frame, so this also holds when
  // <main> is rotated (forced landscape). 0 = no touch stick = the live clamp.
  let syncGuard = () => {
    let g = gameRef.current;
    if (!g) {
      return;
    }
    let el = stickRef.current;
    let on = snap.mode === "play" && snap.phase === "shooter" && showTouch && el;
    g.setStickGuard(on ? shipGuardX(el.offsetLeft + el.offsetWidth, g.view) : 0);
  };
  useEffect(() => {
    let n = requestAnimationFrame(() => {
      gameRef.current?.resize();
      syncGuard();
    });
    return () => cancelAnimationFrame(n);
  }, [forced, vp.w, vp.h]);
  useEffect(() => {
    let n = () => phoneTouch() && lockLandscape();
    window.addEventListener("pointerdown", n, {
      once: true,
    });
    return () => window.removeEventListener("pointerdown", n);
  }, []);
  // a pause taken during a cutscene shows only the Paused panel, not the play HUD
  let pausedCut =
    snap.mode === "pause" && gameRef.current?.pauseFrom === "cutscene";
  let inRun = snap.mode === "play" || (snap.mode === "pause" && !pausedCut);
  phaseRef.current = snap.phase;
  // VP-08: the walk hint hides after the first stick move of >= 0.4 s (Transit's hint is
  // timed by the game, PR #10 v0.3)
  let stickMoved = () => {
    deflectTimer.current = null;
    if (phaseRef.current !== "shooter") {
      setWalkDone(true);
    }
  };
  let moveStick = (e) => {
    if (stickPointer.current !== e.pointerId || !stickRef.current) {
      return;
    }
    e.preventDefault();
    let a = e.clientX - stickOrigin.current.x;
    let o = e.clientY - stickOrigin.current.y;
    if (forced) {
      let e = a;
      a = o;
      o = -e;
    }
    let s = stickOut(a, o, HUD.stickRing / 2);
    setKnob({
      x: s.vx,
      y: s.vy,
    });
    gameRef.current?.setStick(s.x, s.y, true);
    let moving = s.x !== 0 || s.y !== 0;
    if (moving && !deflectTimer.current) {
      deflectTimer.current = setTimeout(stickMoved, HUD_TIMING.walkHintHideAfter * 1000);
    } else if (!moving && deflectTimer.current) {
      clearTimeout(deflectTimer.current);
      deflectTimer.current = null;
    }
  };
  let releaseStick = (e) => {
    if (stickPointer.current !== e.pointerId) {
      return;
    }
    stickPointer.current = null;
    clearTimeout(deflectTimer.current);
    deflectTimer.current = null;
    setStickOn(false);
    setKnob({
      x: 0,
      y: 0,
    });
    gameRef.current?.setStick(0, 0);
  };
  moveStickRef.current = moveStick;
  releaseStickRef.current = releaseStick;
  let showTouch = touchUi && (!portrait || forced);
  useEffect(syncGuard, [snap.mode, snap.phase, showTouch]);
  // VP.md §4: a changed objective shows in full as a 2.5 s toast, then only the one-liner
  useEffect(() => {
    if (!inRun || !snap.objective || snap.objective === lastObjective.current) {
      if (!inRun) {
        lastObjective.current = "";
      }
      return;
    }
    lastObjective.current = snap.objective;
    clearTimeout(toastTimer.current);
    setToast(snap.objective);
    toastTimer.current = setTimeout(() => setToast(""), HUD.toastMs);
  }, [snap.objective, inRun]);
  useEffect(() => () => {
    clearTimeout(toastTimer.current);
    clearTimeout(deflectTimer.current);
  }, []);
  // F-04 top strip, hint line and build tray state
  let ground = snap.phase !== "shooter";
  let bossOn = snap.phase === "shooter" && snap.bossHp > 0;
  let wrecksLeft = snap.gens < 1 || snap.turrets < 2 || snap.labs < 1;
  // VP Transit hint: hidden (faded) once the game says so (v0.3); re-read on every HUD snap
  let transitHintDone = !!gameRef.current?.transitHint?.done;
  let touchHint = !showTouch
    ? ""
    : ground
      ? !walkDone
        ? HUD_HINT.touchWalk
        : snap.phase === "base" && wrecksLeft
          ? REPAIR_HINT
          : ""
      : !transitHintDone
        ? HUD_HINT.touchTransit
        : "";
  // one hint line at a time: the objective toast first, then the touch hint
  let hintText = snap.mode === "play" ? toast || touchHint : "";
  useEffect(() => {
    if (hintText) {
      setHintLast(hintText);
    }
  }, [hintText]);
  useEffect(() => setHintLast(""), [snap.phase]);
  // VP v0.1.2 §3: the tray opens after a 0.3 s dwell within 150 px of an unrepaired wreck
  // (or with a kind picked) and closes beyond 200 px or after a repair. It flips to just
  // under the top strip if the player or the target wreck would sit under it.
  useEffect(() => {
    let g = gameRef.current;
    if (!g?.player || snap.phase !== "base" || !inRun) {
      trayState.current = { open: false, nearSince: null };
      repairsRef.current = -1;
      if (tray.open || tray.top) setTray({ open: false, top: false });
      return;
    }
    let w = g.nearestWreck(g.player.x, g.player.y, Infinity);
    let dist = w ? Math.hypot(w.x - g.player.x, w.y - g.player.y) : Infinity;
    let repairs = snap.gens + snap.turrets + snap.labs;
    let repaired = repairsRef.current >= 0 && repairs > repairsRef.current;
    repairsRef.current = repairs;
    let now = performance.now();
    let next = snap.mode === "play" ? trayStep(trayState.current, now, dist, snap.build != null, repaired) : trayState.current;
    trayState.current = next;
    let t = null;
    if (!next.open && next.nearSince != null) {
      t = setTimeout(() => setDwellTick((n) => n + 1), Math.max(0, HUD.trayDwellMs - (now - next.nearSince)));
    }
    let top = false;
    if (next.open) {
      let v = g.view;
      let sy = (y) => v.oy + (y - g.camY) * v.scale;
      let ys = [sy(g.player.y)];
      let target = g.nearestWreck(g.player.x, g.player.y, HUD.trayClosePx);
      if (target) ys.push(sy(target.y));
      let h = trayRef.current?.offsetHeight || 0;
      let vh = trayRef.current?.parentElement?.clientHeight || 0;
      top = h > 0 && vh > 0 && trayFlips(vh, h, ys);
    }
    if (next.open !== tray.open || top !== tray.top) setTray({ open: next.open, top });
    return () => clearTimeout(t);
  }, [snap, dwellTick, inRun]);
  let building = snap.phase === "base" && tray.open;
  let hpFrac = snap.maxHp > 0 ? snap.hp / snap.maxHp : 0;
  let fx = forced ? " sf-forced" : "";
  // narrower than 16:9: the HUD sits inside the letterboxed stage (VP v0.1.2 §5)
  let lbPx = stage(Math.max(vp.w, vp.h), Math.min(vp.w, vp.h)).letterboxPx;
  let hudVar = lbPx > 0 ? ({ ["--sf-lb" as any]: `${lbPx}px` } as any) : undefined;
  return (
    <main
      className="relative flex h-dvh flex-col bg-bg text-fg"
      style={
        forced
          ? {
              position: "fixed",
              top: 0,
              left: `${vp.w}px`,
              width: `${vp.h}px`,
              height: `${vp.w}px`,
              transform: "rotate(90deg)",
              transformOrigin: "top left",
              overflow: "hidden",
            }
          : undefined
      }
    >
      <div className="relative min-h-0 flex-1">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full touch-none"
        />
        <div className="pointer-events-none absolute inset-0 flex flex-col">
          {inRun && (
            <div data-hud-root="strip" className={`sf-safe sf-strip${fx}`} style={hudVar}>
              <div data-hud="hp" data-phase={snap.phase} className="sf-chip sf-hp">
                <span className="sf-tag">
                  {snap.phase === "stealth"
                    ? "Rim"
                    : snap.phase === "rescue"
                      ? "Holdouts"
                      : snap.phase === "base"
                        ? "Pad"
                        : "Transit"}
                </span>
                <span className="sf-hpbar">
                  <span
                    className={`sf-hpfill${hpFrac < HUD.hpLowFrac ? " sf-low" : ""}`}
                    style={{
                      width: `${hpFrac * 100}%`,
                    }}
                  />
                </span>
                {snap.alert && <span className="sf-alert">Spotted</span>}
              </div>
              {snap.objective && !bossOn && (
                <p
                  data-hud="objective"
                  className="sf-chip sf-obj"
                  title={snap.objective}
                >
                  {snap.objective}
                </p>
              )}
              {snap.phase === "base" && (
                <div data-hud="base" className="sf-chip sf-base">
                  <span>
                    {"Scrap "}
                    {snap.scrap}
                  </span>
                  {/* VP v0.1.2 §5: the letters ship as placeholders until the 14 px glyphs */}
                  <span className="sf-ico" data-ico="gen" title="Generator">
                    G
                  </span>
                  <span>{snap.gens}</span>
                  <span className="sf-ico" data-ico="turret" title="Turret">
                    T
                  </span>
                  <span>
                    {snap.turrets}
                    {"/2"}
                  </span>
                  <span className="sf-ico" data-ico="lab" title="Lab">
                    L
                  </span>
                  <span>{snap.labs}</span>
                  {snap.nestHp > 0 && (
                    <span className="text-brass">
                      {"Nest "}
                      {snap.nestHp}
                    </span>
                  )}
                </div>
              )}
              {snap.phase === "shooter" && (
                <div data-hud="kits" className="sf-chip sf-kits">
                  {[
                    snap.speedKit && "Speed",
                    snap.spread && "Spread",
                    snap.drone && "Drone",
                    snap.shield && "Shield",
                  ]
                    .filter(Boolean)
                    .join(" · ") || "Kits ahead"}
                </div>
              )}
            </div>
          )}
          {inRun && bossOn && (
            <div data-hud-root="boss" data-hud="boss" className={`sf-safe sf-boss${fx}`} style={hudVar}>
              <span className="sf-boss-label">THE EYE</span>
              <span className="sf-boss-track">
                <span
                  className="sf-boss-chip"
                  style={{
                    width: `${(snap.bossHp / snap.bossMax) * 100}%`,
                  }}
                />
                <span
                  className="sf-boss-fill"
                  style={{
                    width: `${(snap.bossHp / snap.bossMax) * 100}%`,
                  }}
                />
              </span>
            </div>
          )}
          {inRun && (
            // F-02's Pause button lives in this slot (VP v0.1.2 §2): a transparent 44x44 hit
            // box whose 36x36 plate sits inside the 36 px strip, hanging 8 px below it.
            <div
              data-hud-root="pause"
              data-hud="pause"
              id="sf-pause-slot"
              className={`sf-safe sf-pause-slot${fx}`}
              style={hudVar}
            >
              {snap.mode === "play" && (
                <button
                  type="button"
                  data-f02="pause"
                  aria-label={PAUSE_COPY.pause}
                  title="Pause (Esc or P)"
                  className="sf-pause"
                  {...tapProps(() => gameRef.current?.pauseGame(), (e) => e.stopPropagation())}
                >
                  <span aria-hidden="true" className="sf-pause-plate">
                    <span style={{ width: PAUSE.barW, height: PAUSE.barH, background: PAUSE.barColor }} />
                    <span style={{ width: PAUSE.barW, height: PAUSE.barH, background: PAUSE.barColor }} />
                  </span>
                </button>
              )}
            </div>
          )}
          {inRun && (
            <p
              data-hud-root="hint"
              data-hud="hint"
              className={`sf-safe sf-hint${hintText ? " sf-on" : ""}${fx}`}
              aria-hidden={hintText ? undefined : true}
              style={hudVar}
            >
              {hintText || hintLast}
            </p>
          )}
          <div className="flex-1" />
          {snap.mode === "cutscene" && (
            <div className={`pointer-events-auto m-3 flex items-end justify-between gap-3 sm:m-4 sf-safe sf-cutrow${fx}`}>
              <p className="max-w-xl rounded-lg border border-border bg-surface/95 px-4 py-3 font-display text-lg leading-snug">
                {snap.caption}
              </p>
              <button
                type="button"
                className="rounded-lg bg-primary px-4 py-3 font-display text-sm font-bold text-on-primary"
                onClick={() => gameRef.current?.skipCutscene()}
              >
                Skip
              </button>
            </div>
          )}
          {snap.mode === "menu" && (
            <Panel>
              <p className="font-display text-xs tracking-widest text-primary">
                MOON RIM
              </p>
              <h1 className="font-display text-4xl font-bold sm:text-5xl">
                Spacefish
              </h1>
              <p className="max-w-md text-sm leading-relaxed text-muted">
                A quiet walk on the rim, then the swarm. Shovel only until the
                cache. Then the laser, the holdouts, repairs on the pad, and
                the flight to Jupiter.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={!ready}
                  className="rounded-lg bg-primary px-5 py-3 font-display font-bold text-on-primary disabled:opacity-50"
                  onClick={() => gameRef.current?.startNew()}
                >
                  Start
                </button>
                {snap.hasSave && (
                  <button
                    type="button"
                    className="rounded-lg border border-border bg-bg px-5 py-3 font-display font-bold"
                    onClick={() => gameRef.current?.continueGame()}
                  >
                    Continue
                  </button>
                )}
                <button
                  type="button"
                  className="rounded-lg border border-border px-5 py-3 font-display font-bold"
                  onClick={() => gameRef.current?.openCredits()}
                >
                  Credits
                </button>
              </div>
              <p className="text-xs leading-relaxed text-muted">
                {`${TITLE_HELP.base} ${touchUi ? TITLE_HELP.aimTouch : TITLE_HELP.aimDesktop}`}
              </p>
              {ready &&
                musicKnob(music, (e) => {
                  setMusicUi(e);
                  gameRef.current?.setMusic(e);
                })}
            </Panel>
          )}
          {snap.mode === "credits" && (
            <Panel>
              <h1 className="font-display text-3xl font-bold">Credits</h1>
              <p className="max-w-md text-sm leading-relaxed text-muted">
                Spacefish is a three-phase run: stealth on the lunar rim, a
                short rescue, a small base, then a flight to Jupiter. The crew,
                the fish, and the ship are painted sprites. Music is original
                Raven Flock music composed in Aerie.
              </p>
              {musicKnob(music, (e) => {
                setMusicUi(e);
                gameRef.current?.setMusic(e);
              })}
              <button
                type="button"
                className="rounded-lg bg-primary px-5 py-3 font-display font-bold text-on-primary"
                onClick={() => gameRef.current?.backToMenu()}
              >
                Back
              </button>
            </Panel>
          )}
          {snap.mode === "pause" && (
            <Panel>
              <h1 className="font-display text-3xl font-bold">Paused</h1>
              {musicKnob(music, (e) => {
                setMusicUi(e);
                gameRef.current?.setMusic(e);
              })}
              {confirmMenu ? (
                <div className="flex flex-wrap items-center gap-2" data-f02="confirm">
                  <p className="text-sm text-muted">{PAUSE_COPY.confirm}</p>
                  <button
                    type="button"
                    ref={stayRef}
                    className="rounded-lg bg-primary px-5 py-3 font-display font-bold text-on-primary"
                    {...tapProps(() => setConfirmMenu(false))}
                  >
                    {PAUSE_COPY.stay}
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-border px-5 py-3 font-display font-bold"
                    {...tapProps(() => gameRef.current?.quitToTitle())}
                  >
                    {PAUSE_COPY.leave}
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    type="button"
                    data-f02="resume"
                    className="rounded-lg bg-primary px-5 py-3 font-display font-bold text-on-primary"
                    {...tapProps(() => gameRef.current?.resume())}
                  >
                    Resume
                  </button>
                  <button
                    type="button"
                    data-f02="mute"
                    aria-pressed={muted}
                    className="rounded-lg border border-border px-5 py-3 font-display font-bold"
                    {...tapProps(() => {
                      let m = !muted;
                      setMutedUi(m);
                      gameRef.current?.audio.setMuted(m);
                    })}
                  >
                    {muted ? PAUSE_COPY.unmute : PAUSE_COPY.mute}
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-border px-5 py-3 font-display font-bold"
                    {...tapProps(() => setConfirmMenu(true))}
                  >
                    Menu
                  </button>
                </div>
              )}
            </Panel>
          )}
          {snap.mode === "dead" && (
            <Panel>
              <h1 className="font-display text-3xl font-bold">
                The swarm takes you
              </h1>
              <p className="text-sm text-muted">
                This phase starts over. Earlier phases stay saved.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="rounded-lg bg-primary px-5 py-3 font-display font-bold text-on-primary"
                  onClick={() => gameRef.current?.retry()}
                >
                  Retry
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-border px-5 py-3 font-display font-bold"
                  onClick={() => gameRef.current?.backToMenu()}
                >
                  Menu
                </button>
              </div>
            </Panel>
          )}
          {snap.mode === "victory" && (
            <Panel>
              <p className="font-display text-xs tracking-widest text-primary">
                JUPITER
              </p>
              <h1 className="font-display text-4xl font-bold">
                The eye breaks
              </h1>
              <p className="max-w-md text-sm text-muted">
                The rim can breathe. The holdouts have a base. The center of the
                swarm is dark.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-lg bg-primary px-5 py-3 font-display font-bold text-on-primary"
                  onClick={() => gameRef.current?.startPhase("shooter")}
                >
                  Fly it again
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-border px-5 py-3 font-display font-bold"
                  onClick={() => gameRef.current?.backToMenu()}
                >
                  Menu
                </button>
              </div>
            </Panel>
          )}
        </div>
      </div>
      {inRun && snap.phase === "base" && (
        // F-04 (VP-09): an overlay that slides in only while building; it never resizes the canvas
        <div
          ref={trayRef}
          data-hud-root="tray"
          data-hud={building ? "tray" : undefined}
          aria-hidden={building ? undefined : true}
          className={`sf-safe sf-tray${showTouch ? " sf-tray-touch" : ""}${building ? " sf-open" : ""}${building && tray.top ? " sf-tray-top" : ""}${fx}`}
          style={hudVar}
        >
          <p className="shrink-0 font-display text-xs font-bold tracking-widest text-brass">
            REPAIR
          </p>
          {["gen", "turret", "lab"].map((e) => (
            <BuildButton
              key={e}
              kind={e}
              snap={snap}
              onPick={(e) => gameRef.current?.selectBuild(e)}
            />
          ))}
          <button
            type="button"
            className="shrink-0 rounded-lg border border-brass px-3 py-2 text-sm font-bold text-brass"
            title={REPAIR_HINT}
            onClick={() => gameRef.current?.dropBuild()}
          >
            Repair ahead
          </button>
          {!showTouch && (
            <p className="shrink-0 text-xs text-muted">{REPAIR_HINT}</p>
          )}
        </div>
      )}
      {snap.mode === "play" && showTouch && (
        <div
          ref={touchRef}
          data-hud-root="controls"
          className={`sf-safe sf-controls${fx}`}
          style={{
            zIndex: 30,
            ...hudVar,
          }}
        >
          <div
            ref={stickRef}
            data-hud="stick"
            data-f02="stick"
            className="sf-stick"
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              stickPointer.current = e.pointerId;
              stickOrigin.current = {
                x: e.clientX,
                y: e.clientY,
              };
              setStickOn(true);
              moveStick(e);
              try {
                e.currentTarget.setPointerCapture(e.pointerId);
              } catch {}
            }}
            onPointerMove={moveStick}
            onPointerUp={releaseStick}
            onPointerCancel={releaseStick}
          >
            <span className={`sf-stick-ring${stickOn ? " sf-active" : ""}`} />
            <span
              className="sf-stick-knob"
              style={{
                transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))`,
              }}
            />
          </div>
          {/* VP v0.1.2 §5 right stack: Fire in the corner, Use 56 up-left (ground phases),
              the Rim's Sneak/Noise above Fire; 12 px labels under each, gone after 3 uses */}
          <div
            className="sf-buttons"
            style={{ ["--sf-fire" as any]: `${fireSize(vp.w > vp.h ? vp.w : vp.h, vp.w > vp.h ? vp.h : vp.w)}px` }}
          >
            {snap.phase === "stealth" && (
              <PadButton
                size={HUD.minTarget}
                hud="sneak"
                className="sf-btn-sneak"
                label={(uses["sneak"] || 0) < HUD.labelUses ? "Sneak" : ""}
                onUse={() => used("sneak")}
                onPress={() => gameRef.current?.toggleSneak()}
              >
                Sneak
              </PadButton>
            )}
            {snap.phase === "stealth" && (
              <PadButton
                size={HUD.minTarget}
                hud="noise"
                className="sf-btn-noise"
                label={(uses["noise"] || 0) < HUD.labelUses ? "Noise" : ""}
                onUse={() => used("noise")}
                onPress={() => gameRef.current?.pulseNoise()}
              >
                Noise
              </PadButton>
            )}
            {ground && (
              <PadButton
                size={HUD.use}
                hud="use"
                className="sf-btn-use"
                label={(uses["use"] || 0) < HUD.labelUses ? "Use" : ""}
                onUse={() => used("use")}
                onPress={() => gameRef.current?.pulseUse()}
              >
                Use
              </PadButton>
            )}
            <PadButton
              size="var(--sf-fire)"
              hud="fire"
              zone="fire"
              className="sf-btn-fire"
              label={(uses["fire"] || 0) < HUD.labelUses ? (snap.weapon === "Shovel" ? "Dig" : "Fire") : ""}
              onUse={() => used("fire")}
              hold
              onHold={(e) => gameRef.current?.setFire(e)}
            >
              {snap.weapon === "Shovel" ? "Dig" : "Fire"}
            </PadButton>
          </div>
        </div>
      )}
    </main>
  );
}
export function Root() {
  return <SpaceFishApp />;
}
