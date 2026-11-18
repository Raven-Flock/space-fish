// @vitest-environment jsdom
// F-04 phone HUD in the React shell: per-phase controls (VP rule 7), the exact hint
// copy (VP §1), F-02's Pause in its slot, the strip, the boss bar, the right stack with
// its labels and the overlay tray (VP v0.1.2).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { Root } from "../src/app/SpaceFishApp";
import { REPAIR_HINT } from "../src/content/tuning/build";
import { HUD_HINT, PAUSE_COPY } from "../src/content/hud";
import { HUD, HUD_TIMING } from "../src/content/tuning/hud";
import { mulberry32 } from "./helpers/fakeEnv";

beforeAll(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
});
afterEach(() => {
  vi.useRealTimers();
  history.replaceState(null, "", "/space-fish/");
});

async function boot(w: number, h: number, coarse: boolean) {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  let now = 0;
  let q: Array<[number, FrameRequestCallback]> = [];
  let id = 0;
  Object.defineProperty(globalThis, "performance", { value: { now: () => now }, configurable: true, writable: true });
  window.requestAnimationFrame = (fn) => { q.push([++id, fn]); return id; };
  window.cancelAnimationFrame = (x) => { q = q.filter(([i]) => i !== x); };
  (globalThis as any).requestAnimationFrame = window.requestAnimationFrame;
  (globalThis as any).cancelAnimationFrame = window.cancelAnimationFrame;
  window.matchMedia = ((qs: string) => ({ matches: coarse && (qs.includes("coarse") || qs.includes("hover: none")), addEventListener() {}, removeEventListener() {} })) as any;
  (window as any).ResizeObserver = class { observe() {} disconnect() {} };
  (globalThis as any).ResizeObserver = (window as any).ResizeObserver;
  class AC { destination = {}; currentTime = 0; createGain() { return { gain: { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }; } createOscillator() { return { frequency: {}, connect() {}, start() {}, stop() {} }; } resume() { return Promise.resolve(); } close() { return Promise.resolve(); } }
  (window as any).AudioContext = AC;
  window.HTMLMediaElement.prototype.play = function () { return Promise.resolve(); };
  window.HTMLMediaElement.prototype.pause = function () {};
  (window.HTMLCanvasElement.prototype as any).getContext = function () {
    return new Proxy({}, { get: (_t, k) => (k === "createLinearGradient" || k === "createRadialGradient" ? () => ({ addColorStop() {} }) : k === "measureText" ? () => ({ width: 10 }) : () => {}), set: () => true });
  };
  Object.defineProperty(window, "innerWidth", { value: w, configurable: true });
  Object.defineProperty(window, "innerHeight", { value: h, configurable: true });
  Object.defineProperty(HTMLElement.prototype, "clientWidth", { get() { return this.tagName === "CANVAS" ? w : 0; }, configurable: true });
  Object.defineProperty(HTMLElement.prototype, "clientHeight", { get() { return this.tagName === "CANVAS" ? h : 0; }, configurable: true });
  localStorage.clear();
  Math.random = mulberry32(5);
  const host = document.createElement("div");
  document.body.innerHTML = "";
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => { root.render(createElement(Root)); });
  const frames = (n: number) => {
    for (let i = 0; i < n; i++) {
      now += 1000 / 60;
      const run = q;
      q = [];
      act(() => { for (const [, fn] of run) fn(now); });
    }
  };
  const wait = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });
  const click = (text: string) => {
    const btn = [...host.querySelectorAll("button")].find((x) => x.textContent?.trim() === text);
    if (!btn) throw new Error(`no button ${text}`);
    act(() => { btn.click(); });
  };
  const game = () => {
    const m: any = host.querySelector("main");
    let f = m[Object.keys(m).find((k) => k.startsWith("__reactFiber"))!];
    while (f && typeof f.type !== "function") f = f.return;
    return f.memoizedState.next.memoizedState.current;
  };
  const hud = () => [...host.querySelectorAll("[data-hud]")].map((e) => e.getAttribute("data-hud")).sort();
  const hint = () => host.querySelector(".sf-hint.sf-on")?.textContent ?? null;
  const start = (phase: string) => {
    history.replaceState(null, "", `/space-fish/?phase=${phase}`);
    click("Start");
    frames(10);
  };
  frames(2);
  return { host, root, frames, wait, click, game, hud, hint, start };
}
const pointer = (el: Element, type: string, x: number, y: number) =>
  act(() => { el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y })); });

