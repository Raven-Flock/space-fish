import { HUD } from "../content/tuning/hud";

/**
 * F-04 bleed backdrops (VP v0.1.2 §5): a ground or horizon image drawn at dest
 * (dx, dy, dw, dh) in the 960 column is carried into the side bleed (b logical px
 * each side). It stretches across by at most 5% (about its centre); whatever is still
 * uncovered is mirror-extended from the image's own edge, blended over 48 px at the
 * seam (the mirror is reflected about a line 24 px inside the edge and faded in across
 * those 48 px, so the reflection line never shows). With b = 0 this is exactly one
 * drawImage with the original arguments, as before.
 * src = [sx, sy, sw, sh] for the 9-argument drawImage form, or null.
 */
export function drawBleedImage(ctx, img, src: number[] | null, dx: number, dy: number, dw: number, dh: number, b: number) {
  const draw = (x: number, w: number) =>
    src ? ctx.drawImage(img, src[0], src[1], src[2], src[3], x, dy, w, dh) : ctx.drawImage(img, x, dy, w, dh);
  if (!(b > 0)) {
    draw(dx, dw);
    return;
  }
  const L = -b;
  const R = 960 + b;
  const cx = dx + dw / 2;
  const need = Math.max(1, (cx - L) / (dw / 2), (R - cx) / (dw / 2));
  const k = Math.min(HUD.bleedStretchMax, need);
  const w = dw * k;
  const x0 = cx - w / 2;
  const x1 = cx + w / 2;
  draw(x0, w);
  const B = HUD.bleedBlendPx;
  const STEPS = 8;
  // mirror about axis A over [from, to]; alpha ramps across the 48 px band at the seam
  const mirror = (A: number, from: number, to: number, bandFrom: number, bandTo: number, alphaAt: (t: number) => number) => {
    if (!(to > from)) return;
    const strip = (a: number, z: number, alpha: number) => {
      ctx.save();
      ctx.beginPath();
      ctx.rect(a, dy, z - a, dh);
      ctx.clip();
      ctx.globalAlpha = alpha;
      ctx.translate(2 * A, 0);
      ctx.scale(-1, 1);
      draw(x0, w);
      ctx.restore();
    };
    // the part outside the band: the mirror alone
    if (bandFrom > from) strip(from, bandFrom, 1);
    if (to > bandTo) strip(bandTo, to, 1);
    const step = (bandTo - bandFrom) / STEPS;
    for (let i = 0; i < STEPS; i++) {
      const a = bandFrom + i * step;
      strip(a, a + step, alphaAt((i + 0.5) / STEPS));
    }
  };
  if (x0 > L) mirror(x0 + B / 2, L, x0 + B, x0, x0 + B, (t) => 1 - t);
  if (x1 < R) mirror(x1 - B / 2, x1 - B, R, x1 - B, x1, (t) => t);
}
