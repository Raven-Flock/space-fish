// @vitest-environment jsdom
// Parity for the React shell vs live 1c9c028: same pre-rendered markup, and the same DOM
// after every step of a scripted session (title, intro, HUD per phase, pause, credits,
// death, build bar), with the game loop driven by a fake clock.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { Root } from "../src/app/SpaceFishApp";
import { HUD_HINT, TITLE_HELP } from "../src/content/hud";
import { HUD_TIMING } from "../src/content/tuning/hud";
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
  window.HTMLMediaElement.prototype.load = function () {};
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

// Intended copy changes (QA N-7, the D-11 shovel hint, F-07 Music default), applied to live's
// output before comparing. Each must be used, so a stale exception fails the suite.
const COPY: Array<[string, string]> = [
  [
    "Q throws noise. E uses. On a phone,",
    "Q throws noise. E: use, or swing the shovel. Space steps a scene forward. Esc pauses. On a phone,",
  ],
  ["Tap a wreck to repair it. Same scrap cost. Nothing new gets placed.", "Tap a wreck to repair it. Same scrap cost."],
  // F-07: Sound's Music default 0.8 (gain = v*v, ~0.8 dB under live's linear 0.7)
  [
    'aria-label="Music volume" style="width: 9rem; accent-color: rgb(212, 162, 74);" type="range" value="0.7"',
    'aria-label="Music volume" style="width: 9rem; accent-color: rgb(212, 162, 74);" type="range" value="0.8"',
  ],
];
function withCopy(s: string, used: Set<number>, coarse = false) {
  COPY.forEach(([from, to], i) => {
    if (s.includes(from)) {
      used.add(i);
      s = s.split(from).join(to);
    }
  });
  return coarse ? withTouch(s, used) : s;
}
// v0.3, VP-PHONE-HUD-v0.1 (touch sessions only), keyed on the snapshot label so each
// change applies only where it is intended (ids 10-13, each must be used):
// 10 the ground walk hint becomes VP's copy; 11 Transit gets the steer line, shown at
// first and faded out (opacity 0, aria-hidden) by "shooter later" (8 s rule);
// 12 Transit hides the Use button; 13 the title's aim sentence uses the touch line.
const LIVE_TOUCH_HINT = "Stick or tap the ground to walk.";
const LIVE_HINT_P = `<p class="mt-1 text-xs text-muted">${LIVE_TOUCH_HINT}</p>`;
const LIVE_USE_BUTTON = /<button type="button" class="font-display font-bold" style="[^"]*">Use<\/button>/g;
const LIVE_TITLE_AIM = "Hold Fire and tap the ground to aim.";
const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const isTransit = (s: string) => /^shooter (HUD|later)\n/.test(s);
const transitHintP = (hidden: boolean) =>
  `<p class="mt-1 text-xs text-muted" style="opacity: ${hidden ? 0 : 1}; transition: opacity ${HUD_TIMING.hintFadeMs}ms;"${hidden ? ' aria-hidden="true"' : ""}>${esc(HUD_HINT.touchTransit)}</p>`;
function withTouch(s: string, used: Set<number>) {
  if (s.includes(LIVE_TITLE_AIM)) { used.add(13); s = s.split(LIVE_TITLE_AIM).join(esc(TITLE_HELP.aimTouch)); }
  if (isTransit(s)) {
    if (s.includes(LIVE_HINT_P)) { used.add(11); s = s.split(LIVE_HINT_P).join(transitHintP(s.startsWith("shooter later\n"))); }
    if (s.match(LIVE_USE_BUTTON)) { used.add(12); s = s.replace(LIVE_USE_BUTTON, ""); }
  } else if (s.includes(LIVE_TOUCH_HINT)) {
    used.add(10);
    s = s.split(LIVE_TOUCH_HINT).join(esc(HUD_HINT.touchWalk));
  }
  return s;
}
const textOf = (html: string) => html.replace(/<[^>]*>/g, " ");

