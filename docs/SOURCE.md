# Spacefish source (R0 parity rebuild)

The editable source for the game GitHub Pages serves from `main /` (live 69cf5be).
R0 is **behaviour-identical** to live: same numbers, same timings, same bugs
(including fish chase 160 px/s vs walk 156 px/s, AAA F-01). Fixes come in later PRs.

- `npm ci` then `npm run dev` (Vite dev server, opens `src/index.html`)
- `npm test` runs the parity suite against the live chunk `assets/routes-NYJyl2-8.js`
- `npm run build` writes `dist/` (the site as Pages would serve it) and runs the dist guard

The repo root still holds the published files (index.html, 404.html, sw.js, assets/,
music/, opening/, rim/, sprites/). R0 does not move or change them, so merging this
PR does not change the live site. Switching Pages to publish `dist/` is a separate,
Sean-approved step.

## Layout (GD MODULE-STRUCTURE-v0.1 §2)

| Folder | Holds in R0 |
|---|---|
| `src/app/` | React shell: title, credits, HUD, pause, death, victory, touch stick + pad, build bar, music slider |
| `src/engine/` | fixed-step loop (60 Hz), input map, view/camera, math + collision, `rng.ts` (only place randomness comes from) |
| `src/game/` | `Game.ts` (state + tick + HUD snapshot), on-foot player, ship, weapons, projectiles, particles, holdouts; `enemies/fish.ts`, `enemies/eye.ts` |
| `src/waves/` | Transit spawner + Jupiter trigger (ends on distance; no time-limit API) |
| `src/reclaim/` | the Pad: scrap nodes, build picks (Generator, Turret, Lab), turrets, nest, launch check |
| `src/modes/` | `arcade.ts`: title flow and chapter sequence |
| `src/content/` | data only: `arcade/chapters.ts`, `arcade/transit.ts`, `cutscenes.ts`, `boss.ts`, `tuning/*` |
| `src/cutscenes/` | cutscene beats, intro stills + voice |
| `src/audio/` | `AudioDirector`: music loops, crossfades, oscillator cues |
| `src/assets/` | image loader |
| `src/save/` | v1 save + music key (unchanged formats) |
| `src/upgrades/` | `stat(key, base)`; identity in R0 |
| `src/debug/` | live QA flags `?phase=`, `?qa=1`, `window.__controlsTest` |
| `src/render/` | Canvas 2D draw passes |

`Game` is one class split across modules: each module exports a method bag and
`game/install.ts` puts them on `Game.prototype`, so the instance looks exactly like
live's single class (QA's `window.__G()` hook still works).
