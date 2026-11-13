// @vitest-environment jsdom
// R0 parity for the React shell: same pre-rendered markup as live, and the same DOM
// after every step of a scripted session (title, intro, HUD per phase, pause, credits,
// death, build bar), with the game loop driven by a fake clock.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { beforeAll, describe, expect, it } from "vitest";
import { Root } from "../src/app/SpaceFishApp";
import { mulberry32 } from "./helpers/fakeEnv";
import { REPO_ROOT, loadLive } from "./helpers/liveOracle";

let live: any;
beforeAll(async () => {
  live = await loadLive();
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
});

function setupBrowser(seed: number, w = 1280, h = 800, coarse = false) {
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
  Math.random = mulberry32(seed);
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

async function session(App: any, coarse = false) {
  const b = setupBrowser(42, coarse ? 844 : 1280, coarse ? 390 : 800, coarse);
  const host = document.createElement("div");
  document.body.innerHTML = "";
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => { root.render(createElement(App)); });
  const out: string[] = [];
  const snap = (label: string) => out.push(`${label}\n${host.innerHTML}`);
  const click = (text: string) => {
    const btn = [...host.querySelectorAll("button")].find((x) => x.textContent?.trim() === text);
    if (!btn) throw new Error(`no button ${text} in:\n${host.textContent}`);
    act(() => { btn.click(); });
  };
  const key = (code: string, up = true) => {
    act(() => { window.dispatchEvent(new KeyboardEvent("keydown", { code })); });
    if (up) act(() => { window.dispatchEvent(new KeyboardEvent("keyup", { code })); });
  };
  b.frames(2); snap("title");
  // QA's harness finds the game through React: <main>'s fiber -> first function
  // component -> second hook (useRef) -> current. Keep that path working.
  const m: any = host.querySelector("main");
  let fiber = m[Object.keys(m).find((k) => k.startsWith("__reactFiber"))!];
  while (fiber && typeof fiber.type !== "function") fiber = fiber.return;
  const g = fiber?.memoizedState?.next?.memoizedState?.current;
  out.push(`qa-hook ${typeof g?.tick} ${g?.mode} ${typeof (window as any).__controlsTest?.getSpeed}`);
  click("Credits"); b.frames(2); snap("credits");
  click("Back"); b.frames(2); snap("title again");
  click("Start"); b.frames(30); snap("intro beat 1");
  key("Space"); b.frames(30); snap("intro beat 2");
  click("Skip"); b.frames(30); snap("stealth HUD");
  act(() => { window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyD" })); });
  b.frames(60); snap("stealth moving");
  key("Escape"); b.frames(10); snap("paused");
  click("Resume"); b.frames(10); snap("resumed");
  b.frames(600); snap("stealth later");
  for (const phase of ["rescue", "base", "shooter"]) {
    key("Escape"); b.frames(5);
    click("Menu"); b.frames(5); snap(`menu from ${phase}`);
    history.replaceState(null, "", `/space-fish/?phase=${phase}`);
    click("Start"); b.frames(30); snap(`${phase} HUD`);
    if (phase === "base") { key("Digit2"); b.frames(10); snap("base build picked"); }
    b.frames(900); snap(`${phase} later`);
  }
  history.replaceState(null, "", "/space-fish/");
  act(() => root.unmount());
  return out;
}

describe("React shell matches live 69cf5be", () => {
  it("server markup equals live, and index.html ships it pre-rendered", () => {
    const a = renderToString(createElement(live.Root));
    const b = renderToString(createElement(Root));
    expect(b).toBe(a);
    const liveIndex = readFileSync(join(REPO_ROOT, "index.html"), "utf8");
    const srcIndex = readFileSync(join(REPO_ROOT, "src", "index.html"), "utf8");
    expect(liveIndex).toContain(b);
    expect(srcIndex).toContain(`<div id="root" style="display: contents">${b}</div>`);
  });

  it("desktop session: same DOM after every step", async () => {
    const a = await session(live.Root);
    const b = await session(Root);
    expect(b[1]).toBe("qa-hook function menu function");
    expect(b.length).toBe(a.length);
    for (let i = 0; i < a.length; i++) expect(b[i]).toBe(a[i]);
  });

  it("phone (coarse pointer) session: same DOM after every step", async () => {
    const a = await session(live.Root, true);
    const b = await session(Root, true);
    for (let i = 0; i < a.length; i++) expect(b[i]).toBe(a[i]);
  });
});
