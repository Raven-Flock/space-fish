// Fish (swarm) tuning from live 69cf5be (R0: unchanged numbers).
export const FISH = {
  hpRim: 40,
  hpCombat: 32,
  patrolSpeed: 74,
  /**
   * Rim only: chases the last-seen spot at this speed. Live 1c9c028 was 160, faster
   * than the 156 px/s walk; GD's F-01 ruling (Nov 18, 2026) sets 140, inside AAA §3's
   * 132-140 band, so a walking player gains 16 px/s. Combat fish use rescueSpeed/baseSpeed.
   */
  chaseSpeed: 140,
  decoySpeed: 120,
  decoyPullRange: 540,
  /** vision cone: range normal / sneaking, half-angle in radians */
  sightRange: 236,
  sightRangeSneaking: 150,
  sightHalfAngle: 0.62,
  /** seconds of alert after being seen (or after a sidearm shot on the Rim) */
  alertTime: 3.4,
  aggroRange: 200,
  leashRange: 620,
  rescueSpeed: 96,
  baseSpeed: 132,
  contactRadius: 26,
  contactDamage: 10,
  /**
   * F-01 (GD ruling, Nov 18, 2026), Rim only: "a hit breaks the chase, not the spot".
   * After a shovel stagger ends, the fish searches for this many seconds: it walks to
   * the last-seen spot at patrol speed capped at searchSpeedCap, makes no sight check
   * and never refreshes the alert. Then its normal sight check resumes.
   */
  searchTime: 1.2,
  /** px/s cap on the search walk (patrol is 74, so search walks at 72) */
  searchSpeedCap: 72,
  /** anti-lock: a fish can enter search at most once per this many seconds (from search start) */
  searchLockout: 3.0,
  /** Pad nest: respawn cadence and cap (live) */
  nestEvery: 6.5,
  nestCap: 5,
} as const;
