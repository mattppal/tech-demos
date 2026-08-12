# writing-bench

Editorial side-by-side writing benchmarks for Cursor models — cached one-turn
harness outputs, displayed like a magazine spread rather than a dashboard.

## Run it

```sh
cd apps/writing-bench
bun install
bun run dev
```

No API keys needed: the app reads committed fixtures from `fixtures/*.json`.

## What it does

- **Index** (`/`) lists benchmark runs and their prompts.
- **Compare** (`/compare/:benchmarkId/:promptId`) shows the shared prompt in a
  sticky header with each model's prose side by side (≥1280px) or behind
  segmented tabs — one per model, plus **Split** — on smaller screens. The
  whole page is one scroll container, so columns never drift apart.
- Text replays through [`generative-loaders`](https://www.npmjs.com/package/generative-loaders)'
  `TextLoader` (cascade variant) on load and via the **Replay** button. Under
  `prefers-reduced-motion` the prose renders statically instead.

## Fixture shape

Each `fixtures/<benchmarkId>.json` is one benchmark run:

```json
{
  "benchmarkId": "writing-v1",
  "title": "Short Prose I",
  "generatedAt": "2026-08-10T14:22:00Z",
  "prompts": [{ "id": "p1", "title": "…", "text": "…" }],
  "models": [{ "id": "composer-2.5", "displayName": "Composer 2.5" }],
  "samples": [
    {
      "promptId": "p1",
      "modelId": "composer-2.5",
      "output": "…",
      "status": "finished",
      "durationMs": 4180,
      "harness": { "sdk": "@cursor/sdk", "tools": [] }
    }
  ]
}
```

Any JSON file dropped into `fixtures/` appears in the UI automatically.
Validate with `bun test`.

## Regenerating fixtures

`scripts/generate.ts` runs every prompt against every configured model once
via `@cursor/sdk`'s `Agent.prompt`, with `tools: []` (prose-only, no shell /
edit / web tools) and instructions to answer with plain paragraphs:

```sh
CURSOR_API_KEY=your-key bun run generate
```

It overwrites `fixtures/writing-v1.json`. Model ids are fixed in the script;
`Cursor.models.list()` (same SDK) shows what your key can reach. The shipped
fixtures are hand-authored samples so the app works without any key.

## Stack

Bun · Vite · React 19 · TypeScript · Tailwind 4 · shadcn-style components
(button, tabs) · react-router · generative-loaders · Source Serif 4 + Inter
via Fontsource. Scaffolded with `bunx create-vite@8 --template react-ts`.

See [PLAN.md](./PLAN.md) for scope and decisions.