describe("VP rule 7: per-phase controls on a phone (844x390, coarse pointer)", () => {
  const want: Record<string, string[]> = {
    stealth: ["fire", "hint", "hp", "noise", "objective", "pause", "sneak", "stick", "use"],
    rescue: ["fire", "hint", "hp", "objective", "pause", "stick", "use"],
    base: ["base", "fire", "hint", "hp", "objective", "pause", "stick", "use"],
    shooter: ["fire", "hint", "hp", "kits", "objective", "pause", "stick"],
  };
  for (const phase of Object.keys(want)) {
    it(`${phase}: ${want[phase].join(", ")}`, async () => {
      const b = await boot(844, 390, true);
      b.start(phase);
      expect(b.hud()).toEqual(want[phase]);
      const fire = b.host.querySelector('[data-hud="fire"]')!.textContent;
      expect(fire).toBe(phase === "stealth" ? "Dig" : "Fire");
      // targets: Use 56, Sneak/Noise 44, Fire 72 at 2:1 or wider (VP v0.1.2 §5, §1)
      for (const [k, px] of [["use", "56px"], ["noise", "44px"], ["sneak", "44px"]]) {
        const el = b.host.querySelector(`[data-hud="${k}"]`) as HTMLElement | null;
        if (el) expect([el.style.width, el.style.height]).toEqual([px, px]);
      }
      const f = b.host.querySelector('[data-hud="fire"]') as HTMLElement;
      expect([f.style.width, f.style.height]).toEqual(["var(--sf-fire)", "var(--sf-fire)"]);
      expect((b.host.querySelector(".sf-buttons") as HTMLElement).style.getPropertyValue("--sf-fire")).toBe("72px");
      act(() => b.root.unmount());
    });
  }
  it("cutscene: only Skip shows (no Pause slot, no stick, no Fire)", async () => {
    const b = await boot(844, 390, true);
    b.click("Start");
    b.frames(10);
    expect(b.game().mode).toBe("cutscene");
    expect([...b.host.querySelectorAll("button")].map((x) => x.textContent)).toEqual(["Skip"]);
    expect(b.host.querySelector("#sf-pause-slot")).toBeNull();
    expect(b.hud()).toEqual([]);
    expect(b.host.querySelector(".sf-cutrow.sf-safe")).not.toBeNull();
    act(() => b.root.unmount());
  });
  it("667x375 (narrower than 2:1): Fire drops to 64, nothing smaller", async () => {
    const b = await boot(667, 375, true);
    b.start("rescue");
    expect((b.host.querySelector(".sf-buttons") as HTMLElement).style.getPropertyValue("--sf-fire")).toBe("64px");
    act(() => b.root.unmount());
  });
  it("labels: 12 px under each button, each gone after that button's first 3 uses", async () => {
    const b = await boot(844, 390, true);
    b.start("stealth");
    const label = (k: string) => b.host.querySelector(`.sf-btn-${k} .sf-btn-label`)?.textContent ?? null;
    expect([label("fire"), label("use"), label("sneak"), label("noise")]).toEqual(["Dig", "Use", "Sneak", "Noise"]);
    const use = b.host.querySelector('[data-hud="use"]')! as any;
    use.setPointerCapture = () => {};
    // the label sits beside the button, so the button's own text is unchanged
    expect(use.textContent).toBe("Use");
    for (let i = 0; i < 3; i++) {
      expect(label("use")).toBe("Use");
      pointer(use, "pointerdown", 0, 0);
      pointer(use, "pointerup", 0, 0);
      b.frames(2);
    }
    expect(label("use")).toBeFalsy();
    expect(label("fire")).toBe("Dig");
    act(() => b.root.unmount());
  });
  it("desktop: the same strip and Pause slot, no touch controls, the REPAIR hint stays in the tray", async () => {
    const b = await boot(1280, 800, false);
    b.start("base");
    expect(b.hud()).toEqual(["base", "hint", "hp", "objective", "pause"]);
    expect(b.host.querySelector(".sf-tray")!.textContent).toContain(REPAIR_HINT);
    act(() => b.root.unmount());
  });
});

