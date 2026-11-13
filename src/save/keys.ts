// localStorage keys live 69cf5be uses. R0 keeps both formats exactly:
//   spacefish-v1    -> {"version":1,"phase":"stealth"|"rescue"|"base"|"shooter"}
//   spacefish-music -> "0".."1" (music volume)
// Save v2 (AAA §4E) migrates from v1 in a later PR; it would change R0 behaviour.
export const SAVE_KEY = "spacefish-v1";
export const MUSIC_KEY = "spacefish-music";
