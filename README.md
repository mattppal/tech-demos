# tech-demos

Sticky monorepo for Matt's weekday X-bookmark tech demos.

Each approved pick lands as:
- `apps/<slug>/` — Bun/Vite (or stack-appropriate) playground
- a branch + PR with **screenshot + video** validation of the running app

**No new GitHub repo per demo.**

## Apps

| Slug | Status | Notes |
|------|--------|-------|
| [`writing-bench`](./apps/writing-bench/) | built | Editorial side-by-side writing benchmarks for Cursor models — cached one-turn harness outputs, animated with generative-loaders |

## Layout

```
/
  README.md
  AGENTS.md                 # hard rules for cloud agents
  skills/
    project-planning/       # planning skill (copied from mattppal/skills)
  apps/
    _template/              # optional Bun+Vite React-TS stub
    <kebab-slug>/           # one folder per approved pick
  tracking/
    seen-bookmarks.json     # proposed / built / skipped
```

## Preview deploys (Cloudflare Pages)

Every PR (and push to `main`) builds all apps and deploys them to **one** Cloudflare
Pages project, **`tech-demos`** — one project for the whole repo, because Cloudflare
caps Pages projects per GitHub repository. Each demo gets a stable path:

```
https://<preview-host>/           # generated index of built demos
https://<preview-host>/<slug>/    # e.g. /cobe/, /shader-lab/
```

On PRs, the `preview` workflow comments the deployment URL plus a bullet per app.
Pushes to `main` deploy production (`tech-demos.pages.dev`).

### One-time setup

1. Add two GitHub Actions secrets (repo **Settings → Secrets and variables → Actions**):
   - `CLOUDFLARE_API_TOKEN` — API token with **Account → Cloudflare Pages → Edit**
     permission (create at dash.cloudflare.com → My Profile → API Tokens).
   - `CLOUDFLARE_ACCOUNT_ID` — from the Cloudflare dashboard sidebar or `wrangler whoami`.

The workflow creates the `tech-demos` Pages project automatically on its first run
(`wrangler pages project create`, idempotent). Until the secrets exist, the workflow
still builds `dist/` and just skips the deploy with a warning. No GitHub PAT is used
or needed — PR comments use `GITHUB_TOKEN`.

### How it works

- `scripts/build-all.ts` discovers `apps/*` (skipping `_template` and hidden dirs),
  runs `bun install` + `vite build --base=/<slug>/` for each, and emits a single
  `dist/` tree with `dist/<slug>/`, a generated index at `/`, and a `manifest.json`.
- SPA fallback: `scripts/pages-worker.js` is copied to `dist/_worker.js` (Pages
  advanced mode). It serves real static assets first and falls back to
  `/<slug>/index.html` for unmatched paths, so client-side routes never 404.
  (`_redirects` cannot do this: Pages evaluates rewrites before static assets,
  so a `/<slug>/*` rule would shadow the app's own JS/CSS.)
- `wrangler.jsonc` points Pages at `dist/` (`pages_build_output_dir`).
- `.github/workflows/preview.yml` builds with Bun and deploys via
  `cloudflare/wrangler-action` (`wrangler pages deploy`), using the PR head branch
  for preview aliases and `main` for production.
- Test locally: `bun run build` then `bun run preview` (wrangler pages dev on `dist/`).

App convention (already in `apps/_template`): never set `base` in `vite.config.ts`,
and reference `public/` assets via `import.meta.env.BASE_URL` — CI injects the
`/<slug>/` base path at build time.

## Adding a demo (for cloud agents)

1. Follow [`skills/project-planning`](./skills/project-planning/SKILL.md) and write `apps/<kebab-slug>/PLAN.md`
2. Implement a self-contained app: `cd apps/<slug> && bun install && bun run dev`
3. Prefer Bun + `bunfig.toml` with `[install] minimumReleaseAge = 259200` when JS
4. Prefer shadcn (minimalist) when UI
5. Open **one PR**; embed/attach **at least one screenshot AND at least one short video** (screen recording) of the running app — PR is not done without both
6. Do **not** create new repositories

See [AGENTS.md](./AGENTS.md) for hard rules. Model preference for builders: **Fable 5**.
