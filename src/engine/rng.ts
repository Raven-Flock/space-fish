// Single source of randomness for the game.
// R0 parity: this is exactly Math.random(), so behaviour matches live 69cf5be.
// Later phases can swap in a seeded generator here (one place) for replays and tests.
export function random(): number {
  return Math.random();
}
