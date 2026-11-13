import type { Game } from "../game/Game";
export const loaderMethods = {
  loadArt(this: Game) {
    let e = (e) => {
      let t = new Image();
      t.crossOrigin = "anonymous";
      t.src = e;
      return t;
    };
    let t = (t, n) =>
      Array.from(
        {
          length: n,
        },
        (n, r) => e(`sprites/${t}-${r + 1}.png`),
      );
    this.art = {
      astro: t("astro", 4),
      fishtd: t("fishtd", 4),
      fishside: t("fishside", 4),
      ship: t("ship", 4),
      prop: t("prop", 4),
      boss: t("boss", 1),
    };
    this.loadRim();
  },
  loadRim(this: Game) {
    let e = (e) => {
      let t = new Image();
      t.src = e;
      return t;
    };
    this.rim = {
      ground: e("rim/ground.jpg"),
      horizon: e("rim/horizon.jpg"),
      dome: e("rim/dome.png"),
      rock: e("rim/rock.png"),
      crate: e("rim/crate.png"),
      robot: e("rim/robot.png"),
      fish: e("rim/fish.png"),
      miner: [0, 1, 2, 3].map((t) => e(`rim/miner${t}.png`)),
      rescue: e("rim/rescue.jpg"),
      yard: e("rim/yard.jpg"),
      jupiter: e("rim/jupiter.jpg"),
      ship: e("rim/ship.png"),
      fishside: e("rim/fishside.png"),
      boss: e("rim/boss.png"),
      nest: e("rim/nest.png"),
      gen: e("rim/gen.png"),
      turret: e("rim/turret.png"),
      lab: e("rim/lab.png"),
      pad: e("rim/pad.png"),
    };
  },
  imgOk(this: Game, img) {
    return !!(img && img.complete && img.naturalWidth);
  },
  frame(this: Game, frames, fps = 8) {
    if (!frames.length) {
      return;
    }
    let n = frames[Math.floor(this.time * fps) % frames.length];
    if (n && n.complete && n.naturalWidth !== 0) {
      return n;
    }
  },
};
