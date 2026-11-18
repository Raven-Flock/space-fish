// Shovel SFX from Sound Design (delivered Nov 18, 2026; NOTES "Mix / Fixer wiring",
// corrected by NOTES "Level correction (2026-11-18, after QA-PR10-v0.2)" and its
// "Update (2026-11-18, after QA-PR11-v0.1)").
// Files live at the repo root in sfx/ (served like music/ and opening/).

/**
 * Per-cue trim on every shovel cue, swing and tonk alike (Sound Design, Nov 18). The
 * files were mastered against a -16 LUFS bed, but the shipped music beds play quieter.
 * PR #10 (Music 0.7 linear) used 0.53. F-07's default Music is 0.8 on the v*v curve
 * (bus gain 0.64), so Sound's update after QA-PR11-v0.1 is 0.48: the tonk sits about
 * -2 LU under Rim at the default level and the swing stays 4 LU under the tonk.
 * One fixed value: no per-track values, and NOT tied to the Music slider. It trims these
 * cues only, not all SFX (the synth beeps keep their own 0.22):
 * sfx bus 1.0 x shovel cue trim 0.48.
 * RECHECK when the music beds are re-rendered to -16 LUFS (expect it to go up), re-measure.
 */
export const SHOVEL_CUE_TRIM = 0.48;

export const SHOVEL_SFX = {
  /** whoosh on every swing start, round-robin a -> b -> c (never the same twice in a row) */
  swing: ["sfx/shovel-swing-a.m4a", "sfx/shovel-swing-b.m4a", "sfx/shovel-swing-c.m4a"],
  /** metal tonk on the hit frame (first contact of a swing), never on a miss */
  tonk: ["sfx/shovel-tonk-a.m4a", "sfx/shovel-tonk-b.m4a", "sfx/shovel-tonk-c.m4a"],
  /** per-cue gain node into the SFX bus: the shovel cue trim, never the Music slider */
  gain: SHOVEL_CUE_TRIM,
  /** random detune per play via playbackRate: 1 +/- this */
  detune: 0.03,
  /** drop a cue whose buffer is ready more than this many ms after it was asked for
   *  (QA-PR11-v0.1: a cold first cue played 654 ms late, and a tonk before its swing) */
  lateSkipMs: 100,
} as const;