describe("F-02 coordination: Pause lives in the slot", () => {
  it("one Pause button, inside the 44x44 slot, top-right, in every play phase; the slot stays in pause", async () => {
    const b = await boot(844, 390, true);
    for (const phase of ["stealth", "rescue", "base", "shooter"]) {
      b.start(phase);
      const slot = b.host.querySelector("#sf-pause-slot")!;
      expect(slot.className).toContain("sf-pause-slot");
      expect(slot.getAttribute("data-hud")).toBe("pause");
      // no duplicate: the only Pause control is F-02's button, in the slot
      const pauses = b.host.querySelectorAll(`button[aria-label="${PAUSE_COPY.pause}"]`);
      expect(pauses.length).toBe(1);
      expect(slot.children.length).toBe(1);
      expect(slot.firstElementChild).toBe(pauses[0]);
      expect(pauses[0].className).toBe("sf-pause");
      const plate = pauses[0].querySelector(".sf-pause-plate")!;
      expect(plate.children.length).toBe(2);
      act(() => { window.dispatchEvent(new KeyboardEvent("keydown", { code: "Escape" })); });
      b.frames(2);
      expect(b.game().mode).toBe("pause");
      expect(b.host.querySelector("#sf-pause-slot")).not.toBeNull();
      b.click("Menu");
      b.click("Leave");
      b.frames(2);
    }
    expect(HUD.pause).toBe(44);
    expect(HUD.pausePlate).toBe(36);
    act(() => b.root.unmount());
  });
});

describe("VP §1 copy (touch only), one hint line at a time", () => {
  it("ground: the objective toast for 2.5 s, then exactly \"Drag the stick to walk.\" until a 0.4 s stick move", async () => {
    const b = await boot(844, 390, true);
    b.start("rescue");
    expect(b.hint()).toBe(b.game().objective());
    b.wait(HUD.toastMs);
    expect(b.hint()).toBe(HUD_HINT.touchWalk);
    expect(HUD_HINT.touchWalk).toBe("Drag the stick to walk.");
    const stick = b.host.querySelector('[data-hud="stick"]')!;
    pointer(stick, "pointerdown", 100, 300);
    pointer(stick, "pointermove", 150, 300);
    b.wait(HUD_TIMING.walkHintHideAfter * 1000 - 50);
    expect(b.hint()).toBe(HUD_HINT.touchWalk); // a short nudge is not enough
    b.wait(60);
    expect(b.hint()).toBeNull();
    pointer(stick, "pointerup", 150, 300);
    act(() => b.root.unmount());
  });
  it("Pad: after the first move, \"Tap a wreck to repair it. Same scrap cost.\" while a wreck is unrepaired", async () => {
    const b = await boot(844, 390, true);
    b.start("base");
    b.wait(HUD.toastMs);
    const stick = b.host.querySelector('[data-hud="stick"]')!;
    pointer(stick, "pointerdown", 100, 300);
    pointer(stick, "pointermove", 160, 300);
    b.wait(HUD_TIMING.walkHintHideAfter * 1000 + 10);
    pointer(stick, "pointerup", 160, 300);
    b.frames(10);
    expect(b.hint()).toBe(REPAIR_HINT);
    expect(REPAIR_HINT).toBe("Tap a wreck to repair it. Same scrap cost.");
    act(() => b.root.unmount());
  });
  it("Transit: \"Drag the stick to steer. Hold Fire to shoot.\"; no \"walk\" and no Use anywhere; no \"tap the ground\" in play", async () => {
    const b = await boot(844, 390, true);
    b.start("stealth");
    b.wait(HUD.toastMs);
    expect(b.host.textContent).not.toMatch(/tap the ground/i);
    act(() => { window.dispatchEvent(new KeyboardEvent("keydown", { code: "Escape" })); });
    b.frames(2);
    b.click("Menu");
    b.click("Leave");
    b.frames(2);
    b.start("shooter");
    b.wait(HUD.toastMs);
    expect(b.hint()).toBe(HUD_HINT.touchTransit);
    expect(HUD_HINT.touchTransit).toBe("Drag the stick to steer. Hold Fire to shoot.");
    const play = [...b.host.querySelectorAll("[data-hud-root]")].map((e) => e.textContent).join(" ");
    expect(play).not.toMatch(/walk/i);
    expect(play).not.toMatch(/tap the ground/i);
    expect([...b.host.querySelectorAll("button")].map((x) => x.textContent)).not.toContain("Use");
    act(() => b.root.unmount());
  });
  it("desktop shows no touch hint (desktop strings stay as they are)", async () => {
    const b = await boot(1280, 800, false);
    b.start("shooter");
    b.wait(HUD.toastMs);
    expect(b.hint()).toBeNull();
    act(() => b.root.unmount());
  });
});

