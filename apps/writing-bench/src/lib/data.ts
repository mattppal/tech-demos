import type { BenchmarkRun } from "./types";

const modules = import.meta.glob<{ default: BenchmarkRun }>(
  "../../fixtures/*.json",
  { eager: true },
);

export const runs: BenchmarkRun[] = Object.values(modules)
  .map((m) => m.default)
  .sort((a, b) => b.generatedAt.localeCompare(a.generatedAt));

export function getRun(benchmarkId: string): BenchmarkRun | undefined {
  return runs.find((r) => r.benchmarkId === benchmarkId);
}

export function runTitle(run: BenchmarkRun): string {
  return run.title ?? run.benchmarkId;
}

export function formatDuration(ms: number): string {
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function wordCount(text: string): number {
  return text.trim().split(/\s+/).length;
}

/**
 * A short excerpt from one model's output for a prompt, used to tease the
 * spread on the index. Rotates through models by prompt position so the
 * table of contents quotes different voices.
 */
export function teaserFor(
  run: BenchmarkRun,
  promptId: string,
  promptIndex: number,
): { text: string; modelName: string } | undefined {
  const samples = run.samples.filter(
    (s) => s.promptId === promptId && s.status === "finished",
  );
  if (samples.length === 0) return undefined;
  const sample = samples[promptIndex % samples.length];
  const model = run.models.find((m) => m.id === sample.modelId);
  const flat = sample.output.replace(/\s+/g, " ").trim();
  const cut = flat.length <= 150 ? flat : `${flat.slice(0, 150).replace(/\s+\S*$/, "")}\u2026`;
  return { text: cut, modelName: model?.displayName ?? sample.modelId };
}
