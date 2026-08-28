# shader-lab — preset swapper

## Goal

Flip through a handful of exported basement.studio Shader Lab compositions on one stage. Magazine-small, not a shader IDE.

Source pick: X bookmark `2085841772211843502` (https://x.com/alaymanguy/status/2085841772211843502) — `@basementstudio/shader-lab`.

## MVP (in)

- One stage rendering a `ShaderLabConfig` via `ShaderLabComposition` from `@basementstudio/shader-lab`.
- A small preset list (4 compositions). Clicking a preset swaps the config on the stage.
- 4 real exported `ShaderLabConfig` JSON presets shipped in-repo under `src/presets/`, derived from the Shader Lab editor's own data (see "Preset provenance" below). Clearly labeled.
- WebGPU detection (`navigator.gpu`) plus the component's `onRuntimeError` callback; a quiet fallback panel when WebGPU is missing.
- Quiet editorial UI: hairline rules, whitespace, one-line credit to basement.studio / Shader Lab.

## Out (explicitly)

- Live uniform sliders / postprocessing playground, layer editor, Leva, timeline scrubber.
- Webcam / MediaPipe layers (the editor supports a `live` layer type; not used here).
- Sound, auth, saving user compositions, re-implementing the editor or a TSL compiler.
- New repos.

## Tasks (vertical slices)

1. User sees one real composition render on the stage (`bun run dev` → CRT preset animating).
2. User can click another preset and the stage swaps compositions.
3. User without WebGPU sees a plain-language fallback panel instead of a broken canvas.
4. Presets are labeled with name + one-line description; page carries the basement.studio credit line.

## Stack

- **Bun + Vite + React 19 + TypeScript** — monorepo default, copied from `apps/_template/`; `bunfig.toml` with `[install] minimumReleaseAge = 259200` present before any install.
- **`@basementstudio/shader-lab` v3** — does all rendering (three/webgpu + TSL internally); peers `react@^19`, `three@^0.183.0`.
- **Tailwind v4 + shadcn/ui (neutral, `button` only)** — monorepo prefers shadcn for UI; only the one component the preset picker actually uses. No other components pulled in.
- No router, no state library, no framework-grade tooling — one screen, one `useState`.

## Preset provenance (no invented data)

`@basementstudio/shader-lab` ships no preset JSON files; the editor at eng.basement.studio/tools/shader-lab exports a TSX snippet with the config JSON inlined (`src/lib/editor/shader-export-snippet.ts` strips `composition` and keeps `{ layers, timeline }`). The real config data in the repo is:

- `src/lib/editor/default-project.json` — the editor's default 5-layer project (gradient → text → pattern → dithering → CRT) with fully tuned params.
- `src/lib/editor/config/layer-registry.ts` — the editor's default parameter values for every layer type.

Presets shipped here:

1. **Signal** (`crt.json`) — the default project verbatim (editor-only fields stripped): gradient + pattern + text + dithering + CRT slot-mask.
2. **Newsprint** (`halftone.json`) — same gradient + text sources, halftone effect with the registry's default CMYK params and the editor's `newspaper` ink preset option.
3. **Bleed** (`ink.json`) — same gradient + text sources, ink effect with the registry's default Ink Bleed params.
4. **Bayer** (`dither.json`) — the default project's own dithering layer over its gradient + text, CRT/pattern removed.

## Deferred

- More presets (the editor has ~30 layer types: fluid, ascii, pixel-sorting, voxel, ...).
- Uniform tweaking, timeline controls, export-back-to-editor.
- Using `useShaderLab` to feed the output texture into a custom three scene.
- Tests: no critical logic (static configs + one click handler), so none — per planning skill.
