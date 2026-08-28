import { useState } from "react";
import { ShaderLabComposition } from "@basementstudio/shader-lab";

import { Button } from "@/components/ui/button";
import { presets } from "./presets";

const hasWebGPU = typeof navigator !== "undefined" && "gpu" in navigator;

export default function App() {
  const [activeId, setActiveId] = useState(presets[0].id);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);

  const active = presets.find((preset) => preset.id === activeId) ?? presets[0];

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-4xl flex-col px-6 py-10 sm:px-10">
      <header className="flex items-baseline justify-between border-b pb-4">
        <h1 className="text-[11px] font-medium uppercase tracking-[0.2em]">
          Shader Lab
        </h1>
        <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          Preset swapper
        </p>
      </header>

      <section className="py-10">
        {hasWebGPU ? (
          <ShaderLabComposition
            key={active.id}
            config={active.config}
            onRuntimeError={setRuntimeError}
          />
        ) : (
          <div className="flex aspect-[1512/949] w-full items-center justify-center border">
            <p className="max-w-sm px-6 text-center text-sm leading-relaxed text-muted-foreground">
              These compositions render with WebGPU, which this browser does not
              support. Open the page in a recent Chrome, Edge or Safari to see
              them move.
            </p>
          </div>
        )}
        {hasWebGPU && runtimeError ? (
          <p className="mt-3 text-xs text-muted-foreground">{runtimeError}</p>
        ) : null}
      </section>

      <section className="border-t pt-6">
        <nav aria-label="Presets" className="flex flex-wrap gap-2">
          {presets.map((preset) => (
            <Button
              key={preset.id}
              size="sm"
              variant={preset.id === activeId ? "default" : "ghost"}
              onClick={() => setActiveId(preset.id)}
            >
              {preset.name}
            </Button>
          ))}
        </nav>
        <div className="mt-6 grid gap-1 text-sm">
          <p className="leading-relaxed">{active.description}</p>
          <p className="text-xs text-muted-foreground">{active.provenance}</p>
        </div>
      </section>

      <footer className="mt-auto border-t pt-4">
        <p className="text-xs text-muted-foreground">
          Compositions rendered by{" "}
          <a
            className="underline underline-offset-2 hover:text-foreground"
            href="https://eng.basement.studio/tools/shader-lab"
            target="_blank"
            rel="noreferrer"
          >
            Shader Lab
          </a>{" "}
          — a basement.studio tool.
        </p>
      </footer>
    </main>
  );
}
