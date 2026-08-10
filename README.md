# tech-demos

Sticky monorepo for Matt's weekday X-bookmark tech demos.

Each approved pick lands as:
- `demos/<slug>/` — Bun/Vite (or stack-appropriate) playground
- a branch + PR with screenshots/videos for validation

No new GitHub repo per demo.

## Layout
```
demos/
  generative-loaders/   # example
  img2threejs/          # optional later migration
PLANNING.md             # how agents should add a demo
```

## Adding a demo (for cloud agents)
1. Create `demos/<kebab-slug>/` from PLAN for that pick
2. Root of that folder is a self-contained app (`bun install && bun run dev`)
3. Prefer Bun + `bunfig.toml` with `[install] minimumReleaseAge = 259200` when JS
4. Open one PR; attach screenshots/videos proving the demo runs
5. Do not create new repositories
