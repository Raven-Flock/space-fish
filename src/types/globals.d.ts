// Browser globals the game touches that lib.dom does not declare.
export {};

declare global {
  interface Window {
    /** Old Safari prefix, used as a fallback by AudioDirector.ensureCtx(). */
    webkitAudioContext?: typeof AudioContext;
    /** QA hook shipped in live 69cf5be (see debug/controlsTest.ts). */
    __controlsTest?: {
      getYaw: () => number;
      getSpeed: () => number;
      getX: () => number;
      getTime?: () => number;
      getMode?: () => string;
      setKeys: (keys: string[]) => void;
      getWeapon?: () => string;
      bulletCount?: () => number;
      setTouchAim?: (x: number, y: number) => void;
      pulseShot?: () => void;
      bullet?: () => { vx: number; vy: number } | null;
      wrecks?: () => Array<{ kind: string; repaired: boolean }>;
    };
    /** Set by the inline boot script in index.html (Pages base path). */
    __SF_BASEPATH?: string;
  }
  interface ScreenOrientation {
    lock?: (orientation: string) => Promise<void>;
  }
}
