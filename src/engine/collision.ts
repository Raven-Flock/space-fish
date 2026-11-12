import { clamp } from "./math";
export function segmentHitsRect(x0, y0, x1, y1, rect) {
  let a = 0;
  let o = 1;
  let s = x1 - x0;
  let c = y1 - y0;
  let l = [-s, s, -c, c];
  let u = [
    x0 - rect.x,
    rect.x + rect.w - x0,
    y0 - rect.y,
    rect.y + rect.h - y0,
  ];
  for (let e = 0; e < 4; e++) {
    let t = l[e] ?? 0;
    let n = u[e] ?? 0;
    if (Math.abs(t) < 1e-8) {
      if (n < 0) {
        return false;
      }
    } else {
      let e = n / t;
      if (t < 0) {
        if (e > o) {
          return false;
        }
        if (e > a) {
          a = e;
        }
      } else {
        if (e < a) {
          return false;
        }
        if (e < o) {
          o = e;
        }
      }
    }
  }
  return true;
}
export function circleHitsRect(cx, cy, r, rect) {
  let i = clamp(cx, rect.x, rect.x + rect.w);
  let a = clamp(cy, rect.y, rect.y + rect.h);
  return (cx - i) ** 2 + (cy - a) ** 2 < r * r;
}
