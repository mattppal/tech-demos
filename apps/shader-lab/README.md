# shader-lab

A tiny preset swapper for [basement.studio Shader Lab](https://eng.basement.studio/tools/shader-lab). One stage, four exported compositions, click to swap. Requires a WebGPU browser (recent Chrome, Edge or Safari); shows a quiet fallback otherwise.

```bash
bun install
bun run dev
```

Presets live in `src/presets/*.json` as `ShaderLabConfig` documents rendered by [`@basementstudio/shader-lab`](https://www.npmjs.com/package/@basementstudio/shader-lab). See `PLAN.md` for scope and preset provenance.
