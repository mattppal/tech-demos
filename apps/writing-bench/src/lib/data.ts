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
