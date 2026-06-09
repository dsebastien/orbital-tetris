# Orbital Tetris

Circular Tetris built with [Excalibur.js](https://excaliburjs.com), TypeScript and Vite
(based on the [template-ts-vite](https://github.com/excaliburjs/template-ts-vite) setup).

Circular blocks fly from the edges of the screen toward a living core. They bind to the
core when they reach it, stacking outward ring by ring. Rotate the core so the incoming
blocks land where you want: a fully assembled ring disappears and scores points. If a
stack grows past the dashed boundary, the run is over.

## Controls

| Input | Action |
| --- | --- |
| `←` / `→` or `A` / `D` | Rotate the core and all bound blocks |
| Touch left / right half of the screen | Rotate (mobile) |

## Rules

- Blocks travel radially inward and bind to the outermost free ring of the sector they hit.
- A ring fully occupied across all 12 sectors clears, and everything above collapses inward.
- Scoring: 5 points per bound block, `100 × n²` points for `n` rings cleared at once.
- 100 levels: block speed, spawn rate, concurrent blocks and rings required all ramp up.
  Speed only changes when a new level starts.
- Game over when a block would bind beyond the field boundary. Then: **Continue** (retry
  the current level, keeping your score), **Try Again** (back to level 1) or **Main Menu**.

## Development

```bash
npm install
npm run dev      # dev server with HMR
npm run build    # type-check (strict) + production build to dist/
npm run preview  # serve the production build
```

## Architecture

- `src/constants.ts` — every game constant in one place
- `src/types.ts` — shared interfaces (grid, levels, scene-transition data)
- `src/grid.ts` — pure polar-grid logic: binding, full-ring detection, collapse
- `src/levels.ts` — the 100-level difficulty curve
- `src/field.ts` — playfield controller: spawning, rotation, binding, clears, scoring
- `src/actors/` — core visual (pulse, motes, sector guides) and incoming block actors
- `src/fx/particles.ts` — bursts, trails and score popups
- `src/ui/` — HUD labels and buttons
- `src/scenes/` — menu (self-playing attract mode), game, game over

The playfield is a polar grid: 12 sectors × 7 rings around the core. The core actor
rotates; bound blocks are children of it in local polar coordinates, while incoming
blocks fly in world space along fixed radial paths — which is why rotating changes
where they land.
