// @vitest-environment jsdom
// F-05, the React side: while an intro beat waits for its plate, the caption box shows
// VP's "Loading…" line and an unknown-progress bar, but only after 300 ms of waiting;
// Skip stays; the caption replaces it once the plate has decoded.
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { Root } from "../src/app/SpaceFishApp";
import { CUTSCENES } from "../src/content/cutscenes";
import { INTRO_LOADING_UI } from "../src/content/introLoad";
import { mulberry32 } from "./helpers/fakeEnv";

beforeAll(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
});
let cleanup: (() => void) | null = null;
afterEach(() => {
  cleanup?.();
  cleanup = null;
});

function browser() {
  let now = 0;
  let q: Array<[number, FrameRequestCallback]> = [];
  let id = 0;
  Object.defineProperty(globalThis, "performance", { value: { now: () => now }, configurable: true, writable: true });
  window.requestAnimationFrame = (fn) => { q.push([++id, fn]); return id; };
  window.cancelAnimationFrame = (x) => { q = q.filter(([i]) => i !== x); };
  (globalThis as any).requestAnimationFrame = window.requestAnimationFrame;
  (globalThis as any).cancelAnimationFrame = window.cancelAnimationFrame;
  window.matchMedia = ((qs: string) => ({ matches: qs.includes("coarse") || qs.includes("hover: none"), addEventListener() {}, removeEventListener() {} })) as any;
  (window as any).ResizeObserver = class { observe() {} disconnect() {} };
  (globalThis as any).ResizeObserver = (window as any).ResizeObserver;
  class AC { destination = {}; currentTime = 0; createGain() { return { gain: { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }; } createOscillator() { return { frequency: {}, connect() {}, start() {}, stop() {} }; } resume() { return Promise.resolve(); } close() { return Promise.resolve(); } }
  (window as any).AudioContext = AC;
  window.HTMLMediaElement.prototype.play = function () { return Promise.resolve(); };
  window.HTMLMediaElement.prototype.pause = function () {};
  (window.HTMLCanvasElement.prototype as any).getContext = function () {
    return new Proxy({}, { get: (_t, k) => (k === "createLinearGradient" || k === "createRadialGradient" ? () => ({ addColorStop() {} }) : k === "measureText" ? () => ({ width: 10 }) : () => {}), set: () => true });
  };
  Object.defineProperty(window, "innerWidth", { value: 844, configurable: true });
  Object.defineProperty(window, "innerHeight", { value: 390, configurable: true });
  Object.defineProperty(HTMLElement.prototype, "clientWidth", { get() { return this.tagName === "CANVAS" ? 844 : 0; }, configurable: true });
  Object.defineProperty(HTMLElement.prototype, "clientHeight", { get() { return this.tagName === "CANVAS" ? 390 : 0; }, configurable: true });
  // images: menu art loads at once; plates decode only when the test says so (a slow link)
  const pending = new Map<string, () => void>();
  const proto: any = window.HTMLImageElement.prototype;
  const saved = ["complete", "naturalWidth"].map((k) => [k, Object.getOwnPropertyDescriptor(proto, k)] as const);
  Object.defineProperty(proto, "complete", { get() { return !this.src.includes("/opening/") || this.__decoded === true; }, configurable: true });
  Object.defineProperty(proto, "naturalWidth", { get() { return !this.src.includes("/opening/") || this.__decoded === true ? 256 : 0; }, configurable: true });
  proto.decode = function () {
    const img = this;
    return { then: (ok: () => void) => { pending.set(img.src.slice(img.src.indexOf("opening/")), () => { img.__decoded = true; ok(); }); } };
  };
  localStorage.clear();
  Math.random = mulberry32(4);
  return {
    pending,
    restore: () => { for (const [k, d] of saved) { if (d) Object.defineProperty(proto, k, d); else delete proto[k]; } delete proto.decode; },
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

async function mountIntro() {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  const b = browser();
  const host = document.createElement("div");
  document.body.innerHTML = "";
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => { root.render(createElement(Root)); });
  cleanup = () => { act(() => root.unmount()); b.restore(); vi.useRealTimers(); };
  b.frames(3);
  const start = [...host.querySelectorAll("button")].find((x) => x.textContent === "Start")!;
  act(() => { start.click(); });
  const box = () => host.querySelector(".sf-loading") as HTMLElement | null;
  const wait = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });
  return { b, host, box, wait };
}

