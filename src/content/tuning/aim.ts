// Laser lock-on tuning. QA N-8 (keyboard auto-lock cone), GD ruling Nov 18, 2026.
// Live 1c9c028 locks on to the nearest fish within lockRange and within ±lockHalfAngle of
// the aim (the Pad nest within nestLockRange, only when no fish qualifies).
export const AIM = {
  /** px: fish lock-on range (live) */
  lockRange: 280,
  /** px: Pad nest lock-on range (live) */
  nestLockRange: 340,
  /** rad: lock-on half-angle around the aim (live; mouse and touch aim use only this) */
  lockHalfAngle: 0.55,
  /**
   * rad: with no mouse or touch aim point (keyboard only, or phone Fire with no tap-aim)
   * the aim is the 4-way facing. The nearest target within ±lockHalfAngle of facing still
   * wins; only if there is none, lock the nearest target within this half-angle (π = any
   * direction) inside the same ranges.
   */
  facingFallbackHalfAngle: Math.PI,
} as const;
