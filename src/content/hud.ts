// HUD copy, VP-PHONE-HUD-v0.1 §1 (Visual Polish, Nov 18, 2026). Timings: content/tuning/hud.ts.
// Touch only unless marked; the desktop HUD shows no hint line. Transit never says "walk".
export const HUD_HINT = {
  /** ground phases (Rim, Holdouts, Pad), touch; hides after the first stick hold (HUD_TIMING) */
  touchWalk: "Drag the stick to walk.",
  /** Transit, touch; hides on Fire held or time (HUD_TIMING), fades, doesn't return that run */
  touchTransit: "Drag the stick to steer. Hold Fire to shoot.",
} as const;
/** Title screen help paragraph: shared text, then the aim sentence per input. */
export const TITLE_HELP = {
  base: "WASD moves. Shift sneaks. The rim is shovel only — no gun until the cache. After that, Space or click fires where you aim. Q throws noise. E: use, or swing the shovel. Space steps a scene forward. Esc pauses. On a phone, turn sideways. Stick to walk.",
  /** desktop (unchanged from live) */
  aimDesktop: "Hold Fire and tap the ground to aim.",
  /** touch (VP) */
  aimTouch: "Hold Fire, then tap to aim.",
} as const;
/** F-02 pause copy (VP-PHONE-HUD v0.1.1). Stay is the primary, focused button; no red. */
export const PAUSE_COPY = {
  pause: "Pause",
  confirm: "Leave to the title? This chapter starts over when you continue.",
  stay: "Stay",
  leave: "Leave",
  mute: "Mute",
  unmute: "Unmute",
} as const;
