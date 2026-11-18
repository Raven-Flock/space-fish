// Pure layout math for the phone HUD (F-04). No DOM: the React shell, the Game and
// the tests all use these, so the numbers QA measures are the numbers tested here.
import { HUD } from "../content/tuning/hud";

export type Insets = { left: number; top: number; right: number; bottom: number };
export const NO_INSETS: Insets = { left: 0, top: 0, right: 0, bottom: 0 };
export type Rect = { x: number; y: number; w: number; h: number };
export type HudPhase = "stealth" | "rescue" | "base" | "shooter";

/** max(12px, env(safe-area-inset-*)) (VP-11); `bar` is a letterbox bar on that edge (VP v0.1.2 §5) */
export function safeEdge(inset: number, bar = 0) {
  return Math.max(bar + HUD.edgeMin, inset || 0);
}

/**
 * Extend-width stage (VP-10): logical height 540, logical width 540 * vw / vh. The
 * central 960 column is where spawns and objectives live; what is left either side
 * is the bleed (CSS px each side). Narrower than 16:9 keeps the 960-wide fit with
 * top and bottom bars in #070B10 (the canvas clear colour), and the HUD sits inside
 * the stage with the safe-area rule still applied (VP v0.1.2 §5): letterboxPx.
 * Same numbers as engine/view.ts resize(): ox = bleed, oy = letterbox.
 */
export function stage(vw: number, vh: number) {
  const scale = Math.min(vw / HUD.columnW, vh / HUD.stageH);
  const ox = (vw - HUD.columnW * scale) / 2;
  const oy = (vh - HUD.stageH * scale) / 2;
  const bleedPx = oy < 0.5 && ox > 0 ? ox : 0;
  return {
    scale,
    ox,
    oy,
    bleedPx,
    bleed: bleedPx / scale,
    logicalW: HUD.columnW + (2 * bleedPx) / scale,
    letterboxPx: oy >= 0.5 ? oy : 0,
    pillarboxPx: 0,
  };
}

/** 2:1 or wider has a side bleed (VP v0.1.2 §1). */
export const isWide = (vw: number, vh: number) => vw >= HUD.wideAspect * vh;
/** HUD + controls cap: 12% at 2:1 or wider, 15% on narrower screens (VP v0.1.2 §1). */
export function coverCapPct(vw: number, vh: number) {
  return isWide(vw, vh) ? HUD.maxCoverPct : HUD.maxCoverPctNarrow;
}
/** Fire is 72; below 2:1 (667x375) it may drop to 64, never smaller (VP v0.1.2 §1). */
export function fireSize(vw: number, vh: number) {
  return isWide(vw, vh) ? HUD.fire : HUD.fireNarrow;
}

/** Fire sits fully in the right bleed when the bleed holds Fire plus its edge: ≥ 84 px with no notch. */
export function fireInBleed(bleedPx: number, insetRight = 0, fire = HUD.fire) {
  return bleedPx >= safeEdge(insetRight) + fire;
}

/** CSS-px x of the stick zone's right edge (the idle ring box, bottom-left). */
export function stickZoneRight(insets: Insets = NO_INSETS) {
  return safeEdge(insets.left) + HUD.stickRing;
}

/**
 * Transit clamp: the smallest ship centre x (relative to the scroll) that keeps the
 * ship's left edge ≥ stick zone + 24 px. `view` is Game.view (ox, scale in CSS px).
 */
export function shipGuardX(stickRightPx: number, view: { ox: number; scale: number }) {
  if (!(stickRightPx > 0) || !(view.scale > 0)) return 0;
  return (stickRightPx + HUD.shipClearPx - view.ox) / view.scale + HUD.shipHalfW;
}

export type HudOpts = {
  touch: boolean;
  insets?: Insets;
  boss?: boolean;
  objective?: boolean;
  tray?: boolean;
  trayW?: number;
  /** the tray flipped under the top strip (VP v0.1.2 §3) */
  trayTop?: boolean;
};

/**
 * The HUD + control rects for one phase (CSS px, canvas = the viewport). Text chips use
 * their CSS max-width caps, so the footprint is an upper bound of what the DOM measures;
 * like the strip's flex row, the objective shrinks to the room left of a right chip.
 * Transient hints, toasts and the button labels (hidden after 3 uses) are not counted
 * (VP rule 6 lists them apart), nor is the build tray while building (VP v0.1.2 §3).
 */
