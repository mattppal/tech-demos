#!/usr/bin/env bun
/**
 * Builds every demo app under apps/<slug>/ into a single static tree:
 *
 *   dist/
 *     index.html        <- generated index listing all built apps
 *     404.html          <- disables Pages' implicit root SPA fallback
 *     _worker.js        <- per-app SPA fallback (see scripts/pages-worker.js)
 *     manifest.json     <- machine-readable list of built apps (used by CI PR comment)
 *     <slug>/...        <- each app, built with --base=/<slug>/
 *
 * Conventions (see AGENTS.md "Previews"):
 * - Directories starting with "_" or "." are skipped (apps/_template).
 * - Vite apps are built with `vite build --base=/<slug>/`; the CLI flag
 *   overrides vite.config.ts, so apps must NOT hard-code `base`.
 * - Non-Vite apps with a package.json `build` script are built with
 *   `bun run build` and must emit a base-path-safe (relative-URL) bundle
 *   into dist/, build/, or out/.
 * - Directories with a bare index.html and no package.json are copied as-is.
 * - Client-side routes under /<slug>/* are handled by dist/_worker.js.
 */

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "..");
const APPS_DIR = join(ROOT, "apps");
const OUT_DIR = join(ROOT, "dist");

interface BuiltApp {
  slug: string;
  name: string;
  description: string;
}

function run(cmd: string[], cwd: string): boolean {
  console.log(`\n$ ${cmd.join(" ")}  (in ${cwd.replace(ROOT + "/", "")})`);
  const proc = Bun.spawnSync(cmd, { cwd, stdout: "inherit", stderr: "inherit" });
  return proc.exitCode === 0;
}

function discoverSlugs(): string[] {
  return readdirSync(APPS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith("_") && !e.name.startsWith("."))
    .map((e) => e.name)
    .sort();
}

