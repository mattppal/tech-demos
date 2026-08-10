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
5. **Open one PR per pick;** attach screenshots/videos proving the UI runs.
6. **Model preference for builders:** Fable 5 (`claude-fable-5`).
7. **Prefer shadcn** (minimalist) when the demo has UI.

## Template

Use `apps/_template/` as a starting point (Bun + Vite + React + TypeScript), or scaffold equivalently. Rename/copy into `apps/<kebab-slug>/` — do not leave work only in `_template`.

## Tracking

Update `tracking/seen-bookmarks.json` when proposing, building, or skipping a bookmark pick.
