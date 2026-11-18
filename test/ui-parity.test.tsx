// @vitest-environment jsdom
// Parity for the React shell vs live 1c9c028: same pre-rendered markup, and the same DOM
// after every step of a scripted session (title, intro, HUD per phase, pause, credits,
// death, build bar), with the game loop driven by a fake clock. Our session runs with
// F-02's entry points stubbed; the F-02 controls are stripped (withoutF02) and the real
// pause UI is asserted in touch-pause-ui.test.tsx.
// F-04 intended difference: the in-play HUD subtree (header card, REPAIR bar, touch
// controls) is replaced by the phone HUD. Both HUDs are cut out before the DOM compare,
// and the values they show (phase, objective, HP, scrap, counts, kits, boss, buttons)
// are compared separately, so everything outside the HUD must still match exactly.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { Root } from "../src/app/SpaceFishApp";
import { HUD_HINT, TITLE_HELP } from "../src/content/hud";
import { HUD, HUD_TIMING } from "../src/content/tuning/hud";
import { Game } from "../src/game/Game";
import { mulberry32 } from "./helpers/fakeEnv";
import { REPO_ROOT, loadLive } from "./helpers/liveOracle";
import { INTENDED } from "./helpers/sim";

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
  // F-05: images "load" at once (a fast link), so the intro plate gate never holds a beat here;
  // the gate itself is covered in intro-load*.test.*. Live's drawImage calls go to a no-op canvas.
  Object.defineProperty(window.HTMLImageElement.prototype, "complete", { get: () => true, configurable: true });
  Object.defineProperty(window.HTMLImageElement.prototype, "naturalWidth", { get: () => 256, configurable: true });
  // a synchronous thenable: this session never awaits, so a real Promise would never settle
  (window.HTMLImageElement.prototype as any).decode = function () { return { then: (ok: () => void) => ok() }; };
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

async function session(App: any, coarse = false, _ours = false) {
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
    click("Menu");
    // F-02: Menu on the Paused panel asks for a one-line confirm first (the death panel's doesn't)
    if ([...host.querySelectorAll("button")].some((x) => x.textContent?.trim() === "Leave")) click("Leave");
    b.frames(5); snap(`menu from ${phase}`);
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
  // F-04 (VP-11): the cutscene caption + Skip row keeps max(12px, safe-area inset) margins
  [
    'class="pointer-events-auto m-3 flex items-end justify-between gap-3 sm:m-4"',
    'class="pointer-events-auto m-3 flex items-end justify-between gap-3 sm:m-4 sf-safe sf-cutrow"',
  ],
];
/**
 * F-02 touch pause: the new controls (Pause button, Mute toggle) carry data-f02 and are
 * removed from our DOM before comparing. Each must actually appear, so a stale rule fails.
 * (F-04 removed the header card, so F-02's header padding is gone with it.)
 */
function withoutF02(s: string, seen: Set<string>) {
  return s.replace(/<button[^>]*data-f02="(pause|mute)"[^>]*>.*?<\/button>/g, (_m, k) => { seen.add(k); return ""; });
}
/** F-02's stubbed entry points (see INTENDED in helpers/sim.ts). */
const F02_METHODS = ["pausedFreeze", "pauseGame", "onPause", "onResume", "inputLocked", "autoPause", "pollPad"];
/**
 * Run our Root with F-02's entry points stubbed (as liveEquivalent does for the sim), so the
 * DOM session follows live's pause path. Earlier PRs' intended changes stay on: their copy
 * differences are applied to live's DOM by withCopy instead.
 */
async function intendedOff<T>(fn: () => Promise<T>): Promise<T> {
  const proto = Game.prototype as any;
  for (const m of F02_METHODS) expect(INTENDED.methods).toContain(m);
  const saved = F02_METHODS.map((m) => [m, proto[m]] as const);
  for (const m of F02_METHODS) proto[m] = function () { return false; };
  try {
    return await fn();
  } finally {
    for (const [m, f] of saved) proto[m] = f;
  }
}

