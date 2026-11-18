// Shovel SFX from Sound Design (delivered Nov 18, 2026; NOTES "Mix / Fixer wiring").
// Files live at the repo root in sfx/ (served like music/ and opening/).
// Mastered for the -2 LU mix rule, so they play at gain 1.0 with no extra trim.
export const SHOVEL_SFX = {
  /** whoosh on every swing start, round-robin a -> b -> c (never the same twice in a row) */
  swing: ["sfx/shovel-swing-a.m4a", "sfx/shovel-swing-b.m4a", "sfx/shovel-swing-c.m4a"],
  /** metal tonk on the hit frame (first contact of a swing), never on a miss */
  tonk: ["sfx/shovel-tonk-a.m4a", "sfx/shovel-tonk-b.m4a", "sfx/shovel-tonk-c.m4a"],
  /** playback gain (HTMLAudio volume) */
  gain: 1.0,
  /** random detune per play via playbackRate: 1 +/- this */
  detune: 0.03,
} as const;
