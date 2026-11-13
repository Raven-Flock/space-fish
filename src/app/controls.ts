export function stickOut(dx, dy, radius) {
  let r = Math.hypot(dx, dy);
  let i = r ? dx / r : 0;
  let a = r ? dy / r : 0;
  let o = Math.max(10, radius - 30);
  let s = Math.min(o, r);
  let c = radius > 0 ? Math.min(1, r / radius) : 0;
  let l = 0.18;
  let u = 0;
  let d = 0;
  if (c > l) {
    let e = Math.min(1, (c - l) / (1 - l));
    u = i * e;
    d = a * e;
  }
  return {
    x: u,
    y: d,
    vx: i * s,
    vy: a * s,
  };
}
export function phoneTouch() {
  let e = window.matchMedia?.("(pointer: coarse)").matches;
  let t = window.matchMedia?.("(hover: none)").matches;
  return !!(e || t);
}
export function lockLandscape() {
  if (!phoneTouch()) {
    return;
  }
  let e = screen.orientation;
  if (!e || !e.lock) {
    return;
  }
  e.lock("landscape").catch(() => {});
}
