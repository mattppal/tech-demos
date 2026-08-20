# PLAN — cobe globe playground

## Goal

A one-screen playground where you can drag a `cobe` WebGL globe, see two glow
markers (San Francisco + New York), and one SF→NYC arc.

## Single-user MVP

- Viewport-filling canvas rendered by `cobe` v2 (latest: 2.0.1, published
  2026-03, well past the 3-day age gate).
- Drag-to-rotate with pointer events, light auto-spin when idle, gentle
  inertia when released.
- Markers at SF (37.78, -122.44) and NYC (40.71, -74.01), each with an `id`
  so cobe v2's CSS anchor positioning can pin a small city label to it.
- One arc `{ from: SF, to: NYC }`.
- Three quiet color presets (light / dark / dusk) as small text buttons.
- README with `bun install` / `bun run dev`.

## Explicitly out of scope

- Swift/Metal/iOS (the bookmark was a Swift port; this demos the JS lib).
- Geocoding search, auth, accounts, multiplayer, extra pages.
- Heavy UI kits, settings panels, sliders.
- Custom WebGL — `cobe` does all rendering.

## Tasks (outcome-oriented)

1. Scaffold `apps/cobe` from `apps/_template` (Bun + Vite + React + TS),
   keep `bunfig.toml` age gate before any install.
2. `bun add cobe` — verify v2 arcs + `id` markers land in the bundle.
3. User can drag the globe and it auto-spins when idle; SF + NYC markers and
   the SF→NYC arc are visible; labels fade with marker visibility.
4. User can switch light / dark / dusk presets from three quiet buttons.
5. README, tracking update, PR with screenshot + video of the running app.

## Stack

- **Bun + Vite + React + TS** — copied from `apps/_template`, the house
  scaffold for sibling demos.
- **cobe 2.0.1** — the library being demoed; v2 confirmed (README) to support
  `arcs: [{ from, to }]`, `markers: [{ location, size, id? }]`,
  `--cobe-{id}` CSS anchors, and `onRender(state)` for phi/width/height.
- **No shadcn/ui** — chrome is a title and three text buttons over a canvas;
  pulling Tailwind + shadcn init for that would be a component-library dump.
  Plain CSS keeps the globe the hero.

## Deferred

- More cities / arcs, preset persistence, mobile-specific tuning, tests
  (throwaway demo UI, no critical logic).
