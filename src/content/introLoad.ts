// F-05 / WP-01 load order (WP spec, Nov 18; WP answers 06:08 PT). Data only.
// Entries name images the game already creates in assets/loader.ts, as paths on the
// Game object ("rim.miner.2" = the third rim miner frame); no new files are added.
export const INTRO_LOAD = {
  /**
   * Title art fetched with the menu shell: only what the menu actually paints and only
   * files up to ~200 KB (WP 2). The menu paints the walking miner (rim/miner2.png, 102 KB).
   */
  menuArt: ["rim.miner.2"],
  /**
   * Title art moved to after plate 1 (WP 2): rim/ground.jpg is 338 KB. The menu draws its
   * flat ground fill until it lands.
   */
  afterPlateOne: ["rim.ground"],
  /**
   * Ch1 (Rim) art: with the six plates, the beat-1 VO and the intro loop this is the
   * ~2.4 MB Ch1-critical set WP accepted (WP 1). Fetched first once plates 2-6 are in,
   * together with the other music loops, before the rest of the gameplay art.
   */
  ch1Art: [
    "rim.ground",
    "rim.horizon",
    "rim.rock",
    "rim.dome",
    "rim.robot",
    "rim.crate",
    "rim.fish",
    "rim.miner.0",
    "rim.miner.1",
    "rim.miner.2",
    "rim.miner.3",
  ],
  /** A failed plate is retried twice: ~1 s, then ~3 s after each failure (WP 3). */
  retryMs: [1000, 3000],
  /** ...and the beat runs over the fallback 12 s after it was due at the latest (WP 3). */
  plateDeadlineMs: 12000,
  /**
   * Fallback behind a beat whose plate failed (WP 3): a dimmed vertical gradient in VP's
   * palette (ui.surface to ui.track, PALETTE-SPACEFISH), never black.
   */
  fallback: { top: "#151d26", bottom: "#2a3844" },
};

/** VP's loading bar (VP-PHONE-HUD v0.1.1, F-05 (d)). */
export const INTRO_LOADING_UI = {
  /** shown only after this long waiting, so fast loads never flash it */
  showAfterMs: 300,
  barW: 160,
  barH: 4,
  segW: 40,
  sweepMs: 1600,
};
