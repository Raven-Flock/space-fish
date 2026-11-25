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
        expect(p!.style.width).toBe("44px");
        expect(p!.style.height).toBe("44px");
        expect(["transparent", "none"]).toContain(p!.style.background);
        expect(p!.style.alignItems).toBe("flex-start");
        const plate = p!.firstElementChild as HTMLElement;
        expect([plate.style.width, plate.style.height, plate.style.borderRadius]).toEqual(["36px", "36px", "10px"]);
        expect(plate.style.background).toBe("rgba(12, 18, 24, 0.72)");
        const bars = [...plate.children] as HTMLElement[];
        expect(bars.length).toBe(2);
        for (const bar of bars) {
          expect([bar.style.width, bar.style.height]).toEqual(["4px", "16px"]);
          expect(bar.style.background).toBe("rgb(232, 239, 233)");
        }
        const html = p!.outerHTML;
        const forced = w < h && coarse;
        // max(12px, inset), not inset + 12; the hit box reaches 4 px past the plate's edge
        expect(html).toContain(forced ? "top: max(12px, env(safe-area-inset-right))" : "top: max(12px, env(safe-area-inset-top))");
        expect(html).toContain(forced ? "right: calc(max(12px, env(safe-area-inset-bottom)) - 4px)" : "right: calc(max(12px, env(safe-area-inset-right)) - 4px)");
        // the header card stays 8 px clear of the hit box: edge + 40 (hit box) + 8
        const header = t.host.querySelector("header")!;
        expect(header.getAttribute("style")).toContain(`+ ${40 + PAUSE.clearPx}px`);
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

// ---------------------------------------------------------------------------------------
// QA-PR12 P1 (multi-touch taps) and GD ruling 2026-11-18 (held input re-acquires on resume).
// Real phones send pointer events only: during multi-touch no click follows, so none is sent
// here unless a test says so. Layout at 844x390 (client px): stick 12..160 x 230..378
// (centre 86,304), Fire 600..680 x 250..314, Pause 792..836 x 12..56, the panel's Resume,
// Mute, Menu, Stay and Leave in a row at y 200..240.
const BOX: Record<string, [number, number, number, number]> = {
  stick: [12, 230, 160, 378], fire: [600, 250, 680, 314], pause: [792, 12, 836, 56],
  resume: [300, 200, 400, 240], mute: [410, 200, 500, 240], Menu: [510, 200, 600, 240],
  Stay: [300, 200, 400, 240], Leave: [410, 200, 500, 240],
};
const centre = (k: string) => { const [l, t, r, b] = BOX[k]; return [(l + r) / 2, (t + b) / 2] as const; };
async function touchRig() {
  const proto = HTMLElement.prototype as any;
  const saved = [proto.setPointerCapture, proto.releasePointerCapture, Element.prototype.getBoundingClientRect];
  proto.setPointerCapture = () => {};
  proto.releasePointerCapture = () => {};
  Element.prototype.getBoundingClientRect = function (this: Element) {
    const k = this.getAttribute("data-f02") ?? this.getAttribute("aria-label") ?? this.textContent?.trim() ?? "";
    const r = BOX[k] ?? [0, 0, 0, 0];
    return { left: r[0], top: r[1], right: r[2], bottom: r[3], width: r[2] - r[0], height: r[3] - r[1], x: r[0], y: r[1], toJSON() {} } as DOMRect;
  };
  const prev = unmount;
  unmount = () => { prev?.(); [proto.setPointerCapture, proto.releasePointerCapture, Element.prototype.getBoundingClientRect] = saved; };
  const t = await mount(844, 390, true);
  const prevU = unmount;
  unmount = () => { prevU?.(); [proto.setPointerCapture, proto.releasePointerCapture, Element.prototype.getBoundingClientRect] = saved; };
  history.replaceState(null, "", "/space-fish/?phase=rescue");
  t.click(t.button("Start"));
  t.b.frames(5);
  const g = () => t.game();
  const el = (k: string) =>
    (k === "stick" || k === "fire" || k === "resume" || k === "mute"
      ? t.host.querySelector(`[data-f02="${k}"]`)
      : k === "pause" ? t.pauseBtn() : t.button(k)) as HTMLElement | null;
  /** a pointer event on an element (or on the page body when the control is gone) */
  const ptr = (type: string, id: number, x: number, y: number, on?: Element | null) => {
    const e = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 });
    Object.defineProperty(e, "pointerId", { value: id });
    Object.defineProperty(e, "pointerType", { value: "touch" });
    act(() => { (on ?? document.body).dispatchEvent(e); });
  };
  /** tap a control with a pointer: down and up inside it, no click */
  const tap = (k: string, id: number) => {
    const [x, y] = centre(k);
    const target = el(k);
    if (!target) throw new Error(`no ${k}`);
    ptr("pointerdown", id, x, y, target);
    ptr("pointerup", id, x, y, target);
    t.b.frames(2);
  };
  const key = (code: string) => act(() => { window.dispatchEvent(new KeyboardEvent("keydown", { code, key: code, bubbles: true })); window.dispatchEvent(new KeyboardEvent("keyup", { code, key: code, bubbles: true })); });
  const knob = () => el("stick")?.querySelector<HTMLElement>('span[style*="translate"]')?.style.transform;
  return { t, g, el, ptr, tap, key, knob };
}
const LOCK_FRAMES = Math.floor(PAUSE.resumeIgnoreMs / (1000 / 60)) + 1; // first frame with now >= lock

