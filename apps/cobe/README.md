# cobe — globe playground

One-screen demo of [cobe](https://github.com/shuding/cobe) v2, Shu Ding's
~5KB zero-dependency WebGL globe.

- Drag to rotate, light auto-spin (with a little inertia) when idle.
- Glow markers on San Francisco and New York, one SF→NYC arc.
- City labels pinned to the markers via cobe v2's CSS anchor positioning
  (`--cobe-{id}` anchors + `--cobe-visible-{id}` visibility variables).
- Three quiet color presets: light / dark / dusk.

## Run

```bash
cd apps/cobe
bun install
bun run dev
```

Bun is the runtime and package manager (`bunfig.toml` pins the 3-day
`minimumReleaseAge` install gate). Stack: Vite + React + TypeScript, copied
from `apps/_template`.

## Notes

- cobe v2 (2.0.1) has no `onRender` loop of its own — `createGlobe` returns
  `{ update, destroy }` and each `update()` call renders one frame, so the
  app drives a `requestAnimationFrame` loop and feeds `phi` (and resized
  `width`/`height`) through it.
- Presets swap `dark` / `baseColor` / `markerColor` / `glowColor` /
  `arcColor` / `mapBrightness` / `diffuse` live through `globe.update()`.