describe("React shell matches live 1c9c028 (plus intended copy changes)", () => {
  it("server markup equals live, and both index.html files ship the matching pre-render (QA N-4, #418)", () => {
    const a = renderToString(createElement(live.Root));
    const b = renderToString(createElement(Root));
    const used = new Set<number>();
    expect(b).toBe(withCopy(a, used));
    expect(used.has(0)).toBe(true);
    // the served root index.html hydrates the live bundle, so it must hold live's markup
    const liveIndex = readFileSync(join(REPO_ROOT, "index.html"), "utf8");
    const live404 = readFileSync(join(REPO_ROOT, "404.html"), "utf8");
    const srcIndex = readFileSync(join(REPO_ROOT, "src", "index.html"), "utf8");
    expect(liveIndex).toContain(`<div id="root" style="display: contents">${a}</div>`);
    expect(live404).toContain(`<div id="root" style="display: contents">${a}</div>`);
    expect(srcIndex).toContain(`<div id="root" style="display: contents">${b}</div>`);
  });

  it("desktop session: same DOM after every step", async () => {
    const a = await session(live.Root);
    const b = await session(Root);
    const used = new Set<number>();
    expect(b[1]).toBe("qa-hook function menu function");
    expect(b.length).toBe(a.length);
    for (let i = 0; i < a.length; i++) expect(b[i]).toBe(withCopy(a[i], used));
    expect([...used].sort()).toEqual([0, 1, 2]);
  });

  it("phone (coarse pointer) session: same DOM after every step", async () => {
    const a = await session(live.Root, true);
    const b = await session(Root, true);
    const used = new Set<number>();
    expect(b.length).toBe(a.length);
    for (let i = 0; i < a.length; i++) expect(b[i]).toBe(withCopy(a[i], used, true));
    expect([...used].sort((x, y) => x - y)).toEqual([0, 1, 2, 10, 11, 12, 13]);
  });

  it("no 'walk' anywhere in Transit (desktop and phone), and Use is hidden there on a phone", async () => {
    for (const coarse of [false, true]) {
      const b = await session(Root, coarse);
      const transit = b.filter(isTransit);
      expect(transit.length).toBe(2);
      for (const t of transit) {
        expect(textOf(t)).not.toMatch(/walk/i);
        expect(t).not.toMatch(/>Use<\/button>/);
      }
      if (coarse) {
        expect(transit.every((t) => t.includes(esc(HUD_HINT.touchTransit)))).toBe(true);
        expect(b.find((t) => t.startsWith("rescue HUD\n"))).toMatch(/>Use<\/button>/);
        expect(b.find((t) => t.startsWith("stealth HUD\n"))).toContain(HUD_HINT.touchWalk);
      }
    }
  });

  it("title aim line: touch shows the VP line, desktop keeps the live line", async () => {
    const phone = await session(Root, true);
    const desk = await session(Root, false);
    const title = (b: string[]) => b.find((t) => t.startsWith("title\n"))!;
    expect(title(phone)).toContain(TITLE_HELP.aimTouch);
    expect(title(phone)).not.toContain(LIVE_TITLE_AIM);
    expect(title(desk)).toContain(LIVE_TITLE_AIM);
    expect(title(desk)).not.toContain(TITLE_HELP.aimTouch);
    expect(TITLE_HELP.aimTouch).toBe("Hold Fire, then tap to aim.");
    expect(TITLE_HELP.aimDesktop).toBe(LIVE_TITLE_AIM);
  });

  it("phone Transit hint: shown, then faded (300 ms, aria-hidden) after Fire is held 2 s in total, before the 8 s cap", async () => {
    const b = setupBrowser(42, 844, 390, true);
    const host = document.createElement("div");
    document.body.innerHTML = "";
    document.body.appendChild(host);
    const root = createRoot(host);
    const proto = HTMLElement.prototype as any;
    const hadCapture = proto.setPointerCapture;
    proto.setPointerCapture = () => {};
    proto.releasePointerCapture = () => {};
    try {
      await act(async () => { root.render(createElement(Root)); });
      history.replaceState(null, "", "/space-fish/?phase=shooter");
      b.frames(2);
      const btn = (text: string) => [...host.querySelectorAll("button")].find((x) => x.textContent?.trim() === text)!;
      act(() => { btn("Start").click(); });
      b.frames(30);
      const hint = () => [...host.querySelectorAll("p")].find((p) => p.textContent === HUD_HINT.touchTransit)!;
      expect(hint().style.opacity).toBe("1");
      expect(hint().style.transition).toBe(`opacity ${HUD_TIMING.hintFadeMs}ms`);
      const fire = (type: string) => {
        const e = new MouseEvent(type, { bubbles: true, cancelable: true });
        Object.defineProperty(e, "pointerId", { value: 1 });
        act(() => { btn("Fire").dispatchEvent(e); });
      };
      // 1.2 s held, released 1 s, then 0.9 s more: 2.1 s in total, 3.1 s into Transit
      fire("pointerdown"); b.frames(72); fire("pointerup");
      b.frames(60);
      expect(hint().style.opacity).toBe("1");
      fire("pointerdown"); b.frames(54); fire("pointerup");
      b.frames(10);
      expect(hint().style.opacity).toBe("0");
      expect(hint().getAttribute("aria-hidden")).toBe("true");
    } finally {
      proto.setPointerCapture = hadCapture;
      history.replaceState(null, "", "/space-fish/");
      act(() => root.unmount());
    }
  });

  it("phone: the walk hint hides after the first stick move of 0.4 s or longer (VP-08), not after a shorter one", async () => {
    const run = async (holdMs: number) => {
      const b = setupBrowser(42, 844, 390, true);
      const host = document.createElement("div");
      document.body.innerHTML = "";
      document.body.appendChild(host);
      const root = createRoot(host);
      await act(async () => { root.render(createElement(Root)); });
      const click = (text: string) => {
        const btn = [...host.querySelectorAll("button")].find((x) => x.textContent?.trim() === text)!;
        act(() => { btn.click(); });
      };
      b.frames(2); click("Start"); b.frames(30); click("Skip"); b.frames(30);
      expect(host.textContent).toContain(HUD_HINT.touchWalk);
      const stick = host.querySelector('div[style*="width: 148px"]') as HTMLElement;
      stick.getBoundingClientRect = () => ({ left: 0, top: 0, width: 148, height: 148, right: 148, bottom: 148, x: 0, y: 0, toJSON() {} }) as DOMRect;
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
      try {
        const ev = (type: string, x: number) => {
          const e = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: 74 });
          Object.defineProperty(e, "pointerId", { value: 1 });
          act(() => { stick.dispatchEvent(e); });
        };
        ev("pointerdown", 140);
        act(() => { vi.advanceTimersByTime(holdMs); });
        ev("pointerup", 140);
        act(() => { vi.advanceTimersByTime(1000); });
        b.frames(10);
        return host.textContent!.includes(HUD_HINT.touchWalk);
      } finally {
        vi.useRealTimers();
        act(() => root.unmount());
      }
    };
    expect(await run(399)).toBe(true);
    expect(await run(400)).toBe(false);
  });
});
