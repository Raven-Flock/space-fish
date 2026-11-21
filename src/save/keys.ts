// localStorage keys live 69cf5be uses. R0 keeps both formats exactly:
//   spacefish-v1    -> {"version":1,"phase":"stealth"|"rescue"|"base"|"shooter"}
//   spacefish-music -> "0".."1" (music volume)
//   spacefish-muted -> "1" | "0" (master mute, F-07; written only when setMuted() runs)
//   spacefish-level-curve -> "v2" once saved bus levels were moved to F-07's v*v curve
// Save v2 (AAA §4E) migrates from v1 in a later PR; it would change R0 behaviour.
export const SAVE_KEY = "spacefish-v1";
export const MUSIC_KEY = "spacefish-music";
export const MUTE_KEY = "spacefish-muted";
/** saved 0..1 bus levels (only Music is saved today; SFX/VO/UI levels come with SD-05) */
export const LEVEL_KEYS = [MUSIC_KEY];
/** set once the saved levels above were migrated to the v*v curve (F-07 v0.2.1) */
export const LEVEL_CURVE_KEY = "spacefish-level-curve";
export const LEVEL_CURVE = "v2";
