// Fish (swarm) tuning from live 69cf5be (R0: unchanged numbers).
export const FISH = {
  hpRim: 40,
  hpCombat: 32,
  patrolSpeed: 74,
  /** chases the last-seen spot at 160 px/s, faster than the 156 px/s walk (F-01, Phase 1) */
  chaseSpeed: 160,
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
  /** Pad nest: respawn cadence and cap (live) */
  nestEvery: 6.5,
  nestCap: 5,
} as const;
