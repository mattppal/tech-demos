# PLAN — writing-bench

## Goal (one sentence)

Editorial side-by-side writing benchmarks for Cursor models — cached one-turn harness outputs, displayed like a well-set magazine rather than a dashboard ("generative UI meets Substack").

## Single-user MVP

One reader, no accounts, no server. The app ships with hand-authored fixture runs so it works offline with zero API keys.

**In scope**

- Index view: list of benchmark runs and their prompts.
- Compare view: sticky shared-prompt header, 2–3 model columns of prose side-by-side at ≥1280px; segmented tabs (A / B / Split) below that. One scroll container; sticky model labels.
- Animated text reveal via `generative-loaders` `TextLoader` (cascade/typewriter) with a replay button; static text under `prefers-reduced-motion`.
- Fixture data in `fixtures/*.json` (benchmarkId, prompts, models, samples with output/status/durationMs/harness).
- `scripts/generate.ts` — regenerates fixtures with `@cursor/sdk` `Agent.prompt` (`CURSOR_API_KEY`, fixed model ids, `tools: []` so runs are prose-only).

**Out of scope (deferred)**

Live chat, auth, voting, multi-turn conversations, automatic judging, CMS, any new repository. Also deferred: streaming generation into the UI, more than two fixture runs, mobile-specific polish beyond the tab layout, tests beyond fixture-shape validation.

## Tasks (outcome-oriented)

1. Reader can open the app → Vite + React + TS scaffold boots with fonts, Tailwind, editorial base styles.
2. Reader can browse runs/prompts → Index route rendering fixture JSON.
3. Reader can compare outputs → Compare route: sticky prompt header, model columns / A-B-Split tabs, sticky model labels, single scroll container.
4. Reader sees text "generate" → TextLoader reveal on load + replay button, reduced-motion fallback.
5. Maintainer can regenerate data → `scripts/generate.ts` + README instructions.
6. Repo stays coherent → root README apps table + tracking file updated.

## Stack (one-line rationale each)

- **Bun** — repo-standard runtime/package manager; `bunfig.toml` age gate (259200s) before any install.
- **Vite + React 19 + TypeScript** (`bunx create-vite --template react-ts`) — official scaffold, matches `apps/_template`.
- **react-router v7 (library mode)** — boring default for two routes; no framework-grade tooling for a two-screen viewer.
- **Tailwind CSS v4 + shadcn/ui (minimal)** — repo preference; shadcn only for chrome (buttons/tabs), typography is hand-set.
- **@fontsource-variable/source-serif-4 + @fontsource-variable/inter** — self-hosted fonts, no runtime network dependency.
- **generative-loaders 0.1.1** — prebuilt `TextLoader` absorbs the whole reveal-animation task (verified: 4 days old, passes age gate; React ≥18 peer dep).
- **@cursor/sdk 1.0.27** — official `Agent.prompt` one-shot API with `tools: []` for prose-only runs; only used by the generate script, never by the UI.

## Design rules

Source Serif 4 for all reading prose; Inter for chrome. ~68ch measure, line-height ~1.65, `#363737` ink on `#fafaf7` warm paper. Hairline rules, generous whitespace, one warm-orange accent for CTAs. Editorial, not dashboard.

## Testing / hooks

Minimum useful surface: one `bun test` validating fixture JSON shape (the only data contract). No git hooks — monorepo has none; keep it consistent.
