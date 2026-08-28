import { Link } from "react-router";

import { formatDate, runs, runTitle, teaserFor } from "@/lib/data";
import type { BenchmarkRun } from "@/lib/types";

export function IndexPage() {
  return (
    <div className="mx-auto w-full max-w-[46rem] px-6 pt-16 pb-24 sm:px-8">
      <h1 className="font-serif text-[2.375rem] leading-[1.15] font-semibold tracking-tight">
        How do Cursor models write?
      </h1>
      <p className="mt-4 max-w-[62ch] font-serif text-[1.0625rem] leading-[1.65] text-ink/80">
        One prompt, one turn, no tools — the same brief handed to each model,
        and the prose laid side by side. Outputs are cached from the harness,
        so what you read here is exactly what came back.
      </p>

      <div className="mt-16 space-y-16">
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
      <div className="wb-double-rule pb-4">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="font-serif text-[1.625rem] leading-tight font-semibold">
            {runTitle(run)}
          </h2>
          <p className="font-serif text-[0.9375rem] italic text-ink-muted">
            {formatDate(run.generatedAt)}
          </p>
        </div>
        <p className="mt-2 font-sans text-[0.6875rem] tracking-[0.02em] text-ink-muted">
          {run.models.map((m) => m.displayName).join("  ·  ")}
        </p>
      </div>

      <ul>
        {run.prompts.map((prompt, i) => {
          const teaser = teaserFor(run, prompt.id, i);
          return (
            <li key={prompt.id} className="border-b border-rule">
              <Link
                to={`/compare/${run.benchmarkId}/${prompt.id}`}
                className="group block py-6 transition-colors duration-200 hover:bg-white"
              >
                <span className="block font-serif text-[1.25rem] leading-snug font-medium transition-colors duration-200 group-hover:text-accent">
                  {prompt.title}
                </span>
                {teaser && (
                  <span className="mt-2 block max-w-[62ch] font-serif text-[0.9375rem] leading-[1.6] text-ink-muted">
                    <span className="italic">&ldquo;{teaser.text}&rdquo;</span>
                    <span className="whitespace-nowrap font-sans text-[0.6875rem] text-ink-faint">
                      {"  "}— {teaser.modelName}
                    </span>
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