async function buildApp(slug: string): Promise<BuiltApp | null> {
  const appDir = join(APPS_DIR, slug);
  const pkgPath = join(appDir, "package.json");
  let name = slug;
  let description = "";

  if (!existsSync(pkgPath)) {
    // Static app: no package.json, just files to serve.
    if (existsSync(join(appDir, "index.html"))) {
      cpSync(appDir, join(OUT_DIR, slug), {
        recursive: true,
        filter: (src) => !src.includes("node_modules") && !/\/\.[^/]+$/.test(src),
      });
      return { slug, name, description };
    }
    console.warn(`! apps/${slug}: no package.json and no index.html — skipping`);
    return null;
  }

  const pkg = await Bun.file(pkgPath).json();
  name = pkg.name ?? slug;
  description = pkg.description ?? "";
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };

  if (!run(["bun", "install"], appDir)) {
    throw new Error(`bun install failed for apps/${slug}`);
  }

  let outDir: string;
  if (deps.vite) {
    // --base on the CLI overrides vite.config.ts, so every app is built
    // for its /<slug>/ subpath without per-app configuration.
    if (!run(["bun", "x", "vite", "build", "--base", `/${slug}/`], appDir)) {
      throw new Error(`vite build failed for apps/${slug}`);
    }
    outDir = join(appDir, "dist");
  } else if (pkg.scripts?.build) {
    if (!run(["bun", "run", "build"], appDir)) {
      throw new Error(`bun run build failed for apps/${slug}`);
    }
    const candidate = ["dist", "build", "out"].find((d) =>
      existsSync(join(appDir, d, "index.html")),
    );
    if (!candidate) {
      throw new Error(`apps/${slug}: build produced no dist/, build/, or out/ with an index.html`);
    }
    outDir = join(appDir, candidate);
  } else {
    console.warn(`! apps/${slug}: package.json has no build script and no vite dep — skipping`);
    return null;
  }

  cpSync(outDir, join(OUT_DIR, slug), { recursive: true });
  return { slug, name, description };
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function writeIndex(apps: BuiltApp[]) {
  const items = apps
    .map(
      (a) => `      <li>
        <a href="/${a.slug}/">
          <span class="slug">/${a.slug}/</span>
          <span class="name">${escapeHtml(a.name)}</span>
          ${a.description ? `<span class="desc">${escapeHtml(a.description)}</span>` : ""}
        </a>
      </li>`,
    )
    .join("\n");

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>tech-demos</title>
    <style>
      :root { color-scheme: light dark; }
      body {
        font-family: ui-sans-serif, system-ui, sans-serif;
        max-width: 40rem;
        margin: 0 auto;
        padding: 4rem 1.5rem;
        line-height: 1.5;
      }
      h1 { font-size: 1.5rem; margin-bottom: 0.25rem; }
      p.sub { opacity: 0.65; margin-top: 0; }
      ul { list-style: none; padding: 0; }
      li { margin: 0.5rem 0; }
      li a {
        display: block;
        padding: 0.75rem 1rem;
        border: 1px solid color-mix(in srgb, currentColor 20%, transparent);
        border-radius: 0.5rem;
        text-decoration: none;
        color: inherit;
      }
      li a:hover { border-color: color-mix(in srgb, currentColor 50%, transparent); }
      .slug { font-family: ui-monospace, monospace; font-weight: 600; }
      .name { opacity: 0.65; margin-left: 0.5rem; }
      .desc { display: block; font-size: 0.875rem; opacity: 0.65; margin-top: 0.125rem; }
      .empty { opacity: 0.65; }
    </style>
  </head>
  <body>
    <h1>tech-demos</h1>
    <p class="sub">${apps.length} demo${apps.length === 1 ? "" : "s"} built from <code>apps/</code></p>
    ${apps.length ? `<ul>\n${items}\n    </ul>` : `<p class="empty">No apps built yet. Add one under <code>apps/&lt;slug&gt;/</code>.</p>`}
  </body>
</html>
`;
  writeFileSync(join(OUT_DIR, "index.html"), html);
}

function write404() {
  writeFileSync(
    join(OUT_DIR, "404.html"),
    `<!doctype html>
<html lang="en">
  <head><meta charset="UTF-8" /><title>404 — tech-demos</title></head>
  <body style="font-family: ui-sans-serif, system-ui, sans-serif; max-width: 40rem; margin: 4rem auto; padding: 0 1.5rem;">
    <h1>404</h1>
    <p>Nothing here. <a href="/">Back to the demo index</a>.</p>
  </body>
</html>
`,
  );
}

function writeSpaFallbackWorker() {
  // Per-app SPA fallback lives in a Pages advanced-mode worker; see the
  // comment in scripts/pages-worker.js for why _redirects cannot do this.
  cpSync(join(ROOT, "scripts", "pages-worker.js"), join(OUT_DIR, "_worker.js"));
}

const slugs = discoverSlugs();
console.log(`Discovered ${slugs.length} app(s): ${slugs.join(", ") || "(none)"}`);

rmSync(OUT_DIR, { recursive: true, force: true });
mkdirSync(OUT_DIR, { recursive: true });

const built: BuiltApp[] = [];
const failed: string[] = [];
for (const slug of slugs) {
  try {
    const app = await buildApp(slug);
    if (app) built.push(app);
  } catch (err) {
    console.error(`✗ apps/${slug}: ${err instanceof Error ? err.message : err}`);
    failed.push(slug);
  }
}

writeIndex(built);
write404();
writeSpaFallbackWorker();
writeFileSync(
  join(OUT_DIR, "manifest.json"),
  JSON.stringify({ generatedAt: new Date().toISOString(), apps: built }, null, 2) + "\n",
);

console.log(`\nBuilt ${built.length}/${slugs.length} app(s) into dist/`);
if (failed.length) {
  console.error(`Failed: ${failed.join(", ")}`);
  process.exit(1);
}
