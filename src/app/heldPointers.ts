// GD ruling 2026-11-18 (~1:30 PM, F02-TOUCH-PAUSE-v0.1): held input re-acquires on resume.
// The touch controls unmount while paused, so the elements lose their pointers. This book
// listens on the window (capture phase), so it keeps every live pointer: where it went
// down (the data-f02 zone) and where it is now, including moves, lifts and cancels during
// the pause. When the resume ignore window ends, pick() says which pointer re-acquires
// the stick and which re-acquires held Fire. Only pointers that went down on the stick or
// on Fire count. A pointer that tapped Pause or Resume, or any other pointer, never does.

export type Zone = "stick" | "fire" | "other";
export type LivePointer = { id: number; x: number; y: number; zone: Zone };
type Box = { left: number; top: number; right: number; bottom: number };

export function zoneOf(target: any): Zone {
  const z = target?.closest?.("[data-f02]")?.getAttribute?.("data-f02");
  return z === "stick" || z === "fire" ? z : "other";
}

export class PointerBook {
  live = new Map<number, LivePointer>();
  down(id: number, x: number, y: number, zone: Zone) {
    this.live.set(id, { id, x, y, zone });
  }
  move(id: number, x: number, y: number) {
    const p = this.live.get(id);
    if (p) {
      p.x = x;
      p.y = y;
    }
  }
  up(id: number) {
    this.live.delete(id);
  }
  /** The stick: the first live pointer that went down on the stick. Fire: the first that went down on Fire and is still inside fireBox. */
  pick(fireBox: Box | null) {
    let stick: LivePointer | null = null;
    let fire: LivePointer | null = null;
    for (const p of this.live.values()) {
      if (!stick && p.zone === "stick") stick = p;
      if (!fire && p.zone === "fire" && fireBox && p.x >= fireBox.left && p.x <= fireBox.right && p.y >= fireBox.top && p.y <= fireBox.bottom) fire = p;
    }
    return { stick, fire };
  }
  /** Window listeners (capture phase). onMove and onEnd see every move, lift and cancel after the book has updated. */
  attach(win: Window, onMove?: (e: any) => void, onEnd?: (e: any) => void) {
    const d = (e: any) => this.down(e.pointerId, e.clientX, e.clientY, zoneOf(e.target));
    const m = (e: any) => {
      this.move(e.pointerId, e.clientX, e.clientY);
      onMove?.(e);
    };
    const u = (e: any) => {
      this.up(e.pointerId);
      onEnd?.(e);
    };
    win.addEventListener("pointerdown", d, true);
    win.addEventListener("pointermove", m, true);
    win.addEventListener("pointerup", u, true);
    win.addEventListener("pointercancel", u, true);
    return () => {
      win.removeEventListener("pointerdown", d, true);
      win.removeEventListener("pointermove", m, true);
      win.removeEventListener("pointerup", u, true);
      win.removeEventListener("pointercancel", u, true);
    };
  }
}
