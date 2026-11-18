// @vitest-environment jsdom
// F-02 touch pause, the React side: the Pause button (VP v0.1.2: a 36x36 plate inside the
// 36 px strip, in a transparent 44x44 hit box) in every play phase and the three QA
// viewports (incl. forced-rotate), hidden in cutscenes and menus; the Paused panel's
// Resume / Mute (persisted, aria-pressed) / Menu with VP's confirm (Stay focused, then Leave).
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { Root } from "../src/app/SpaceFishApp";
import { PAUSE } from "../src/content/tuning/pause";
import { PAUSE_COPY } from "../src/content/hud";
import { MUTE_KEY } from "../src/save/keys";
import { mulberry32 } from "./helpers/fakeEnv";

beforeAll(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
});

let unmount: (() => void) | null = null;
afterEach(() => {
  unmount?.();
  unmount = null;
  history.replaceState(null, "", "/space-fish/");
});

function browser(w: number, h: number, coarse: boolean) {
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
  class AC { destination = {}; currentTime = 0; createGain() { return { gain: { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }; } createOscillator() { return { frequency: {}, connect() {}, start() {}, stop() {} }; } resume() { return Promise.resolve(); } suspend() { return Promise.resolve(); } close() { return Promise.resolve(); } }
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
  Math.random = mulberry32(3);
  return {
    frames(n: number) {
      for (let i = 0; i < n; i++) {
        now += 1000 / 60;
        const run = q;
        q = [];
        act(() => { for (const [, fn] of run) fn(now); });
      }
    },
  };
}

async function mount(w: number, h: number, coarse: boolean, keepStorage = false) {
  if (!keepStorage) localStorage.clear();
  const b = browser(w, h, coarse);
  const host = document.createElement("div");
  document.body.innerHTML = "";
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => { root.render(createElement(Root)); });
  unmount = () => act(() => root.unmount());
  const buttons = () => [...host.querySelectorAll("button")];
  const button = (text: string) => buttons().find((x) => x.textContent?.trim() === text);
  const click = (el: Element | undefined | null) => {
    if (!el) throw new Error(`no such button in:\n${host.textContent}`);
    act(() => { (el as HTMLElement).click(); });
  };
  const pauseBtn = () => host.querySelector<HTMLButtonElement>('button[aria-label="Pause"]');
  const m: any = host.querySelector("main");
  let fiber = m[Object.keys(m).find((k) => k.startsWith("__reactFiber"))!];
  while (fiber && typeof fiber.type !== "function") fiber = fiber.return;
  const game = () => fiber?.memoizedState?.next?.memoizedState?.current;
  b.frames(2);
  return { b, host, button, click, pauseBtn, game };
}

const VIEWPORTS: Array<[number, number, boolean, string]> = [
  [844, 390, true, "phone landscape 844×390"],
  [667, 375, true, "phone landscape 667×375"],
  [390, 844, true, "phone portrait 390×844 (forced-rotate)"],
  [1280, 800, false, "desktop"],
];

describe("Pause button", () => {
  for (const [w, h, coarse, label] of VIEWPORTS) {
    it(`${label}: shows in every play phase, a 36 px plate in a 44×44 hit box, top-right at max(12px, safe area), and pauses`, async () => {
      for (const phase of ["stealth", "rescue", "base", "shooter"]) {
        const t = await mount(w, h, coarse);
        history.replaceState(null, "", `/space-fish/?phase=${phase}`);
        expect(t.pauseBtn(), `${phase}: none on the title`).toBe(null);
        t.click(t.button("Start"));
        t.b.frames(10);
        const p = t.pauseBtn();
        expect(p, `${label} ${phase}`).not.toBe(null);
        // hit box: transparent 44x44; the plate sits at its top, so the box hangs 8 px below
        expect([PAUSE.hitPx, PAUSE.platePx, PAUSE.plateRadius, PAUSE.hangPx]).toEqual([44, 36, 10, 8]);
        // F-04 places it: the button fills the 44x44 slot (#sf-pause-slot, styled in
        // styles.css: .sf-pause-slot / .sf-pause / .sf-pause-plate, see phone-hud-ui)
        const slot = p!.parentElement!;
        expect(slot.id).toBe("sf-pause-slot");
        expect(p!.className).toBe("sf-pause");
        const forced = w < h && coarse;
        // max(12px, inset) on the device's own edges, also when <main> is rotated
        expect(slot.className.split(" ")).toEqual(forced ? ["sf-safe", "sf-pause-slot", "sf-forced"] : ["sf-safe", "sf-pause-slot"]);
        const plate = p!.firstElementChild as HTMLElement;
        expect(plate.className).toBe("sf-pause-plate");
        const bars = [...plate.children] as HTMLElement[];
        expect(bars.length).toBe(2);
        for (const bar of bars) {
          expect([bar.style.width, bar.style.height]).toEqual(["4px", "16px"]);
          expect(bar.style.background).toBe("rgb(232, 239, 233)");
        }
        // one Pause control only (F-04 reserved the slot; F-02 fills it, no duplicate)
        expect(t.host.querySelectorAll('button[aria-label="Pause"]').length).toBe(1);
        t.click(p);
        t.b.frames(2);
        expect(t.game().mode).toBe("pause");
        expect(t.pauseBtn()).toBe(null);
        expect(t.host.textContent).toContain("Paused");
        unmount!();
        unmount = null;
      }
    });
  }
  it("hidden during cutscenes (Skip stays) and on the title, credits and death screens", async () => {
    const t = await mount(844, 390, true);
    expect(t.pauseBtn()).toBe(null);
    t.click(t.button("Start"));
    t.b.frames(10);
    expect(t.game().mode).toBe("cutscene");
    expect(t.button("Skip")).toBeTruthy();
    expect(t.pauseBtn()).toBe(null);
    t.click(t.button("Skip"));
    t.b.frames(5);
    expect(t.pauseBtn()).not.toBe(null);
    act(() => { t.game().player.hp = 0; });
    t.b.frames(5);
    expect(t.game().mode).toBe("dead");
    expect(t.pauseBtn()).toBe(null);
  });
});

