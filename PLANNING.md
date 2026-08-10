# PLANNING

Cloud agents adding demos to this monorepo must follow these rules:

- Only add folders under `demos/<kebab-slug>/` — never create new GitHub repositories.
- Use model **Fable 5** (`claude-fable-5`) for demo work.
- Each demo folder must be a self-contained app (prefer Bun + Vite when JS).
- Open one PR per demo and include screenshot/video artifacts proving the demo runs.
- Prefer `bunfig.toml` with `[install] minimumReleaseAge = 259200` for JS installs.
