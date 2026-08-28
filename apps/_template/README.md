# _template

Minimal Bun + Vite + React + TypeScript stub for new demos.

```bash
cp -r apps/_template apps/<kebab-slug>
cd apps/<kebab-slug>
bun install
bun run dev
```

Then replace this README, add `PLAN.md` from project-planning, and implement the pick.

## Preview deploys

Every app in `apps/` is deployed to a shared Cloudflare Pages project and served
at `https://<preview>/<slug>/`. CI builds with `vite build --base=/<slug>/`, so:

- do **not** set `base` in `vite.config.ts`
- reference `public/` assets via `import.meta.env.BASE_URL` (or relative URLs),
  never absolute `/...` paths
- client-side routes get an SPA fallback automatically (a generated `_worker.js`
  serves `/<slug>/index.html` for unmatched paths under `/<slug>/`)

Nothing else is needed — new apps get a preview URL on their next PR.
