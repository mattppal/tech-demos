import { ArrowRight } from "lucide-react";
import { Link } from "react-router";

import { formatDate, runs, runTitle } from "@/lib/data";
import type { BenchmarkRun } from "@/lib/types";

export function IndexPage() {
  return (
    <div className="mx-auto w-full max-w-[46rem] px-6 pt-14 pb-24 sm:px-8">
      <p className="font-sans text-[0.6875rem] font-medium tracking-[0.18em] uppercase text-ink-muted">
        Benchmark runs
      </p>
      <h1 className="mt-3 font-serif text-[2.375rem] leading-[1.15] font-semibold tracking-tight">
        How do Cursor models write?
      </h1>
      <p className="mt-4 max-w-[62ch] font-serif text-[1.0625rem] leading-[1.65] text-ink/80">
        One prompt, one turn, no tools — the same brief handed to each model,
        and the prose laid side by side. Outputs are cached from the harness,
        so what you read here is exactly what came back.
      </p>

      <div className="mt-14 space-y-14">
        {runs.map((run) => (
          <RunSection key={run.benchmarkId} run={run} />
        ))}
      </div>
    </div>
  );
}

function RunSection({ run }: { run: BenchmarkRun }) {
  return (
    <section>
      <div className="border-b border-rule pb-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <h2 className="font-serif text-[1.625rem] leading-tight font-semibold">
            {runTitle(run)}
          </h2>
          <p className="font-sans text-xs text-ink-muted">
            {formatDate(run.generatedAt)}
          </p>
        </div>
        {run.description && (
          <p className="mt-2 max-w-[62ch] font-serif text-[0.9375rem] leading-relaxed text-ink-muted">
            {run.description}
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {run.models.map((model) => (
            <span
              key={model.id}
              className="rounded-full border border-rule px-2.5 py-0.5 font-sans text-[0.6875rem] font-medium text-ink-muted"
            >
              {model.displayName}
            </span>
          ))}
        </div>
      </div>

      <ul>
        {run.prompts.map((prompt, i) => (
          <li key={prompt.id}>
            <Link
              to={`/compare/${run.benchmarkId}/${prompt.id}`}
              className="group flex items-baseline gap-4 border-b border-rule py-4 transition-colors hover:bg-white"
            >
              <span className="w-7 shrink-0 font-sans text-xs tabular-nums text-ink-faint">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-serif text-[1.125rem] font-medium group-hover:text-accent">
                  {prompt.title}
                </span>
                <span className="mt-0.5 block truncate font-serif text-sm text-ink-muted">
                  {prompt.text}
                </span>
              </span>
              <ArrowRight
                className="size-4 shrink-0 self-center text-ink-faint transition-transform group-hover:translate-x-0.5 group-hover:text-accent"
                aria-hidden
              />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
