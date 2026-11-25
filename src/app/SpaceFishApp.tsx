import { MUSIC_KEY } from "../save/keys";
import { useEffect, useRef, useState } from "react";
import { initialSnap } from "./snap";
import { Game } from "../game/Game";
import { stickOut, phoneTouch, lockLandscape } from "./controls";
import { musicKnob, Panel, BuildButton, PadButton } from "./widgets";
import { REPAIR_HINT } from "../content/tuning/build";
import { HUD_HINT, PAUSE_COPY, TITLE_HELP } from "../content/hud";
import { HUD_TIMING } from "../content/tuning/hud";
import { AUDIO } from "../content/tuning/audio";
import { PAUSE } from "../content/tuning/pause";
import { tapProps } from "./tap";
import { PointerBook } from "./heldPointers";
export function SpaceFishApp() {
  let canvasRef = useRef(null);
  let gameRef = useRef(null);
  let stickRef = useRef(null);
  let stickPointer = useRef(null);
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
  // VP-PHONE-HUD-v0.1 (VP-08): the touch walk hint hides after the first stick move of 0.4 s or longer
  let [walkHintDone, setWalkHintDone] = useState(false);
  let walkHintTimer = useRef(null);
  let stopWalkHintTimer = () => {
    clearTimeout(walkHintTimer.current);
    walkHintTimer.current = null;
  };
  useEffect(() => () => clearTimeout(walkHintTimer.current), []);
  // GD ruling 2026-11-18: held stick and Fire re-acquire after a resume (see heldPointers.ts).
  // stickCentre: a re-acquired stick is centred where the finger is (zero deflection, no lurch).
  // adopted: re-acquired pointers. Their moves and lifts arrive on the window, because the new
  // stick and Fire elements never captured them.
  let book = useRef(new PointerBook());
  let stickCentre = useRef(null);
  let firePointer = useRef(null);
  let adopted = useRef(new Set());
  let touchRef = useRef(null);
  let moveStickRef = useRef(null);
  let releaseStickRef = useRef(null);
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
      stopWalkHintTimer();
      stickPointer.current = null;
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
        stickCentre.current = { x: stick.x, y: stick.y };
        adopted.current.add(stick.id);
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
      stickCentre.current = null;
      firePointer.current = null;
      adopted.current.clear();
    }
    if (snap.mode !== "play" && stickPointer.current != null) {
      stickPointer.current = null;
      setKnob({
        x: 0,
        y: 0,
      });
    }
    if (snap.mode !== "pause") {
      setConfirmMenu(false);
    }
  }, [snap.mode]);
  useEffect(() => {
    let n = requestAnimationFrame(() => gameRef.current?.resize());
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
  let moveStick = (e) => {
    if (stickPointer.current !== e.pointerId || !stickRef.current) {
      return;
    }
    e.preventDefault();
    let r = stickRef.current.getBoundingClientRect();
    let c = stickCentre.current ?? { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    let a = e.clientX - c.x;
    let o = e.clientY - c.y;
    if (forced) {
      let e = a;
      a = o;
      o = -e;
    }
    let s = stickOut(a, o, Math.min(r.width, r.height) / 2);
    setKnob({
      x: s.vx,
      y: s.vy,
    });
    gameRef.current?.setStick(s.x, s.y, true);
    if (s.x !== 0 || s.y !== 0) {
      if (!walkHintTimer.current) {
        walkHintTimer.current = setTimeout(
          () => setWalkHintDone(true),
          HUD_TIMING.walkHintHideAfter * 1000,
        );
      }
    } else {
      stopWalkHintTimer();
    }
  };
  let releaseStick = (e) => {
    if (stickPointer.current !== e.pointerId) {
      return;
    }
    stickPointer.current = null;
    stickCentre.current = null;
    stopWalkHintTimer();
    setKnob({
      x: 0,
      y: 0,
    });
    gameRef.current?.setStick(0, 0);
  };
  moveStickRef.current = moveStick;
  releaseStickRef.current = releaseStick;
  let showTouch = touchUi && (!portrait || forced);
  // VP Transit hint: hidden (faded) once the game says so; re-read on every HUD snap
  let transitHintDone = !!gameRef.current?.transitHint?.done;
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
        {snap.mode === "play" && (
          <button
            type="button"
            data-f02="pause"
            aria-label={PAUSE_COPY.pause}
            title="Pause (Esc or P)"
            className="pointer-events-auto absolute"
            style={{
              // VP v0.1.2: a transparent 44x44 hit box; the 36x36 plate sits at its top
              // (inside the 36 px strip), so the box hangs 8 px below. The plate keeps
              // max(12px, safe-area inset) from the top and right edges.
              top: forced
                ? `max(${PAUSE.edgePx}px, env(safe-area-inset-right))`
                : `max(${PAUSE.edgePx}px, env(safe-area-inset-top))`,
              right: `calc(${
                forced
                  ? `max(${PAUSE.edgePx}px, env(safe-area-inset-bottom))`
                  : `max(${PAUSE.edgePx}px, env(safe-area-inset-right))`
              } - ${(PAUSE.hitPx - PAUSE.platePx) / 2}px)`,
              width: PAUSE.hitPx,
              height: PAUSE.hitPx,
              zIndex: 31,
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "center",
              padding: 0,
              border: 0,
              background: "transparent",
              touchAction: "none",
            }}
            {...tapProps(() => gameRef.current?.pauseGame(), (e) => e.stopPropagation())}
          >
            <span
              aria-hidden="true"
              style={{
                width: PAUSE.platePx,
                height: PAUSE.platePx,
                borderRadius: PAUSE.plateRadius,
                background: PAUSE.plateColor,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: PAUSE.barGap,
              }}
            >
              <span style={{ width: PAUSE.barW, height: PAUSE.barH, background: PAUSE.barColor }} />
              <span style={{ width: PAUSE.barW, height: PAUSE.barH, background: PAUSE.barColor }} />
            </span>
          </button>
        )}
        <div className="pointer-events-none absolute inset-0 flex flex-col">
          {inRun && (
            <header
              className="flex items-start justify-between gap-3 p-3 sm:p-4"
              style={{
                // keeps the header card PAUSE.clearPx clear of the Pause hit box
                paddingRight: `calc(${forced ? `max(${PAUSE.edgePx}px, env(safe-area-inset-bottom))` : `max(${PAUSE.edgePx}px, env(safe-area-inset-right))`} + ${PAUSE.hitPx - (PAUSE.hitPx - PAUSE.platePx) / 2 + PAUSE.clearPx}px)`,
              }}
            >
              <div className="max-w-xl rounded-lg border border-border bg-surface/90 px-3 py-2 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <p className="font-display text-sm font-bold tracking-wide text-primary">
                    {snap.phase === "stealth"
                      ? "Rim"
                      : snap.phase === "rescue"
                        ? "Holdouts"
                        : snap.phase === "base"
                          ? "Pad"
                          : "Transit"}
                  </p>
                  <p className="text-xs text-muted">{snap.weapon}</p>
                  {snap.alert && (
                    <p className="text-xs font-bold text-danger">Spotted</p>
                  )}
                </div>
                <div className="mt-2 h-2 w-40 overflow-hidden rounded-full bg-border sm:w-56">
                  {
                    <div
                      className="h-full bg-danger"
                      style={{
                        width: `${(snap.hp / snap.maxHp) * 100}%`,
                      }}
                    />
                  }
                </div>
                <p className="mt-2 text-sm leading-snug">{snap.objective}</p>
                {showTouch && snap.phase !== "shooter" && !walkHintDone && (
                  <p className="mt-1 text-xs text-muted">
                    {HUD_HINT.touchWalk}
                  </p>
                )}
                {showTouch && snap.phase === "shooter" && (
                  <p
                    className="mt-1 text-xs text-muted"
                    style={{
                      opacity: transitHintDone ? 0 : 1,
                      transition: `opacity ${HUD_TIMING.hintFadeMs}ms`,
                    }}
                    aria-hidden={transitHintDone ? true : undefined}
                  >
                    {HUD_HINT.touchTransit}
                  </p>
                )}
              </div>
              {snap.phase === "base" && (
                <div className="rounded-lg border border-border bg-surface/90 px-3 py-2 text-sm backdrop-blur-sm">
                  <p>
                    {"Scrap "}
                    {snap.scrap}
                  </p>
                  <p className="text-muted">
                    {"Power "}
                    {snap.gens}
                    {" · Turrets "}
                    {snap.turrets}
                    {"/2 · Lab "}
                    {snap.labs}
                  </p>
                  <p className="text-muted">
                    {snap.powered ? "Grid live" : "No power"}
                  </p>
                  {snap.nestHp > 0 && (
                    <p className="text-brass">
                      {"Nest "}
                      {snap.nestHp}
                    </p>
                  )}
                </div>
              )}
              {snap.phase === "shooter" && (
                <div className="rounded-lg border border-border bg-surface/90 px-3 py-2 text-sm backdrop-blur-sm">
                  <p className="text-muted">
                    {[
                      snap.speedKit && "Speed",
                      snap.spread && "Spread",
                      snap.drone && "Drone",
                      snap.shield && "Shield",
                    ]
                      .filter(Boolean)
                      .join(" · ") || "Kits ahead"}
                  </p>
                  {snap.phase === "shooter" && snap.bossHp > 0 && (
                    <div className="mt-2 h-2 w-36 overflow-hidden rounded-full bg-border">
                      {
                        <div
                          className="h-full bg-primary"
                          style={{
                            width: `${(snap.bossHp / snap.bossMax) * 100}%`,
                          }}
                        />
                      }
                    </div>
                  )}
                </div>
              )}
            </header>
          )}
          <div className="flex-1" />
          {snap.mode === "cutscene" && (
            <div className="pointer-events-auto m-3 flex items-end justify-between gap-3 sm:m-4">
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
        <div className="flex items-center gap-2 overflow-x-auto border-t border-border bg-surface px-3 py-2">
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
          <p className="shrink-0 text-xs text-muted">{REPAIR_HINT}</p>
        </div>
      )}
      {snap.mode === "play" && showTouch && (
        <div
          ref={touchRef}
          className="pointer-events-none absolute inset-0"
          style={{
            zIndex: 30,
          }}
        >
          <div
            ref={stickRef}
            data-f02="stick"
            className="pointer-events-auto absolute"
            style={{
              left: forced
                ? "max(12px, env(safe-area-inset-top))"
                : "max(12px, env(safe-area-inset-left))",
              bottom:
                snap.phase === "base"
                  ? "76px"
                  : forced
                    ? "max(12px, env(safe-area-inset-left))"
                    : "max(12px, env(safe-area-inset-bottom))",
              width: 148,
              height: 148,
              borderRadius: 999,
              border: "2px solid rgba(232,239,233,0.4)",
              background: "rgba(12,18,24,0.55)",
              touchAction: "none",
            }}
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              stickPointer.current = e.pointerId;
              moveStick(e);
              try {
                e.currentTarget.setPointerCapture(e.pointerId);
              } catch {}
            }}
            onPointerMove={moveStick}
            onPointerUp={releaseStick}
            onPointerCancel={releaseStick}
          >
            {
              <span
                className="pointer-events-none absolute top-1/2 left-1/2 rounded-full bg-primary"
                style={{
                  width: 56,
                  height: 56,
                  transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))`,
                }}
              />
            }
          </div>
          <div
            className="pointer-events-auto absolute grid grid-cols-2 gap-2"
            style={{
              right: forced
                ? "max(12px, env(safe-area-inset-bottom))"
                : "max(12px, env(safe-area-inset-right))",
              bottom:
                snap.phase === "base"
                  ? "76px"
                  : forced
                    ? "max(12px, env(safe-area-inset-right))"
                    : "max(12px, env(safe-area-inset-bottom))",
              width: 176,
            }}
          >
            {snap.phase === "stealth" && (
              <PadButton onPress={() => gameRef.current?.toggleSneak()}>
                Sneak
              </PadButton>
            )}
            {snap.phase === "stealth" && (
              <PadButton onPress={() => gameRef.current?.pulseNoise()}>
                Noise
              </PadButton>
            )}
            <PadButton hold zone="fire" onHold={(e) => gameRef.current?.setFire(e)}>
              {snap.weapon === "Shovel" ? "Dig" : "Fire"}
            </PadButton>
            {snap.phase !== "shooter" && (
              <PadButton onPress={() => gameRef.current?.pulseUse()}>
                Use
              </PadButton>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
export function Root() {
  return <SpaceFishApp />;
}