describe("VP rules 3, 6 and VP-08: strip, boss bar, build tray", () => {
  it("HP is #E8EFE9 at full and red only under 30%", async () => {
    const b = await boot(844, 390, true);
    b.start("rescue");
    expect(b.host.querySelector(".sf-hpfill")!.className).toBe("sf-hpfill");
    b.game().player.hp = b.game().player.maxHp * 0.25;
    b.frames(10);
    expect(b.host.querySelector(".sf-hpfill")!.className).toBe("sf-hpfill sf-low");
    act(() => b.root.unmount());
  });
  it("boss: \"THE EYE\" top-centre on its own (not inside \"Kits ahead\"); the objective one-liner yields to it", async () => {
    const b = await boot(844, 390, true);
    b.start("shooter");
    act(() => { b.game().spawnEye(); });
    b.frames(10);
    const boss = b.host.querySelector('[data-hud="boss"]')!;
    expect(boss.textContent).toBe("THE EYE");
    expect(boss.closest('[data-hud="kits"]')).toBeNull();
    expect(b.host.querySelector('[data-hud="kits"]')!.textContent).not.toContain("THE EYE");
    expect(b.host.querySelector('[data-hud="objective"]')).toBeNull();
    act(() => b.root.unmount());
  });
  it("the build tray is an overlay: nothing in <main>'s flow below the canvas; it opens only while building", async () => {
    const b = await boot(844, 390, true);
    b.start("base");
    const main = b.host.querySelector("main")!;
    // the stage is <main>'s only in-flow child; everything else is a positioned HUD layer
    const inFlow = [...main.children].filter((c) => !c.hasAttribute("data-hud-root"));
    expect(inFlow.length).toBe(1);
    expect(inFlow[0].className).toBe("relative min-h-0 flex-1");
    const tray = () => b.host.querySelector(".sf-tray")!;
    const g = b.game();
    g.player.x = -9999; // far from every wreck
    b.frames(10);
    expect(tray().className).not.toContain("sf-open");
    expect(tray().getAttribute("aria-hidden")).toBe("true");
    const w = g.structures.find((s: any) => !s.repaired);
    g.player.x = w.x + 60;
    g.player.y = w.y;
    b.frames(8);
    expect(tray().className).not.toContain("sf-open"); // within 150 px, but the 0.3 s dwell isn't up
    // the dwell is timed on the frame clock; its timer re-checks once it is up
    for (let i = 0; i < 4; i++) {
      b.frames(6);
      b.wait(100);
    }
    b.frames(2);
    expect(tray().className).toContain("sf-open");
    expect(tray().getAttribute("data-hud")).toBe("tray");
    // hysteresis: 180 px keeps it open, past 200 px closes it
    g.player.x = w.x + 180;
    b.frames(10);
    expect(tray().className).toContain("sf-open");
    g.player.x = -9999;
    b.frames(10);
    expect(tray().className).not.toContain("sf-open");
    act(() => { window.dispatchEvent(new KeyboardEvent("keydown", { code: "Digit2" })); });
    b.frames(10);
    expect(tray().className).toContain("sf-open"); // a picked kind keeps it open
    act(() => b.root.unmount());
  });
});

