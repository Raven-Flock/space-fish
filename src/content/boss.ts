// The Eye over Jupiter, as live 69cf5be tunes it (R0). AAA Phase 4 replaces
// this with the 3-phase Eye (4500 HP, D-10) as a data change.
export const EYE = {
  hp: 700,
  /** first volley delay after the Jupiter cut */
  firstShot: 0.6,
  /** after this many seconds the Eye fires a 3-shot spread faster */
  enrageAfter: 6,
  shotEvery: 1.15,
  shotEveryEnraged: 0.85,
  spread: [-0.16, 0, 0.16],
  bulletSpeed: 280,
  bulletDamage: 10,
  contactRadius: 86,
  contactDamage: 18,
  hitRadius: 120,
} as const;
