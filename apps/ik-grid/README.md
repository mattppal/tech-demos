# ik-grid

Inverse-kinematics stick figures living on a resizable grid. Drag the grid's
corners (or the grid itself) and the figures step, shuffle, and stretch to keep
their feet planted on the cell corners. Left alone, they breathe, sway, and
wander to neighboring cells.

Idea by [@measure_plan](https://x.com/measure_plan/status/2077380797464559769),
originally from **kiel.d.m** on Instagram. Recreated from scratch for this repo —
no code taken from any existing clone.

## Run it

```bash
cd apps/ik-grid
bun install
bun run dev
```

## How it works

- Canvas 2D only; React is just the shell and the quiet chrome.
- Each figure stands on two adjacent grid vertices. Legs and arms are two-bone
  chains solved analytically (law of cosines); hips, spine, and head follow the feet.
- Feet never teleport: when a vertex moves (grid drag) or a figure decides to
  wander, each foot animates a lifted step to its new target, alternating sides.
- Density presets (sparse / cozy / packed) change the column/row count and the
  number of figures.

## Preview deploys

Built by the shared Cloudflare Pages pipeline with `vite build --base=/ik-grid/`,
so `vite.config.ts` sets no `base` and no absolute `/...` asset paths are used.