describe("QA-PR12 P1: Pause and the panel act on pointerup inside the button (multi-touch sends no click)", () => {
  for (const held of ["stick", "fire"] as const) {
    it(`a second finger taps Pause, then Resume, while one finger holds the ${held === "stick" ? "stick" : "Fire button"}`, async () => {
      const r = await touchRig();
      const [hx, hy] = centre(held);
      r.ptr("pointerdown", 1, hx, hy, r.el(held));
      if (held === "stick") r.ptr("pointermove", 1, hx + 40, hy, r.el("stick"));
      r.t.b.frames(3);
      if (held === "stick") expect(r.g().stickX).toBeGreaterThan(0);
      else expect(r.g().fireLatch).toBe(true);
      r.tap("pause", 2);
      expect(r.g().mode).toBe("pause");
      expect(r.t.host.textContent).toContain("Paused");
      r.tap("resume", 3); // finger 1 is still down
      expect(r.g().mode).toBe("play");
    });
  }
  it("a press that slides off Pause and lifts outside does nothing, and the browser's click for it is ignored", async () => {
    const r = await touchRig();
    const p = r.el("pause")!;
    r.ptr("pointerdown", 2, 814, 30, p);
    r.ptr("pointerup", 2, 700, 120, p); // captured, so the lift still reaches the button
    r.t.b.frames(2);
    expect(r.g().mode).toBe("play");
    act(() => { p.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 })); });
    r.t.b.frames(2);
    expect(r.g().mode).toBe("play");
  });
  it("no double fire: the click after a Mute tap is dropped; keyboard Enter/Space (a detail-0 click) still works; Menu, Stay and Leave work by pointer", async () => {
    const r = await touchRig();
    r.tap("pause", 2);
    r.tap("mute", 3);
    expect(r.g().audio.muted).toBe(true);
    const m = r.el("mute")!;
    act(() => { m.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 })); }); // the tap's own click
    expect(r.g().audio.muted).toBe(true);
    expect(m.getAttribute("aria-pressed")).toBe("true");
    act(() => { m.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 0 })); }); // Enter or Space
    expect(r.g().audio.muted).toBe(false);
    r.tap("Menu", 4);
    expect(r.t.host.querySelector('[data-f02="confirm"]')).toBeTruthy();
    r.tap("Stay", 5);
    expect(r.t.host.querySelector('[data-f02="confirm"]')).toBe(null);
    r.tap("Menu", 6);
    r.tap("Leave", 7);
    expect(r.g().mode).toBe("menu");
  });
  it("Pause is keyboard-activatable: Enter/Space on the focused button pauses (detail-0 click)", async () => {
    const r = await touchRig();
    const p = r.el("pause")!;
    act(() => { p.focus(); p.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 0 })); });
    r.t.b.frames(2);
    expect(r.g().mode).toBe("pause");
  });
});

