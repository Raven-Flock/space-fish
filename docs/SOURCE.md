# Spacefish source

The editable source for the game GitHub Pages serves from `main /`. Since 1c9c028 the
root holds a hand-committed Vite build of this source (`assets/index-9xaohcOn.js`).

- `npm ci` then `npm run dev` (Vite dev server, opens `src/index.html`)
- `npm test` runs:
  - the **parity suite** against the live bundle `assets/index-9xaohcOn.js` (sha256-pinned in
    `test/helpers/liveOracle.ts`): same seed + inputs → same state, draw calls, audio, DOM;
  - **intended differences** are listed in one place (`INTENDED` in `test/helpers/sim.ts`,
    `COPY`, `LIVE_HUD` / `OUR_HUD` in `test/ui-parity.test.tsx`); parity runs with exactly
    those switched off, and `test/live-fixes.test.ts` and `test/phone-hud*.test.ts(x)` assert
    the new behaviour itself;
  - F-04 phone HUD: the in-play HUD subtree is the one intended DOM difference (cut out on both
    sides, its values compared separately). The extend-width stage draws exactly as live at
    16:9 and narrower (all parity sims run at 960x540), so draw-call parity is unchanged;
  - mutation checks: the oracle refuses changed bytes, and a 1% speed or 1 HP change fails parity.
- `npm run build` writes `dist/` (the site as Pages would serve it) and runs the dist guard

When a new build is published to the root, keep the old bundle file committed until the
oracle is re-pinned to the new one (same rule as `routes-NYJyl2-8.js` for 69cf5be).
Switching Pages to publish `dist/` is a separate, Sean-approved step.

## Layout (GD MODULE-STRUCTURE-v0.1 §2)

| Folder | Holds |
|---|---|
| `src/app/` | React shell: title, credits, HUD (F-04 top strip, hint line, F-02's Pause in the `#sf-pause-slot` slot, right stack with labels), pause, death, victory, floating touch stick + Fire, overlay build tray, music slider; `hudLayout.ts` (pure layout math) |
| `src/engine/` | fixed-step loop (60 Hz), input map, view/camera, math + collision, `rng.ts` (only place randomness comes from) |
| `src/game/` | `Game.ts` (state + tick + HUD snapshot), on-foot player, ship, weapons, `shovel.ts` (D-11 melee on Use), projectiles, particles, holdouts; `enemies/fish.ts`, `enemies/eye.ts` |
| `src/waves/` | Transit spawner + Jupiter trigger (ends on distance; no time-limit API) |
| `src/reclaim/` | the Pad: scrap nodes, wreck repairs (Generator, Turret, Lab), turrets, nest, launch check |
| `src/modes/` | `arcade.ts`: title flow and chapter sequence |
| `src/content/` | data only: `arcade/chapters.ts`, `arcade/transit.ts`, `cutscenes.ts`, `boss.ts`, `tuning/*` (incl. `tuning/shovel.ts`, `tuning/hud.ts` for VP's phone HUD limits) |
| `src/cutscenes/` | cutscene beats, intro stills + voice; `introLoad.ts` intro plate gate + load order (F-05) |
| `src/audio/` | `AudioDirector`: music loops, crossfades, oscillator cues |
| `src/assets/` | image loader |
| `src/save/` | v1 save + music key (unchanged formats) |
| `src/upgrades/` | `stat(key, base)`; identity for now (the D-11 shovel never goes through it) |
| `src/debug/` | live QA flags `?phase=`, `?qa=1`, `window.__controlsTest` |
| `src/render/` | Canvas 2D draw passes; `bleed.ts` carries ground/horizon backdrops into the side bleed (F-04) |

`Game` is one class split across modules: each module exports a method bag and
`game/install.ts` puts them on `Game.prototype`, so the instance looks exactly like
live's single class (QA's `window.__G()` hook still works).
