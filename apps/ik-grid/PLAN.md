# PLAN — ik-grid

## Goal (one sentence)

A one-screen canvas playground where you drag a grid's size and a handful of
inverse-kinematics stick figures keep their feet planted on grid vertices,
stepping and stretching as the cells move.

Inspired by [@measure_plan's demo](https://x.com/measure_plan/status/2077380797464559769)
(idea originally by kiel.d.m on Instagram). Recreated from scratch — no code
copied from any clone.

## Single-user MVP

- Full-viewport canvas with quiet chrome (tiny title/hint, three density presets).
- One rectangular grid; drag its corners to resize, drag its body to move.
  The motion is the demo.
- 4–8 procedurally drawn stick figures (Keith Haring vibe: thick round strokes,
  bold colors, round heads). Each stands on two adjacent grid vertices.
- Two-bone analytic IK per leg (hip→knee→ankle) and per arm; short spine + head
  follow the hips. Feet chase their vertices with animated steps — never teleport.
- Idle motion: breathing, weight shift, arm sway, and occasional wandering to a
  free neighboring stance so a recording is never a still frame.
- Density presets (sparse / cozy / packed) change column/row count and figure count.

## Explicitly out of scope

- Physics engines, 3D, WebGL, Three.js, rig/spine files, audio, accounts, routing.
- shadcn/Tailwind/UI kits — the chrome is three plain buttons and two lines of text.
- Cloning sloptown.com/wiggle or other clones as a dependency.
- Persistence, mobile-specific gestures beyond basic pointer events, tests
  (all logic is churn-prone visual glue; nothing money/auth/data-critical).

## Stack (one-line rationale each)

- **Bun + Vite + React + TS, copied from `apps/_template`** — house scaffold;
  matches sibling apps and the shared Cloudflare Pages build (`--base=/ik-grid/`
  injected by CI, so no `base` in `vite.config.ts`).
- **Canvas 2D, React as shell only** — a few hundred strokes per frame; no need
  for WebGL or a render library.
- **In-app two-bone analytic IK (~30 lines)** — researched small 2D IK npm
  packages: `ikts` is 2D-capable but ~400KB and stale since 2022, Fullik is
  Three.js-oriented and untyped, `inverse-kinematics` is gradient-descent
  rather than analytic. Law-of-cosines two-bone solve is the smallest thing
  that looks right.
- **`bunfig.toml` with `[install] minimumReleaseAge = 259200`** — house rule,
  copied before any install.

## Tasks (outcome-oriented, in build order)

1. Scaffold `apps/ik-grid` from `apps/_template`; app boots with `bun run dev`.
2. Grid you can resize: full-viewport canvas, corner-handle resize + body drag,
   density presets.
3. Figures planted on the grid: two-bone IK limbs, feet step to chase moving
   vertices, hips/torso/head follow, idle breathing/sway/wander.
4. Quiet chrome + README + one-line `package.json` description for the preview index.
5. PR with screenshot + video of the running app; update `tracking/seen-bookmarks.json`.

## Deferred

- Sound-reactive or scroll-reactive motion, per-figure personalities, obstacle
  avoidance between figures beyond stance occupancy, touch multi-handle resize.
- Replan after the first end-to-end slice if stepping looks wrong at extreme
  cell sizes (fallback: clamp cell aspect instead of allowing splits).
