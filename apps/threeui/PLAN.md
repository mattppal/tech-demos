# PLAN — threeui (San Francisco playground)

## Goal

A one-screen playground where three free ThreeUI Community heroes live on a San
Francisco palette (fog, International Orange, bay light) with theme, lighting,
and motion controls.

Source: Matt's bookmark of [@trashh_dev's quote](https://x.com/trashh_dev/status/2090950343744266383)
of [Meng To's ThreeUI launch](https://x.com/MengTo/status/2090817187900780961) —
[threeui.com](https://threeui.com), MIT Community catalog on npm as
`@designcodeio/threeui`.

## Package research (verified against npm, not assumed)

- The 3-day `minimumReleaseAge` gate resolves `@designcodeio/threeui` to
  **0.3.0** (2026-08-21); 1.0.0 / 1.1.0 are younger than the gate. Pinned exact
  for reproducibility.
- All shortlisted heroes exist in 0.3.0 and are importable per-component via the
  `./components/*` export map, which keeps the 160-component catalog (and the
  bundled `three` copies) out of the bundle.
- The Neuform heroes render as **self-contained sandboxed iframes (`srcDoc`)** —
  no files to copy from `lib-dist/assets/`, so nothing breaks under the
  `/threeui/` preview base. `import.meta.env.BASE_URL` is still used for any
  app-local public assets.
- Theming surface: isolated effects (CloudField) take `mode`, `hue`,
  `saturation`, `brightness`; batch effects (GatewayFlow, TopoField) add
  `speed` and `opacity`. That is exactly a theme + lighting + motion API.

## Single-user MVP

- One screen: full-viewport active hero, quiet chrome overlaid.
- Three heroes: **CloudField** (marine layer), **GatewayFlow** (the bridge),
  **TopoField** (the hills). Swap with one control.
- Three SF theme presets driving `mode`/`hue`/`saturation`/`brightness` plus a
  CSS color wash: **Fog** (cool gray, low contrast), **Golden Hour**
  (International Orange ≈ #C0362C + warm haze), **Night** (bay lights, dark
  water).
- Lighting toggle (marine layer / clearing → brightness multiplier) and motion
  toggle (still / drift / alive → `speed`; hidden on CloudField, which has no
  speed knob).
- Credit line: Meng To / threeui.com + the bookmark.

## Explicitly out

- The catalog browse grid; ThreeUI Pro / MCP / CLI / auth; extra 3D libraries;
  hard-coded Vite `base`; touching other `apps/` folders; a new repo.

## Tasks (outcome-oriented)

1. Visitor sees a full-screen SF-themed hero at `bun run dev` (scaffold from
   `_template`, deps pinned behind the age gate, one hero wired).
2. Visitor swaps between the three heroes.
3. Visitor swaps Fog / Golden Hour / Night presets and the palette visibly
   changes (tuned by eye against real renders).
4. Visitor toggles lighting and motion.
5. Credits and tracking registered; build passes; PR with screenshot + video.

## Stack (one-line rationale each)

- **Bun + Vite + React + TS from `apps/_template`** — monorepo convention for
  one-screen demos; no framework-grade tooling needed.
- **`@designcodeio/threeui@0.3.0` (pinned)** — the prebuilt 3D; never hand-roll
  shaders.
- **Plain CSS chrome** — a few segmented controls don't justify shadcn/Tailwind
  here (per AGENTS.md, shadcn only when the demo has real UI chrome).

## Deferred

- More heroes / catalog browsing — the point is three cinematic picks.
- Upgrading to 1.x once it clears the age gate — 0.3.0 has everything needed.
- Preset persistence, share URLs, sound — not on the MVP path.
