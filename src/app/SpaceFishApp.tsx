import { MUSIC_KEY } from "../save/keys";
import { useEffect, useRef, useState } from "react";
import { initialSnap } from "./snap";
import { Game } from "../game/Game";
import { stickOut, phoneTouch, lockLandscape } from "./controls";
import { musicKnob, Panel, BuildButton, PadButton } from "./widgets";
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
  let [music, setMusicUi] = useState(0.7);
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
    r.startLoop();
    setReady(true);
    return () => {
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
  let inRun = snap.mode === "play" || snap.mode === "pause";
  let moveStick = (e) => {
    if (stickPointer.current !== e.pointerId || !stickRef.current) {
      return;
    }
    e.preventDefault();
    let r = stickRef.current.getBoundingClientRect();
    let a = e.clientX - (r.left + r.width / 2);
    let o = e.clientY - (r.top + r.height / 2);
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
  };
  let releaseStick = (e) => {
    if (stickPointer.current !== e.pointerId) {
      return;
    }
    stickPointer.current = null;
    setKnob({
      x: 0,
      y: 0,
    });
    gameRef.current?.setStick(0, 0);
  };
  let showTouch = touchUi && (!portrait || forced);
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
            <header className="flex items-start justify-between gap-3 p-3 sm:p-4">
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
                {showTouch && (
                  <p className="mt-1 text-xs text-muted">
                    Stick or tap the ground to walk.
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
                A quiet walk on the rim, then the swarm. Sneak to the laser
                cache, pull the holdouts out, rebuild the pad, and fly the
                invasion back to Jupiter.
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
                WASD moves. Shift sneaks. Space fires. Q throws noise. E uses.
                Space also steps a scene forward. Esc pauses. On a phone, turn
                sideways: drag the stick, or tap the ground to walk.
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
              <div className="flex gap-2">
                <button
                  type="button"
                  className="rounded-lg bg-primary px-5 py-3 font-display font-bold text-on-primary"
                  onClick={() => gameRef.current?.resume()}
                >
                  Resume
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
        <div className="flex gap-2 overflow-x-auto border-t border-border bg-surface px-3 py-2">
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
            onClick={() => gameRef.current?.dropBuild()}
          >
            Place ahead
          </button>
        </div>
      )}
      {snap.mode === "play" && showTouch && (
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            zIndex: 30,
          }}
        >
          <div
            ref={stickRef}
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
            <PadButton hold onHold={(e) => gameRef.current?.setFire(e)}>
              Fire
            </PadButton>
            <PadButton onPress={() => gameRef.current?.pulseUse()}>
              Use
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
