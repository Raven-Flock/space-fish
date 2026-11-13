// Transit (Ch4) data from live 69cf5be.
export const TRANSIT_KITS = [
  {
    x: 700,
    y: 160,
    kind: "speed",
  },
  {
    x: 1300,
    y: 380,
    kind: "spread",
  },
  {
    x: 1900,
    y: 220,
    kind: "drone",
  },
  {
    x: 2300,
    y: 340,
    kind: "shield",
  },
] as const;
export const TRANSIT = {
  /** px/s the camera scrolls east until the Jupiter cut */
  scrollSpeed: 150,
  /** scroll distance that triggers the "jupiter" cutscene and the Eye */
  jupiterAt: 2600,
  /** spawn cadence for transit fish (not a time limit; Transit ends on distance) */
  spawnEvery: 0.85,
  spawnHp: 16,
  /** fish drift west at this speed */
  fishSpeed: 150,
  contactDamage: 16,
} as const;
