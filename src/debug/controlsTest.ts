import type { Game } from "../game/Game";

// window.__controlsTest: the QA controls hook live 69cf5be ships.
export function installControlsTest(g: Game): void {
  window.__controlsTest = {
    getYaw: () => g.getYaw(),
    getSpeed: () => g.getSpeed(),
    getX: () => g.getX(),
    setKeys: (e) => g.setQaKeys(e),
  };
}

// R0 keeps live's behaviour exactly: this comparison is never true (bind() makes a
// new function each time), so the hook is never removed on detach. Known; not fixed in R0.
export function removeControlsTest(g: Game): void {
  if ((window.__controlsTest?.getYaw as unknown) === g.getYaw.bind(g)) {
    delete window.__controlsTest;
  }
}
