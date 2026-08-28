import { describe, expect, test } from "bun:test";
import { readdirSync } from "node:fs";
import path from "node:path";

import type { BenchmarkRun } from "../src/lib/types";

const fixturesDir = path.join(import.meta.dirname, "..", "fixtures");
const files = readdirSync(fixturesDir).filter((f) => f.endsWith(".json"));

describe("fixtures", () => {
  test("at least one fixture ships with the app", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const file of files) {
    describe(file, async () => {
      const run: BenchmarkRun = await Bun.file(
        path.join(fixturesDir, file),
      ).json();

      test("has required run fields", () => {
        expect(run.benchmarkId).toBeString();
        expect(Date.parse(run.generatedAt)).not.toBeNaN();
        expect(run.prompts.length).toBeGreaterThan(0);
        expect(run.models.length).toBeGreaterThan(0);
        expect(run.samples.length).toBeGreaterThan(0);
      });

      test("samples reference known prompts and models", () => {
        const promptIds = new Set(run.prompts.map((p) => p.id));
        const modelIds = new Set(run.models.map((m) => m.id));
        for (const sample of run.samples) {
          expect(promptIds.has(sample.promptId)).toBeTrue();
          expect(modelIds.has(sample.modelId)).toBeTrue();
        }
      });

      test("finished samples carry non-empty prose and timing", () => {
        for (const sample of run.samples) {
          expect(["finished", "error", "cancelled"]).toContain(sample.status);
          if (sample.status === "finished") {
            expect(sample.output.trim().length).toBeGreaterThan(0);
            expect(sample.durationMs).toBeGreaterThan(0);
          }
          expect(sample.harness.sdk).toBeString();
          expect(Array.isArray(sample.harness.tools)).toBeTrue();
        }
      });

      test("every prompt has at least one sample", () => {
        for (const prompt of run.prompts) {
          expect(
            run.samples.some((s) => s.promptId === prompt.id),
          ).toBeTrue();
        }
      });
    });
  }
});