// F-04: live's in-play HUD (replaced) and ours (data-hud-root). Each selector is matched
// against real markup, so a stale one shows up as "never used".
const LIVE_HUD = [
  "header", // the header card (VP-09: "the old header card goes")
  "main > div.overflow-x-auto.border-t", // the REPAIR bar under the canvas (now an overlay tray)
  'main > div[style*="z-index: 30"]', // the touch controls (now the F-04 layout)
];
const OUR_HUD = ["[data-hud-root]"];
function parse(html: string) {
  const t = document.createElement("template");
  t.innerHTML = html;
  return t.content;
}
function cutHud(snap: string, sels: string[], used: Set<string>) {
  const nl = snap.indexOf("\n");
  if (nl < 0) return snap;
  const root = parse(snap.slice(nl + 1));
  for (const sel of sels) {
    const found = [...root.querySelectorAll(sel)];
    if (found.length) used.add(sel);
    for (const el of found) el.remove();
  }
  const t = document.createElement("div");
  t.appendChild(root);
  return snap.slice(0, nl + 1) + t.innerHTML;
}
const txt = (el: Element | null | undefined) => el?.textContent?.replace(/\s+/g, " ").trim() ?? null;
function hudValues(snap: string, ours: boolean) {
  const nl = snap.indexOf("\n");
  const root = parse(snap.slice(nl + 1));
  const buttons = (sel: string) => [...root.querySelectorAll(`${sel} button`)].map((b) => txt(b)).sort();
  if (ours) {
    const base = root.querySelector('[data-hud="base"]');
    return {
      phase: txt(root.querySelector('[data-hud="hp"] .sf-tag')),
      objective: root.querySelector('[data-hud="objective"]')?.getAttribute("title") ?? null,
      hp: (root.querySelector(".sf-hpfill") as HTMLElement | null)?.style.width ?? null,
      alert: !!root.querySelector(".sf-alert"),
      scrap: base ? txt(base.firstElementChild) : null,
      counts: base ? [...base.querySelectorAll(".sf-ico + span")].map(txt) : null,
      kits: txt(root.querySelector('[data-hud="kits"]')),
      boss: (root.querySelector(".sf-boss-fill") as HTMLElement | null)?.style.width ?? null,
      touch: buttons('[data-hud-root="controls"]'),
      tray: buttons('[data-hud-root="tray"]'),
    };
  }
  const head = root.querySelector("header");
  const card = head?.children[1];
  const isBase = card && txt(card)?.startsWith("Scrap");
  const m = isBase ? txt(card.children[1])?.match(/Power (\d+) · Turrets (\d+)\/2 · Lab (\d+)/) : null;
  const bossBar = !isBase ? (card?.querySelector(".bg-primary") as HTMLElement | null) : null;
  return {
    phase: txt(head?.querySelector("p.font-display")),
    objective: txt(head?.querySelector("p.mt-2")) || null,
    hp: (head?.querySelector(".bg-danger") as HTMLElement | null)?.style.width ?? null,
    alert: !!head?.querySelector(".text-danger"),
    scrap: isBase ? txt(card.children[0]) : null,
    counts: m ? [m[1], `${m[2]}/2`, m[3]] : null,
    kits: !isBase && card ? txt(card.querySelector("p")) : null,
    boss: bossBar?.style.width ?? null,
    touch: buttons('main > div[style*="z-index: 30"]'),
    tray: buttons("main > div.overflow-x-auto.border-t"),
  };
}
// the same values, with the F-04 per-phase rules applied to live's (VP rule 7: no Use in
// Transit; the objective one-liner yields to the boss bar, its toast already showed it)
function expectSameHud(live: string, ours: string) {
  const a = hudValues(live, false);
  const b = hudValues(ours, true);
  if (a.phase == null) {
    expect(b.phase).toBeNull();
    return;
  }
  const want = { ...a };
  if (a.phase === "Transit") want.touch = a.touch.filter((x) => x !== "Use");
  if (a.boss != null) want.objective = null;
  expect(b).toEqual(want);
}
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
// COPY ids each session must use. 10-12 rewrite live's touch hint and Use button, which
// sit inside the cut HUD: they still have to match live's markup (so a stale rule fails),
// and F-04's own hint line is checked below and in phone-hud-ui.test.tsx.
const USED_DESKTOP = [0, 1, 2, 3];
const USED_PHONE = [0, 1, 2, 3, 10, 11, 12, 13];

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

  for (const coarse of [false, true]) {
    it(`${coarse ? "phone (coarse pointer)" : "desktop"} session: same DOM after every step outside the HUD, same HUD values`, async () => {
      const a = await session(live.Root, coarse);
      const b = await intendedOff(() => session(Root, coarse, true));
      const used = new Set<number>();
      const seen = new Set<string>();
      const cutLive = new Set<string>();
      const cutOurs = new Set<string>();
      if (!coarse) expect(b[1]).toBe("qa-hook function menu function");
      expect(b.length).toBe(a.length);
      for (let i = 0; i < a.length; i++) {
        expect(cutHud(withoutF02(b[i], seen), OUR_HUD, cutOurs)).toBe(cutHud(withCopy(a[i], used, coarse), LIVE_HUD, cutLive));
        expectSameHud(a[i], b[i]);
      }
      expect([...used].sort((x, y) => x - y)).toEqual(coarse ? USED_PHONE : USED_DESKTOP);
      expect([...seen].sort()).toEqual(["mute", "pause"]);
      expect([...cutOurs]).toEqual(OUR_HUD);
      // the REPAIR bar and the touch controls only exist in some sessions
      expect([...cutLive].sort()).toEqual((coarse ? LIVE_HUD : LIVE_HUD.slice(0, 2)).slice().sort());
    });
  }

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
        // (the hint strings themselves: the phone hint tests below; the objective toast
        // holds the one hint line in these snapshots)
        expect(b.find((t) => t.startsWith("rescue HUD\n"))).toMatch(/>Use<\/button>/);
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

  // v0.3's hint rules, on F-04's single hint line ([data-hud="hint"], sf-on while shown;
  // the objective toast takes the line for its first 2.5 s, VP "one hint line at a time")
  async function phoneRun(phase: string | null) {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const b = setupBrowser(42, 844, 390, true);
    const host = document.createElement("div");
    document.body.innerHTML = "";
    document.body.appendChild(host);
    const root = createRoot(host);
    const proto = HTMLElement.prototype as any;
    const had = [proto.setPointerCapture, proto.releasePointerCapture];
    proto.setPointerCapture = () => {};
    proto.releasePointerCapture = () => {};
    await act(async () => { root.render(createElement(Root)); });
    if (phase) history.replaceState(null, "", `/space-fish/?phase=${phase}`);
    const btn = (text: string) => [...host.querySelectorAll("button")].find((x) => x.textContent?.trim() === text)!;
    b.frames(2);
    act(() => { btn("Start").click(); });
    b.frames(30);
    if (!phase) { act(() => { btn("Skip").click(); }); b.frames(30); }
    act(() => { vi.advanceTimersByTime(HUD.toastMs + 10); });
    b.frames(2);
    const hint = () => host.querySelector('[data-hud="hint"]') as HTMLElement;
    const shown = (text: string) => hint().classList.contains("sf-on") && hint().textContent === text;
    const done = () => {
      vi.useRealTimers();
      [proto.setPointerCapture, proto.releasePointerCapture] = had;
      history.replaceState(null, "", "/space-fish/");
      act(() => root.unmount());
    };
    return { b, host, btn, hint, shown, done };
  }

  it("phone Transit hint: shown, then faded (aria-hidden) after Fire is held 2 s in total, before the 8 s cap", async () => {
    const r = await phoneRun("shooter");
    try {
      expect(r.shown(HUD_HINT.touchTransit)).toBe(true);
      const fire = (type: string) => {
        const e = new MouseEvent(type, { bubbles: true, cancelable: true });
        Object.defineProperty(e, "pointerId", { value: 1 });
        act(() => { r.btn("Fire").dispatchEvent(e); });
      };
      // 1.2 s held, released 1 s, then 0.9 s more: 2.1 s in total, well before 8 s of play
      fire("pointerdown"); r.b.frames(72); fire("pointerup");
      r.b.frames(60);
      expect(r.shown(HUD_HINT.touchTransit)).toBe(true);
      fire("pointerdown"); r.b.frames(54); fire("pointerup");
      r.b.frames(10);
      expect(r.hint().classList.contains("sf-on")).toBe(false);
      expect(r.hint().getAttribute("aria-hidden")).toBe("true");
    } finally {
      r.done();
    }
  });

  it("phone: the walk hint hides after the first stick move of 0.4 s or longer (VP-08), not after a shorter one", async () => {
    const run = async (holdMs: number) => {
      const r = await phoneRun(null);
      try {
        expect(r.shown(HUD_HINT.touchWalk)).toBe(true);
        const stick = r.host.querySelector('[data-hud="stick"]') as HTMLElement;
        stick.getBoundingClientRect = () => ({ left: 0, top: 0, width: 148, height: 148, right: 148, bottom: 148, x: 0, y: 0, toJSON() {} }) as DOMRect;
        const ev = (type: string, x: number) => {
          const e = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: 74 });
          Object.defineProperty(e, "pointerId", { value: 1 });
          act(() => { stick.dispatchEvent(e); });
        };
        ev("pointerdown", 74);
        ev("pointermove", 140);
        act(() => { vi.advanceTimersByTime(holdMs); });
        ev("pointerup", 140);
        act(() => { vi.advanceTimersByTime(1000); });
        r.b.frames(10);
        return r.shown(HUD_HINT.touchWalk);
      } finally {
        r.done();
      }
    };
    expect(await run(399)).toBe(true);
    expect(await run(400)).toBe(false);
  });
});
