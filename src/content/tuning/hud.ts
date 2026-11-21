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