describe("VP v0.1.2 §5 values in the stylesheet", () => {
  const css = readFileSync(join(__dirname, "..", "src", "app", "styles.css"), "utf8");
  const rule = (sel: string) => {
    const i = css.indexOf(`\n${sel} {`);
    expect(i, sel).toBeGreaterThanOrEqual(0);
    return css.slice(i, css.indexOf("}", i));
  };
  it("chips, HP bar, boss block", () => {
    expect(rule(".sf-chip")).toMatch(/height: 24px;[\s\S]*padding: 0 12px;[\s\S]*border-radius: 8px;[\s\S]*rgba\(12, 18, 24, 0\.72\)[\s\S]*font-weight: 400;[\s\S]*font-size: 12px;/);
    expect(rule(".sf-hpbar")).toMatch(/width: 96px;[\s\S]*height: 6px;[\s\S]*border-radius: 3px;[\s\S]*rgba\(232, 239, 233, 0\.18\)/);
    expect(rule(".sf-hpfill")).toMatch(/transition: width 120ms/);
    expect(rule(".sf-hpfill.sf-low")).toMatch(/#e25b4a/);
    expect(rule(".sf-boss-label")).toMatch(/font-size: 11px;[\s\S]*letter-spacing: 0\.08em;[\s\S]*uppercase;[\s\S]*rgba\(232, 239, 233, 0\.85\)/);
    expect(rule(".sf-boss-track")).toMatch(/height: 8px;[\s\S]*rgba\(232, 239, 233, 0\.18\)/);
  });
  it("Pause plate, stick ring, labels, tray", () => {
    expect(rule(".sf-pause-slot")).toMatch(/right: calc\(var\(--sf-r\) - 4px\);[\s\S]*width: 44px;[\s\S]*height: 44px;/);
    // the strip's chips end 8 px clear of the hit box: edge + 40 (box reach) + 8
    expect(rule(".sf-strip")).toMatch(/right: calc\(var\(--sf-r\) \+ 48px\);/);
    expect(rule(".sf-pause")).toMatch(/background: transparent;[\s\S]*align-items: flex-start;/);
    expect(rule(".sf-pause-plate")).toMatch(/width: 36px;[\s\S]*height: 36px;[\s\S]*border-radius: 10px;/);
    expect(rule(".sf-stick-ring.sf-active")).toMatch(/opacity: 0\.55;/);
    expect(rule(".sf-btn-label")).toMatch(/font-size: 12px;[\s\S]*rgba\(232, 239, 233, 0\.7\)/);
    expect(rule(".sf-btn-use")).toMatch(/right: calc\(var\(--sf-fire\) \+ 12px\);[\s\S]*bottom: calc\(var\(--sf-fire\) \+ 12px\);/);
    expect(rule(".sf-tray")).toMatch(/max-height: calc\(96px \+ var\(--sf-ib\)\);/);
    expect(rule(".sf-tray.sf-tray-top")).toMatch(/top: calc\(var\(--sf-t\) \+ 36px\);/);
  });
  it("letterbox: the HUD edges sit inside the bars (max(bar + 12px, inset))", () => {
    expect(rule(".sf-safe")).toMatch(/--sf-t: max\(calc\(var\(--sf-lb, 0px\) \+ 12px\), var\(--sf-it\)\);/);
  });
});
