// Shovel base melee move: Sean's locked D-11 ("Yes, the shovel is a base melee move"),
// spec in ADDENDUM-PLANET-STOPS §U.9, numbers GD-locked Wed Nov 18, 2026.
// Base kit for every player. No upgrade modifies it (D-11), so game code reads these
// numbers directly, never through stat().
export const SHOVEL = {
  /** Use swings only when nothing interactable is within this many px of the player */
  interactGate: 40,
  /** seconds: wind-up, then the active (hitting) window */
  windup: 0.08,
  active: 0.12,
  /** seconds from one swing's start to the next possible swing */
  cooldown: 0.55,
  /** px from the player's centre to the target's centre (hive: to its edge) */
  reach: 52,
  /** total arc in degrees, centred on facing */
  arcDeg: 100,
  damage: 12,
  /** px, straight away from the player */
  knockback: 40,
  /** seconds of sim freeze on the first contact of a swing (off with reduced motion) */
  hitStop: 0.06,
  /** a hit fish can't move or chase for this long */
  stagger: 0.4,
  /** after a stagger ends, the fish can't be staggered again for this long */
  staggerImmune: 0.6,
  /** Rim only: a swing that hits makes a noise ping of this radius; a miss makes none */
  noiseRadius: 120,
  /** particles per target hit (burst() spawns 6) */
  particlesPerHit: 6,
  /** player-side role colour: brass, never teal or magenta */
  trailColor: "#d4a24a",
  /** existing Rim dig animation length, reused for the swing pose */
  poseTime: 0.34,
} as const;
