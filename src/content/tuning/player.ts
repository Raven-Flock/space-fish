// Player tuning from live 69cf5be (R0: unchanged numbers).
export const PLAYER = {
  maxHp: 100,
  /** on foot, px/s (fish chase at 160: AAA F-01, a Phase 1 fix, not R0) */
  walkSpeed: 156,
  sneakSpeed: 72,
  radius: 14,
} as const;
export const SHIP = {
  speed: 280,
  /** multiplier with the speed kit */
  speedKit: 1.35,
  fireEvery: 0.18,
  bulletSpeed: 560,
  bulletDamage: 10,
  spread: [-0.16, 0, 0.16],
  droneEvery: 0.38,
  droneDamage: 6,
} as const;
