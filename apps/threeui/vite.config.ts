import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Do NOT set `base` here. Preview deploys build every app with
// `vite build --base=/<slug>/` (see scripts/build-all.ts) so it is served
// at https://<preview>/<slug>/. Reference public/ assets via
// `import.meta.env.BASE_URL` instead of absolute "/..." URLs.
export default defineConfig({
  plugins: [react()],
});
