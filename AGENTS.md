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

## Previews (Cloudflare Pages)

Every PR and push to `main` builds **all** apps and deploys them to **one** Cloudflare
Pages project, `tech-demos` (`.github/workflows/preview.yml` + `scripts/build-all.ts`).
Never create a per-app Pages project — Cloudflare caps Pages projects per GitHub repo.

- Each app is served at `https://<preview-host>/<slug>/`; `/` is a generated index.
- CI builds Vite apps with `vite build --base=/<slug>/`. Do **not** hard-code `base`
  in `vite.config.ts`, and reference `public/` assets via `import.meta.env.BASE_URL`
  (or relative URLs) — never absolute `/...` paths.
- SPA fallback for `/<slug>/*` is automatic (`scripts/pages-worker.js`); no per-app config.
- Deploys need the `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` Actions secrets
  (see README "Preview deploys"). Never create or use a GitHub PAT for this.
- Verify locally with `bun run build` then `bun run preview` from the repo root.

## Template

Use `apps/_template/` as a starting point (Bun + Vite + React + TypeScript), or scaffold equivalently. Rename/copy into `apps/<kebab-slug>/` — do not leave work only in `_template`.

## Tracking

Update `tracking/seen-bookmarks.json` when proposing, building, or skipping a bookmark pick.