describe("Paused panel", () => {
  it("Resume, Mute (persisted) and Menu; Menu asks first, Stay goes back, Leave goes to the title with Continue", async () => {
    let t = await mount(844, 390, true);
    history.replaceState(null, "", "/space-fish/?phase=rescue");
    t.click(t.button("Start"));
    t.b.frames(5);
    t.click(t.pauseBtn());
    t.b.frames(2);
    expect(t.host.querySelector("h1")?.textContent).toBe("Paused");
    expect(t.button("Resume")).toBeTruthy();
    expect(t.button("Menu")).toBeTruthy();
    t.click(t.button("Mute"));
    expect(t.button("Unmute")?.getAttribute("aria-pressed")).toBe("true");
    expect(MUTE_KEY).toBe("spacefish-muted"); // F-07's key: one persisted mute
    expect(localStorage.getItem(MUTE_KEY)).toBe("1");
    expect(t.game().audio.muted).toBe(true);
    t.click(t.button("Resume"));
    t.b.frames(2);
    expect(t.game().mode).toBe("play");
    t.click(t.pauseBtn());
    t.b.frames(2);
    t.click(t.button("Menu"));
    expect(PAUSE_COPY.confirm).toBe("Leave to the title? This chapter starts over when you continue.");
    expect(t.host.textContent).toContain(PAUSE_COPY.confirm);
    expect(t.game().mode).toBe("pause");
    // Stay first, primary and focused by default; then Leave; no red on either
    const confirm = t.host.querySelector('[data-f02="confirm"]')!;
    const order = [...confirm.querySelectorAll("button")].map((x) => x.textContent);
    expect(order).toEqual(["Stay", "Leave"]);
    expect(document.activeElement?.textContent).toBe("Stay");
    expect(t.button("Stay")!.className).toContain("bg-primary");
    expect(confirm.innerHTML).not.toMatch(/red|danger|destructive|#e25b4a/i);
    t.click(t.button("Stay"));
    expect(t.button("Resume")).toBeTruthy();
    t.click(t.button("Menu"));
    t.click(t.button("Leave"));
    t.b.frames(2);
    expect(t.game().mode).toBe("menu");
    expect(t.button("Continue")).toBeTruthy();
    t.click(t.button("Continue"));
    t.b.frames(2);
    expect([t.game().mode, t.game().phase]).toEqual(["play", "rescue"]);
    unmount!();
    unmount = null;
    // the next visit starts muted
    t = await mount(844, 390, true, true);
    history.replaceState(null, "", "/space-fish/?phase=rescue");
    t.click(t.button("Start"));
    t.b.frames(5);
    t.click(t.pauseBtn());
    t.b.frames(2);
    expect(t.button("Unmute")).toBeTruthy();
    expect(t.button("Unmute")!.getAttribute("aria-pressed")).toBe("true");
    t.click(t.button("Unmute"));
    expect(t.button("Mute")!.getAttribute("aria-pressed")).toBe("false");
    expect(localStorage.getItem(MUTE_KEY)).toBe("0");
  });
  it("a pause taken during a cutscene shows only the panel (no play HUD) and Resume returns to the cutscene", async () => {
    const t = await mount(844, 390, true);
    t.click(t.button("Start"));
    t.b.frames(10);
    act(() => { window.dispatchEvent(new Event("blur")); });
    t.b.frames(2);
    expect(t.game().mode).toBe("pause");
    expect(t.host.querySelector("header")).toBe(null);
    t.click(t.button("Resume"));
    t.b.frames(2);
    expect(t.game().mode).toBe("cutscene");
    expect(t.button("Skip")).toBeTruthy();
  });
});
