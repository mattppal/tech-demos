// Copied into dist/_worker.js by scripts/build-all.ts (Cloudflare Pages
// "advanced mode"). Plain `_redirects` rules cannot express a per-app SPA
// fallback: Pages evaluates rewrites BEFORE static assets, so a
// `/<slug>/*` catch-all would shadow the app's own JS/CSS. This worker
// serves real assets first and only falls back to the app shell
// (/<slug>/index.html) for unmatched GET/HEAD paths, so client-side
// routes like /<slug>/some/route never 404.
export default {
  async fetch(request, env) {
    const asset = await env.ASSETS.fetch(request);
    if (asset.status !== 404) return asset;

    if (request.method === "GET" || request.method === "HEAD") {
      const url = new URL(request.url);
      const match = url.pathname.match(/^\/([^/]+)\//);
      if (match) {
        const shell = await env.ASSETS.fetch(new URL(`/${match[1]}/`, url), {
          headers: request.headers,
        });
        const isHtml = (shell.headers.get("content-type") ?? "").includes("text/html");
        if (shell.status === 200 && isHtml) {
          return new Response(shell.body, shell);
        }
      }
    }

    return asset;
  },
};