export function hudRects(vw: number, vh: number, phase: HudPhase, o: HudOpts) {
  const ins = o.insets ?? NO_INSETS;
  const lb = stage(vw, vh).letterboxPx;
  const L = safeEdge(ins.left);
  const T = safeEdge(ins.top, lb);
  const R = vw - safeEdge(ins.right);
  const B = vh - safeEdge(ins.bottom, lb);
  const rects: Record<string, Rect> = {};
  // top strip
  const hpW = HUD.hpChipMaxW[phase];
  rects.hp = { x: L, y: T, w: hpW, h: HUD.chipH };
  // Pause: the 44x44 hit box; its 36 px plate sits at the top right of the strip, so the
  // box reaches 4 px past the plate's right edge and hangs 8 px below the strip
  const slack = (HUD.pause - HUD.pausePlate) / 2;
  const pause = { x: R + slack - HUD.pause, y: T, w: HUD.pause, h: HUD.pause };
  const stripR = pause.x - HUD.gap;
  const boss = phase === "shooter" && !!o.boss;
  if (phase === "base") {
    rects.base = { x: stripR - HUD.baseChipMaxW, y: T, w: HUD.baseChipMaxW, h: HUD.chipH };
  }
  if (phase === "shooter") {
    rects.kits = { x: stripR - HUD.kitsChipMaxW, y: T, w: HUD.kitsChipMaxW, h: HUD.chipH };
  }
  if (o.objective !== false && !boss) {
    const x = L + hpW + HUD.gap;
    const right = (rects.base ?? rects.kits)?.x ?? stripR + HUD.gap;
    rects.objective = { x, y: T, w: Math.max(0, Math.min(HUD.objectiveMaxW, right - HUD.gap - x)), h: HUD.chipH };
  }
  if (boss) {
    const bw = vw * HUD.bossWFrac;
    rects.boss = { x: (vw - bw) / 2, y: T, w: bw, h: HUD.bossRowH };
  }
  rects.pause = pause;
  if (o.touch) {
    rects.stick = { x: L, y: B - HUD.stickRing, w: HUD.stickRing, h: HUD.stickRing };
    // right stack (VP v0.1.2 §5): Fire in the corner, its 12 px label under it inside the
    // safe edge; Use 56 up and to the left of Fire with a 12 px gap (ground phases only);
    // the Rim's Sneak and Noise (44) stack above Fire, a label line + 8 px apart
    const f = fireSize(vw, vh);
    const fy = B - HUD.labelLine - f;
    rects.fire = { x: R - f, y: fy, w: f, h: f };
    if (phase !== "shooter") {
      rects.use = { x: R - f - HUD.stackGap - HUD.use, y: fy - HUD.stackGap - HUD.use, w: HUD.use, h: HUD.use };
    }
    if (phase === "stealth") {
      let y = fy;
      for (const name of ["sneak", "noise"]) {
        y -= HUD.gap + HUD.labelLine + HUD.minTarget; // room for the label above's neighbour
        rects[name] = { x: R - HUD.minTarget, y, w: HUD.minTarget, h: HUD.minTarget };
      }
    }
  }
  if (phase === "base" && o.tray) {
    const left = o.touch ? L + HUD.stickRing + HUD.gap : L;
    const right = o.touch ? R - fireSize(vw, vh) - HUD.gap : R;
    const w = Math.min(o.trayW ?? right - left, right - left);
    const h = Math.min(HUD.trayMaxH + ins.bottom, HUD.trayPadMin + HUD.minTarget + Math.max(HUD.trayPadMin, ins.bottom));
    rects.tray = { x: left, y: o.trayTop ? T + HUD.stripMaxH : vh - lb - h, w, h };
  }
  return rects;
}

export function coverPct(vw: number, vh: number, rects: Record<string, Rect>) {
  let a = 0;
  for (const r of Object.values(rects)) {
    const w = Math.max(0, Math.min(r.x + r.w, vw) - Math.max(r.x, 0));
    const h = Math.max(0, Math.min(r.y + r.h, vh) - Math.max(r.y, 0));
    a += w * h;
  }
  return (100 * a) / (vw * vh);
}

export function overlaps(a: Rect, b: Rect) {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

/** smallest gap between two rects (0 if they touch or overlap) */
export function gapBetween(a: Rect, b: Rect) {
  const dx = Math.max(0, b.x - (a.x + a.w), a.x - (b.x + b.w));
  const dy = Math.max(0, b.y - (a.y + a.h), a.y - (b.y + b.h));
  return Math.max(dx, dy);
}

/**
 * Pad repair tray (VP v0.1.2 §3), pure state step. `dist` is the player's distance to
 * the nearest unrepaired wreck (Infinity if none); `picked` is a repair kind selected.
 * Opens after a 0.3 s dwell within 150 px (or at once when a kind is picked); closes
 * beyond 200 px (hysteresis, so no flicker) or right after a repair.
 */
export type TrayState = { open: boolean; nearSince: number | null };
export function trayStep(s: TrayState, now: number, dist: number, picked: boolean, repaired: boolean): TrayState {
  if (repaired) return { open: picked, nearSince: null };
  if (picked) return { open: true, nearSince: s.nearSince };
  if (s.open) return dist > HUD.trayClosePx ? { open: false, nearSince: null } : s;
  if (dist > HUD.trayOpenPx) return { open: false, nearSince: null };
  const since = s.nearSince ?? now;
  return { open: now - since >= HUD.trayDwellMs, nearSince: since };
}
/** Flip the tray under the top strip if the player or the target wreck (screen y, CSS px) would sit under it. */
export function trayFlips(vh: number, trayH: number, ys: number[], pad = 0) {
  const top = vh - trayH;
  return ys.some((y) => y + pad > top);
}
