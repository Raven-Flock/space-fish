import type { Game } from "../game/Game";

// window.__controlsTest: the QA controls hook live 69cf5be ships.
export function installControlsTest(g: Game): void {
  window.__controlsTest = {
    getYaw: () => g.getYaw(),
    getSpeed: () => g.getSpeed(),
    getX: () => g.getX(),
    getTime: () => g.time,
    getMode: () => g.mode,
    setKeys: (e) => g.setQaKeys(e),
    getWeapon: () => g.weapon,
    bulletCount: () => g.bullets.length,
    setTouchAim: (x, y) => {
      g.aimPointer = "touch";
      g.aimOk = true;
      g.aimX = x;
      g.aimY = y;
    },
    pulseShot: () => {
      g.shotPulse = true;
    },
    bullet: () => {
      let b = g.bullets[g.bullets.length - 1];
      return b ? { vx: b.vx, vy: b.vy } : null;
    },
    wrecks: () =>
      g.structures.map((s) => ({
        kind: s.kind,
        repaired: !!s.repaired,
      })),
  };
}

// R0 keeps live's behaviour exactly: this comparison is never true (bind() makes a
// new function each time), so the hook is never removed on detach. Known; not fixed in R0.
export function removeControlsTest(g: Game): void {
  if ((window.__controlsTest?.getYaw as unknown) === g.getYaw.bind(g)) {
    delete window.__controlsTest;
  }
}
