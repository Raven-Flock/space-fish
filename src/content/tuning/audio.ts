// Audio mix and graph tuning (F-07, Sound SD-01/-04/-05/-06/-09/-12).
// Numbers are Sound Design's (Fixer brief SF-F07-IOS-AUDIO-GAIN-v0.2). Data only.
// Every level is a 0..1 *setting*; the bus gain is setting * setting (gain = v*v),
// and a setting of 0 is a true mute (gain exactly 0).
export const AUDIO = {
  /** default settings per bus (Sound): music 0.8, SFX 1.0, VO 1.0, UI 0.8 */
  defaults: { music: 0.8, sfx: 1.0, vo: 1.0, ui: 0.8 },
  /**
   * Trim on the synth tone() cues only (a fixed node in front of the SFX bus): the live
   * game ran every tone() through a 0.22 master gain. Sound: keep 0.22 until SD-03
   * calibrates the mix. File SFX (the shovel) skip it: each shovel cue has its own
   * SHOVEL_CUE_TRIM gain (0.48, content/tuning/sfx.ts) into the SFX bus at 1.0, so
   * sfx bus 1.0 x shovel cue trim 0.48.
   */
  synthTrim: 0.22,
  /** per-line gain the live game gave VO (HTMLAudio volume 0.95) */
  voLine: 0.95,
  /** seconds, setTargetAtTime time constant for every level/mute change (Sound) */
  levelTau: 0.03,
  /** limiter on the master bus (Sound): DynamicsCompressor settings */
  limiter: { threshold: -1.5, knee: 0, ratio: 20, attack: 0.003, release: 0.1 },
  /** seconds, music crossfade on a mood change (same length as live's 700 ms fade) */
  crossfade: 0.7,
  /** points in the equal-power crossfade curve (setValueCurveAtTime) */
  curvePoints: 32,
  /**
   * VO duck on the music bus while a line plays (Sound SD-06): -8 dB. Sound: 80 ms
   * attack / 400 ms release are time to ~95% (~3 tau), so setTargetAtTime uses
   * tau 0.027 s (attack) and 0.133 s (release).
   */
  duck: { db: -8, attackTau: 0.027, releaseTau: 0.133 },
  /** Skip/advance fades the VO line out (Sound SD-06): time constant, then stop */
  voFadeTau: 0.04,
  voStopAfter: 0.12,
  /** MP3 decoder delay added to the LAME/Xing encoder delay (ffmpeg mp3dec: 528 + 1) */
  mp3DecoderDelay: 529,
};

/** Music moods the game asks for, aliased to the six loop files (same table as live). */
export const MOOD_ALIAS: Record<string, string> = {
  stealth: "rim",
  menu: "rim",
  alert: "swarm",
  shooter: "transit",
  rescue: "holdouts",
};
export const MUSIC_TRACKS = ["rim", "holdouts", "base", "swarm", "transit", "ending"];

/**
 * Decode groups per chapter (Sound): the loops a chapter can play are decoded together,
 * so a mood flip inside the chapter never waits on a decode. When the outgoing chapter's
 * crossfade finishes, every buffer outside the new chapter's group is released
 * (decoded PCM is about 384 KB/s stereo). swarm is not a chapter: it plays inside the
 * Rim (alert) or Transit (boss; the boss reuses swarm until SD-11).
 * swarm is dropped on Rim -> Holdouts and decoded again for Transit. Follow-up: keep it
 * across chapters only if Web Performance reports decode churn.
 */
export const MUSIC_GROUPS: Record<string, string[]> = {
  rim: ["rim", "swarm"],
  holdouts: ["holdouts"],
  base: ["base"],
  transit: ["transit", "swarm"],
  ending: ["ending"],
};
/** Once the boss starts (swarm during Transit), start decoding these too (Sound). */
export const MUSIC_BOSS_PREFETCH = ["ending"];