describe("GD ruling 2026-11-18: held stick and Fire re-acquire after the resume window", () => {
  it("(1) a stick finger held through Pause/Resume re-acquires the stick centred where it is (zero deflection, no lurch) and moves the fish within one tick", async () => {
    const r = await touchRig();
    r.g().fish = [];
    const [cx, cy] = centre("stick");
    r.ptr("pointerdown", 1, cx, cy, r.el("stick"));
    r.ptr("pointermove", 1, cx + 40, cy, r.el("stick"));
    r.t.b.frames(3);
    expect(r.g().stickX).toBeGreaterThan(0);
    r.tap("pause", 2);
    expect([r.g().stickX, r.g().stickY]).toEqual([0, 0]);
    r.ptr("pointermove", 1, cx + 20, cy - 30); // the finger drifts while paused
    r.tap("resume", 3);
    r.ptr("pointermove", 1, cx + 25, cy - 30);
    expect([r.g().stickX, r.g().stickY]).toEqual([0, 0]); // dead inside the window
    expect(r.knob()).toBe("translate(calc(-50% + 0px), calc(-50% + 0px))");
    let before = [r.g().player.x, r.g().player.y];
    let n = 0;
    while (r.g().inputLocked()) { // step to the frame where the window ends (re-acquired at cx+25, cy-30)
      before = [r.g().player.x, r.g().player.y];
      r.t.b.frames(1);
      n++;
    }
    expect(n).toBeGreaterThan(0);
    expect(n + 2).toBeLessThanOrEqual(LOCK_FRAMES); // tap() already ran 2 frames
    expect([r.g().stickX, r.g().stickY]).toEqual([0, 0]);
    expect(r.knob()).toBe("translate(calc(-50% + 0px), calc(-50% + 0px))");
    expect([r.g().player.x, r.g().player.y]).toEqual(before); // no lurch
    r.ptr("pointermove", 1, cx + 25 + 50, cy - 30); // 50 px right of the new centre
    expect(r.g().stickX).toBeGreaterThan(0);
    expect(r.g().stickY).toBe(0);
    const x0 = r.g().player.x;
    r.t.b.frames(1);
    expect(r.g().player.x).toBeGreaterThan(x0);
    r.ptr("pointerup", 1, cx + 75, cy - 30); // lifting it releases the stick
    expect([r.g().stickX, r.g().stickY]).toEqual([0, 0]);
  });
  it("(2) a Fire finger still inside Fire's bounds re-acquires held Fire; one that slid off does not", async () => {
    for (const slide of [false, true]) {
      const r = await touchRig();
      const [fx, fy] = centre("fire");
      r.ptr("pointerdown", 4, fx, fy, r.el("fire"));
      r.t.b.frames(2);
      expect(r.g().fireLatch).toBe(true);
      r.tap("pause", 2);
      expect(r.g().fireLatch).toBe(false);
      if (slide) r.ptr("pointermove", 4, fx, fy - 120); // off the button
      else r.ptr("pointermove", 4, fx + 20, fy + 10); // still on it
      r.tap("resume", 3);
      r.t.b.frames(LOCK_FRAMES);
      expect(r.g().fireLatch, slide ? "slid off" : "still on Fire").toBe(!slide);
      r.ptr("pointerup", 4, fx, fy);
      expect(r.g().fireLatch).toBe(false);
      unmount!();
      unmount = null;
    }
  });
  it("(3) the pointer that pressed Pause or Resume is never adopted, even if it ends up on the stick or Fire", async () => {
    const r = await touchRig();
    const [cx, cy] = centre("stick");
    const [fx, fy] = centre("fire");
    r.ptr("pointerdown", 7, 814, 30, r.el("pause")); // pressed on Pause first, not lifted
    r.ptr("pointerdown", 1, cx, cy, r.el("stick")); // the real stick finger
    r.key("Escape"); // pause from the keyboard while both are down
    r.t.b.frames(2);
    expect(r.g().mode).toBe("pause");
    const [rx, ry] = centre("resume");
    r.ptr("pointerdown", 8, rx, ry, r.el("resume")); // pressed on Resume, not lifted
    r.ptr("pointermove", 7, fx, fy); // both slide onto Fire
    r.ptr("pointermove", 8, fx + 5, fy);
    r.key("Escape"); // resume from the keyboard
    r.t.b.frames(LOCK_FRAMES + 2);
    expect(r.g().mode).toBe("play");
    expect(r.g().fireLatch).toBe(false);
    // only finger 1 drives the stick; 7 and 8 move nothing
    r.ptr("pointermove", 7, cx + 60, cy);
    r.ptr("pointermove", 8, cx + 60, cy);
    expect(r.g().stickX).toBe(0);
    r.ptr("pointermove", 1, cx - 60, cy);
    expect(r.g().stickX).toBeLessThan(0);
  });
  it("(5) fingers lifted or cancelled during the pause leave nothing stuck, and the stick works normally after", async () => {
    const r = await touchRig();
    const [cx, cy] = centre("stick");
    const [fx, fy] = centre("fire");
    r.ptr("pointerdown", 1, cx + 40, cy, r.el("stick"));
    r.ptr("pointerdown", 4, fx, fy, r.el("fire"));
    r.t.b.frames(2);
    r.tap("pause", 2);
    r.ptr("pointerup", 1, cx + 40, cy); // lifted while paused
    r.ptr("pointercancel", 4, fx, fy); // cancelled while paused
    r.tap("resume", 3);
    r.t.b.frames(LOCK_FRAMES + 5);
    expect([r.g().stickX, r.g().stickY, r.g().fireLatch]).toEqual([0, 0, false]);
    r.ptr("pointermove", 1, cx + 60, cy); // a stray move for the lifted id does nothing
    expect(r.g().stickX).toBe(0);
    r.ptr("pointerdown", 9, cx, cy, r.el("stick")); // a fresh touch on the stick
    r.ptr("pointermove", 9, cx + 50, cy, r.el("stick"));
    expect(r.g().stickX).toBeGreaterThan(0);
  });
});