describe("intro loading state (VP v0.1.1 (d))", () => {
  it("waits 300 ms before showing Loading… and the bar (a fast load never flashes it); Skip stays; the caption follows the plate", async () => {
    const { b, host, box, wait } = await mountIntro();
    // the beat is waiting from the tap, but nothing shows yet
    expect(box()).not.toBeNull();
    expect(box()!.style.visibility).toBe("hidden");
    expect(host.textContent).not.toContain(CUTSCENES.intro[0].caption);
    expect([...host.querySelectorAll("button")].some((x) => x.textContent === "Skip")).toBe(true);
    wait(INTRO_LOADING_UI.showAfterMs - 1);
    expect(box()!.style.visibility).toBe("hidden");
    wait(1);
    expect(box()!.style.visibility).toBe("");
    expect(box()!.querySelector(".sf-loading-text")!.textContent).toBe("Loading…");
    // unknown progress: an indeterminate bar (no fake percent) with the sweeping segment
    const bar = box()!.querySelector('[role="progressbar"]')!;
    expect(bar.className).toBe("sf-loadbar");
    expect(bar.hasAttribute("aria-valuenow")).toBe(false);
    expect(bar.querySelector(".sf-loadbar-seg")).not.toBeNull();
    b.frames(600); // 10 s on a slow link: still loading, never the next caption
    expect(host.textContent).toContain("Loading…");
    act(() => { b.pending.get("opening/dig.jpg")!(); });
    b.frames(2);
    expect(box()).toBeNull();
    expect(host.textContent).toContain(CUTSCENES.intro[0].caption);
  });
  it("a plate that decodes within 300 ms never shows the bar", async () => {
    const { b, host, box, wait } = await mountIntro();
    wait(200);
    act(() => { b.pending.get("opening/dig.jpg")!(); });
    b.frames(2);
    wait(200);
    expect(box()).toBeNull();
    expect(host.textContent).not.toContain("Loading…");
  });
  it("the bar's look: 160x4 r2, track #E8EFE9 a0.2, fill #3EC7C2, 40 px sweep every 1.6 s ease-in-out, static under reduced motion", () => {
    const css = readFileSync(join(__dirname, "..", "src", "app", "styles.css"), "utf8");
    const rule = (sel: string, from = 0) => {
      const i = css.indexOf(`${sel} {`, from);
      expect(i, sel).toBeGreaterThanOrEqual(0);
      return css.slice(i, css.indexOf("}", i));
    };
    expect(rule(".sf-loading-text")).toMatch(/font-weight: 400;[\s\S]*font-size: 12px;[\s\S]*rgba\(232, 239, 233, 0\.85\)/);
    expect(rule(".sf-loadbar")).toMatch(/width: 160px;[\s\S]*height: 4px;[\s\S]*border-radius: 2px;[\s\S]*rgba\(232, 239, 233, 0\.2\)/);
    expect(rule(".sf-loadbar-seg")).toMatch(/width: 40px;[\s\S]*#3ec7c2;[\s\S]*animation: sf-load-sweep 1\.6s ease-in-out infinite;/);
    const reduced = css.slice(css.lastIndexOf("@media (prefers-reduced-motion: reduce)"));
    expect(rule(".sf-loadbar-seg", css.length - reduced.length)).toMatch(/animation: none;/);
    expect(INTRO_LOADING_UI).toMatchObject({ showAfterMs: 300, barW: 160, barH: 4, segW: 40, sweepMs: 1600 });
  });
});
