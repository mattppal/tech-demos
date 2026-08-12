# AGENTS.md — hard rules for cloud agents

This is a sticky monorepo. Follow these rules without exception.

1. **Never create a new GitHub repo.** Only add/update folders under `apps/<slug>/`.
2. **Every new demo:** run `skills/project-planning` first (or follow it closely), write `apps/<slug>/PLAN.md`, then implement.
3. **Each app is self-contained:** `cd apps/<slug> && bun install && bun run dev`.
4. **Bun default** for JS apps, with `bunfig.toml`:
   ```toml
   [install]
   minimumReleaseAge = 259200
   ```
5. **Artifact validation (hard rule):** Every PR must embed/attach **both** of the following of the running app (`bun run dev`):
   - at least one **screenshot**, and
   - at least one short **video** (screen recording).
   A PR is **not done** without both. Screenshot alone or video alone is insufficient.
6. **Open one PR per pick.**
7. **Model preference for builders:** Fable 5 (`claude-fable-5`).
8. **Prefer shadcn** (minimalist) when the demo has UI.

## Template

Use `apps/_template/` as a starting point (Bun + Vite + React + TypeScript), or scaffold equivalently. Rename/copy into `apps/<kebab-slug>/` — do not leave work only in `_template`.

## Tracking

Update `tracking/seen-bookmarks.json` when proposing, building, or skipping a bookmark pick.

## Cursor Cloud specific instructions

Durable, non-obvious notes for future cloud agents (the startup update script already installs `bun` and runs `bun install` for every `apps/*` that has a `package.json`).

- **Runtime:** JS apps use `bun` (installed at `~/.bun/bin`, on `PATH` via `~/.bashrc`). Bun's official `bun.sh` installer is blocked by egress; the binary is fetched from GitHub Releases instead. `npm`/GitHub Releases reach the network fine.
- **Per-app dev loop:** each app is self-contained — `cd apps/<slug> && bun install && bun run dev`. Vite dev server serves on `http://localhost:5173/` (auto-increments if the port is taken). Run it as a long-lived process (e.g. a tmux terminal), not from `install`.
- **`apps/_template` build caveat:** `bun run dev` works, but `bun run build` (which runs `tsc -b`) fails with `TS2307: Cannot find module './index.css'` because the template ships no `vite-env.d.ts`. This is a pre-existing template gap, not an environment problem. New apps that need a passing `bun run build` should add a `src/vite-env.d.ts` containing `/// <reference types="vite/client" />`.
- **Lockfiles:** `bun install` generates `apps/<slug>/bun.lock`, which is not covered by the template `.gitignore`; commit it with the app (don't commit the throwaway `bun.lock` under `apps/_template/`).
