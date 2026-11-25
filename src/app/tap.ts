import { PAUSE } from "../content/tuning/pause";

// QA-PR12 P1: during multi-touch (another finger on the stick or Fire), Chrome and Safari
// never send a click. So Pause and the Paused panel's buttons act on pointerup when the
// pointer lifts inside the button that captured it on pointerdown. A pointer that slides
// off and lifts outside does nothing. The browser's follow-up mouse click for the same tap
// is ignored for PAUSE.tapClickDedupeMs. A keyboard Enter or Space click (detail 0) and a
// click with no pointer tap before it still act.

type Box = { left: number; top: number; right: number; bottom: number };
const taps = new WeakMap<Element, { id: number | null; at: number }>();
const now = () => performance.now();
const inside = (r: Box, x: number, y: number) =>
  x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;

export function tapProps(act: () => void, onDown?: (e: any) => void) {
  return {
    onPointerDown(e: any) {
      onDown?.(e);
      if (e.button > 0) return; // primary button or touch only
      const el = e.currentTarget as Element;
      taps.set(el, { id: e.pointerId, at: taps.get(el)?.at ?? -Infinity });
      try {
        (el as any).setPointerCapture?.(e.pointerId);
      } catch {}
    },
    onPointerUp(e: any) {
      const el = e.currentTarget as Element;
      const s = taps.get(el);
      if (!s || s.id !== e.pointerId) return;
      s.id = null;
      s.at = now(); // the click that follows this tap (if any) is the same tap
      if (inside(el.getBoundingClientRect(), e.clientX, e.clientY)) act();
    },
    onPointerCancel(e: any) {
      const s = taps.get(e.currentTarget);
      if (s && s.id === e.pointerId) s.id = null;
    },
    onClick(e: any) {
      const s = taps.get(e.currentTarget);
      if (e.detail !== 0 && s && now() - s.at < PAUSE.tapClickDedupeMs) return;
      act();
    },
  };
}
