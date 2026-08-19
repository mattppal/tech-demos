# tech-demos

Sticky monorepo for Matt's weekday X-bookmark tech demos.

Each approved pick lands as:
- `apps/<slug>/` — Bun/Vite (or stack-appropriate) playground
- a branch + PR with **screenshot + video** validation of the running app

**No new GitHub repo per demo.**

## Apps

| Slug | Status | Notes |
|------|--------|-------|
| [`shader-lab`](./apps/shader-lab/) | built | Preset swapper for basement.studio Shader Lab compositions (`@basementstudio/shader-lab`, WebGPU) |

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

## Adding a demo (for cloud agents)

1. Follow [`skills/project-planning`](./skills/project-planning/SKILL.md) and write `apps/<kebab-slug>/PLAN.md`
2. Implement a self-contained app: `cd apps/<slug> && bun install && bun run dev`
3. Prefer Bun + `bunfig.toml` with `[install] minimumReleaseAge = 259200` when JS
4. Prefer shadcn (minimalist) when UI
5. Open **one PR**; embed/attach **at least one screenshot AND at least one short video** (screen recording) of the running app — PR is not done without both
6. Do **not** create new repositories

See [AGENTS.md](./AGENTS.md) for hard rules. Model preference for builders: **Fable 5**.
