// The single read path for ship upgrades (addendum §U, D-9/D-10).
// Every system that an upgrade can touch reads its number through stat(); nothing
// else may read owned tiers. R0 has no upgrades, so stat() is the identity and no
// R0 system calls it yet (wiring it in is a Phase 4/8 change that tests will cover).
export type StatKey = string;

export function stat(_key: StatKey, base: number): number {
  return base;
}
