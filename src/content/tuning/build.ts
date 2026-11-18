export const BUILD_COST = {
  gen: 40,
  turret: 45,
  lab: 60,
};
export const BUILD_LABEL = {
  gen: "Generator",
  turret: "Turret",
  lab: "Lab",
};
export const REPAIR_HINT =
  "Tap a wreck to repair it. Same scrap cost.";
/**
 * QA N-5 (GD, Nov 18, 2026): a click or tap repairs a wreck only if the player is within
 * `reach` px of that wreck AND the tap lands on it (within `wreckHitRadius + tapSlop` px of
 * its centre), or if a repair kind is selected. Any other press fires, aims or walks.
 */
export const CLICK_REPAIR = {
  /** px from the player to the wreck (= the "Repair ahead" reach: 78 ahead + 72 radius) */
  reach: 150,
  /** px: half the wreck's 56 px collision box (player.ts blocked()) */
  wreckHitRadius: 28,
  /** px of slop around the wreck's hit radius for a tap to count as on the wreck */
  tapSlop: 24,
};
