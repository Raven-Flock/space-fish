// Arcade chapter layouts, exactly as live 69cf5be sets them up in startPhase().
// Data only: modes/arcade.ts copies these into fresh objects on every (re)start.
export type Rect = {
  x: number;
  y: number;
  w: number;
  h: number;
};
export type Pt = {
  x: number;
  y: number;
};
export type FishSpawn = {
  x: number;
  y: number;
  wps: Pt[];
};
export interface ChapterLayout {
  weapon: "pistol" | "laser" | "ship";
  world: {
    w: number;
    h: number;
  };
  start: Pt;
  covers: Rect[];
  fish?: FishSpawn[];
  /** Only set where live sets it; other chapters keep the previous value. */
  freedCount?: number;
  scrap?: number;
  resetFirstBuild?: boolean;
  cache?: Pt;
  pad?: Pt;
  nest?: {
    x: number;
    y: number;
    r: number;
    hp: number;
    max: number;
  };
  nestTimer?: number;
  holdouts?: Array<{
    x: number;
    y: number;
    freed: boolean;
  }>;
  nodes?: Array<{
    x: number;
    y: number;
    amount: number;
    taken: boolean;
  }>;
  /** Transit: schedule the four ship kits. */
  kits?: boolean;
}
export const CHAPTERS: Record<
  "stealth" | "rescue" | "base" | "shooter",
  ChapterLayout
> = {
  // Ch1 Rim: sneak to the laser cache
  stealth: {
    weapon: "pistol",
    world: {
      w: 2000,
      h: 1100,
    },
    start: {
      x: 180,
      y: 920,
    },
    cache: {
      x: 1860,
      y: 1000,
    },
    covers: [
      {
        x: 80,
        y: 70,
        w: 520,
        h: 280,
      },
      {
        x: 700,
        y: 110,
        w: 280,
        h: 210,
      },
      {
        x: 1080,
        y: 70,
        w: 360,
        h: 250,
      },
      {
        x: 1560,
        y: 90,
        w: 360,
        h: 230,
      },
      {
        x: 400,
        y: 500,
        w: 150,
        h: 110,
      },
      {
        x: 760,
        y: 600,
        w: 120,
        h: 100,
      },
      {
        x: 1120,
        y: 470,
        w: 160,
        h: 120,
      },
      {
        x: 1450,
        y: 560,
        w: 110,
        h: 120,
      },
      {
        x: 700,
        y: 990,
        w: 80,
        h: 110,
      },
    ],
    fish: [
      {
        x: 360,
        y: 460,
        wps: [
          {
            x: 360,
            y: 460,
          },
          {
            x: 640,
            y: 460,
          },
          {
            x: 640,
            y: 560,
          },
          {
            x: 360,
            y: 560,
          },
        ],
      },
      {
        x: 620,
        y: 800,
        wps: [
          {
            x: 560,
            y: 800,
          },
          {
            x: 980,
            y: 800,
          },
        ],
      },
      {
        x: 1680,
        y: 640,
        wps: [
          {
            x: 1600,
            y: 640,
          },
          {
            x: 1860,
            y: 640,
          },
          {
            x: 1680,
            y: 500,
          },
        ],
      },
    ],
  },
  // Ch2 Holdouts: free three crew in the bulkheads
  rescue: {
    weapon: "laser",
    freedCount: 0,
    world: {
      w: 1900,
      h: 1000,
    },
    start: {
      x: 120,
      y: 500,
    },
    covers: [
      {
        x: 0,
        y: 0,
        w: 1900,
        h: 36,
      },
      {
        x: 0,
        y: 964,
        w: 1900,
        h: 36,
      },
      {
        x: 0,
        y: 0,
        w: 36,
        h: 1000,
      },
      {
        x: 1864,
        y: 0,
        w: 36,
        h: 1000,
      },
      {
        x: 420,
        y: 36,
        w: 36,
        h: 400,
      },
      {
        x: 420,
        y: 600,
        w: 36,
        h: 364,
      },
      {
        x: 980,
        y: 180,
        w: 36,
        h: 520,
      },
      {
        x: 1400,
        y: 36,
        w: 36,
        h: 360,
      },
      {
        x: 1400,
        y: 560,
        w: 36,
        h: 404,
      },
    ],
    holdouts: [
      {
        x: 250,
        y: 180,
        freed: false,
      },
      {
        x: 700,
        y: 800,
        freed: false,
      },
      {
        x: 1620,
        y: 240,
        freed: false,
      },
    ],
    fish: [
      {
        x: 340,
        y: 240,
        wps: [],
      },
      {
        x: 760,
        y: 700,
        wps: [],
      },
      {
        x: 1540,
        y: 320,
        wps: [],
      },
    ],
  },
  // Ch3 Pad: scrap, build, burn the nest, launch
  base: {
    weapon: "laser",
    freedCount: 3,
    scrap: 80,
    resetFirstBuild: true,
    world: {
      w: 1700,
      h: 1100,
    },
    start: {
      x: 280,
      y: 700,
    },
    pad: {
      x: 420,
      y: 700,
    },
    nest: {
      x: 1360,
      y: 280,
      r: 56,
      hp: 280,
      max: 280,
    },
    nestTimer: 3,
    covers: [
      {
        x: 980,
        y: 140,
        w: 90,
        h: 70,
      },
      {
        x: 1180,
        y: 820,
        w: 120,
        h: 80,
      },
    ],
    nodes: [
      {
        x: 180,
        y: 280,
        amount: 40,
        taken: false,
      },
      {
        x: 640,
        y: 200,
        amount: 40,
        taken: false,
      },
      {
        x: 900,
        y: 860,
        amount: 40,
        taken: false,
      },
      {
        x: 200,
        y: 980,
        amount: 40,
        taken: false,
      },
      {
        x: 780,
        y: 480,
        amount: 40,
        taken: false,
      },
    ],
    fish: [
      {
        x: 1100,
        y: 420,
        wps: [],
      },
      {
        x: 1240,
        y: 520,
        wps: [],
      },
    ],
  },
  // Ch4 Transit to Jupiter (side-scroll) + the Eye
  shooter: {
    weapon: "ship",
    world: {
      w: 8000,
      h: 540,
    },
    start: {
      x: 160,
      y: 270,
    },
    covers: [],
    kits: true,
  },
};

/** Music mood per chapter at chapter start. */
export const CHAPTER_MOOD = {
  shooter: "transit",
  base: "base",
  rescue: "holdouts",
  stealth: "rim",
} as const;
