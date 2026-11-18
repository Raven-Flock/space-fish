// Touch HUD hint timings, VP-PHONE-HUD-v0.1 (Visual Polish, Nov 18, 2026).
export const HUD_TIMING = {
  /** s: the ground walk hint hides after the first stick hold this long (VP-08) */
  walkHintHideAfter: 0.4,
  /** s: the Transit hint hides once Fire has been held this long in total during Transit... */
  transitHintFireHeld: 2,
  /** s: ...or after this much Transit play time, whichever comes first */
  transitHintMaxTime: 8,
  /** ms: hint fade-out */
  hintFadeMs: 300,
} as const;

// Phone HUD layout (F-04). Visual Polish's numbers: VP-PHONE-HUD-v0.1 §2 with the v0.1.2
// rulings, VP.md VP-01/VP-08..VP-11 and PALETTE-SPACEFISH-v0.2.json hudLimits. Data only.
// Colours and fonts live with them in src/app/styles.css (.sf-* rules).
export const HUD = {
  /** logical stage height; width is 540 * vw / vh (VP-10), never narrower than the 960 column */
  stageH: 540,
  columnW: 960,
  /** every HUD edge sits at max(edgeMin, env(safe-area-inset-*)) (VP-11) */
  edgeMin: 12,
  /** build tray padding-bottom: max(trayPadMin, env(safe-area-inset-bottom)) */
  trayPadMin: 8,
  /** the one top strip (hudLimits.topStripMaxPx) */
  stripMaxH: 36,
  /** chips: 24 tall, 12 px side padding (VP v0.1.2 §5) */
  chipH: 24,
  chipPadX: 12,
  /**
   * chip max widths (CSS caps in styles.css; text ellipsizes past them). HP follows its tag.
   * Measured in Chrome at 12 px Sora: the Pad HP chip is 156 wide, the base chip 246 with
   * 3-digit scrap, every count and the Nest showing. The objective cap is ours (VP gives
   * none); the full objective shows in its toast first, the chip ellipsizes it.
   */
  hpChipMaxW: { stealth: 168, rescue: 216, base: 160, shooter: 200 } as Record<string, number>,
  objectiveMaxW: 204,
  baseChipMaxW: 248,
  kitsChipMaxW: 160,
  /** HP bar 96x6, red under 30% (VP v0.1.2 §5) */
  hpBarW: 96,
  hpBarH: 6,
  hpLowFrac: 0.3,
  /** boss block: 40% of the canvas width, 11 px label + 4 px gap + 8 px bar, about 26 tall */
  bossWFrac: 0.4,
  bossBarH: 8,
  bossRowH: 26,
  /** Pause (VP v0.1.2 §2): 36x36 plate in the strip; 44x44 hit box hanging 8 px below */
  pausePlate: 36,
  pause: 44,
  /** every touch target ≥ 44 with ≥ 8 between targets (hudLimits.minTouchTargetPx) */
  minTarget: 44,
  gap: 8,
  /** right stack (VP v0.1.2 §5): Fire 72 in the corner (64 allowed below 2:1, §1); Use 56
   *  up and to the left with a 12 px gap, ground phases only */
  fire: 72,
  fireNarrow: 64,
  use: 56,
  stackGap: 12,
  /** button labels: 12 px under each button, hidden after this many uses of it; the
   *  stack sits one label line above the bottom safe edge so a label never crosses it */
  labelUses: 3,
  labelLine: 14,
  /** floating stick: ring 120 px (idle α0.35, held α0.55), knob 44 px #E8EFE9 α0.6 */
  stickRing: 120,
  stickKnob: 44,
  /** HUD + controls cap, % of the canvas (VP v0.1.2 §1): 12 at 2:1 or wider, 15 below */
  maxCoverPct: 12,
  maxCoverPctNarrow: 15,
  wideAspect: 2,
  /** Transit: ship's left edge stays ≥ stick zone + 24 px */
  shipClearPx: 24,
  /** half the drawn ship sprite (render/shooter.ts draws it 126 wide at x - 63) */
  shipHalfW: 63,
  /** live clamp of the ship inside the scrolling window */
  shipMinX: 36,
  shipMaxX: 400,
  /** right-edge enemy entry lane = the right 12% of the central column */
  laneFrac: 0.12,
  /** objective toast (VP.md §4): full text for 2.5 s, then the one-liner */
  toastMs: 2500,
  /** motion: fades/slides 200-300 ms ease-out, instant under reduced motion */
  fadeInMs: 200,
  fadeOutMs: 300,
  traySlideMs: 200,
  /** Pad repair tray (VP v0.1.2 §3): opens within 150 px of an unrepaired wreck after a
   *  0.3 s dwell (or a kind picked), closes beyond 200 px or after a repair; at most 96 px
   *  tall plus the bottom safe area; flips under the strip if it would cover the player
   *  or the target wreck */
  trayOpenPx: 150,
  trayDwellMs: 300,
  trayClosePx: 200,
  trayMaxH: 96,
  /** bleed backdrops (VP v0.1.2 §5): ground/horizon stretch at most 5% across, then
   *  mirror-extend with a 48 px blend */
  bleedStretchMax: 1.05,
  bleedBlendPx: 48,
};
