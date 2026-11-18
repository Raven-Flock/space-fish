// Shovel SFX from Sound Design (delivered Nov 18, 2026; NOTES "Mix / Fixer wiring",
// corrected by NOTES "Level correction (2026-11-18, after QA-PR10-v0.2)").
// Files live at the repo root in sfx/ (served like music/ and opening/).

/**
 * Per-cue trim on every shovel cue, swing and tonk alike (Sound Design, Nov 18, after
 * QA-PR10-v0.2). The files were mastered against a -16 LUFS bed, but the shipped music
 * beds play at about -20 LUFS (default Music 0.7), so at 1.0 the tonk sat +3.5 LU over
 * Rim. 0.53 puts the tonk about -2 LU under Rim and the alert music; Holdouts lands a
 * little lower, which is fine; the swing stays 4 LU under the tonk.
 * One fixed value: no per-track values, and NOT tied to the Music slider. It trims these
 * cues only, not all SFX (the synth beeps keep their own 0.22). On F-07's Web Audio
 * graph it becomes: sfx bus 1.0 x shovel cue trim 0.53.
 * RECHECK when the music beds are re-rendered to -16 LUFS: expect about 0.8, re-measure.
 */
export const SHOVEL_CUE_TRIM = 0.53;

export const SHOVEL_SFX = {
  /** whoosh on every swing start, round-robin a -> b -> c (never the same twice in a row) */
  swing: ["sfx/shovel-swing-a.m4a", "sfx/shovel-swing-b.m4a", "sfx/shovel-swing-c.m4a"],
  /** metal tonk on the hit frame (first contact of a swing), never on a miss */
  tonk: ["sfx/shovel-tonk-a.m4a", "sfx/shovel-tonk-b.m4a", "sfx/shovel-tonk-c.m4a"],
  /** playback gain per cue (HTMLAudio volume): the shovel cue trim, never the Music slider */
  gain: SHOVEL_CUE_TRIM,
  /** random detune per play via playbackRate: 1 +/- this */
  detune: 0.03,
} as const;
