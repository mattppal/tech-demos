/**
 * Regenerates benchmark fixtures by running each prompt against each model
 * once, prose-only, via @cursor/sdk.
 *
 *   CURSOR_API_KEY=... bun run generate
 *
 * Writes fixtures/<benchmarkId>.json in the shape the UI reads. The app never
 * calls this at runtime — fixtures are cached, hand-checked, and committed.
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";

import { Agent } from "@cursor/sdk";

import type { BenchmarkRun, BenchmarkSample } from "../src/lib/types";

const BENCHMARK_ID = "writing-v1";
const SDK_NAME = "@cursor/sdk";

// Fixed model ids. Adjust to taste; `Cursor.models.list()` shows what your
// key can reach.
const MODELS = [
  { id: "composer-2.5", displayName: "Composer 2.5" },
  { id: "gpt-5.5", displayName: "GPT-5.5" },
  { id: "claude-fable-5", displayName: "Fable 5" },
] as const;

const PROMPTS = [
  {
    id: "p1",
    title: "The Last Lighthouse Keeper",
    text: "Write the opening scene, about 150 words, of a story about the last human lighthouse keeper on a coast where every other light has been automated. Third person, close perspective. No dialogue.",
  },
  {
    id: "p2",
    title: "Garbage Collection, for Poets",
    text: "Explain garbage collection in programming to a poet who has never written code. About 150 words. Every technical term you use must be defined in the same breath. No bullet points.",
  },
  {
    id: "p3",
    title: "The Honest Changelog",
    text: "Write a changelog entry announcing that your app's beloved dark mode has been temporarily removed because it was corrupting saved files. Be honest and human. No corporate spin. About 120 words.",
  },
] as const;

// One-turn, prose-only. Tools are disabled at the harness level too
// (`tools: []`), so the model can only answer with text.
const INSTRUCTIONS =
  "You are being benchmarked on prose quality. Respond with the writing itself only — no preamble, no commentary, no markdown headers, no lists unless the prompt asks for them. Plain paragraphs separated by blank lines.";

async function main() {
  const apiKey = process.env.CURSOR_API_KEY;
  if (!apiKey) {
    console.error("CURSOR_API_KEY is not set. Aborting without writing fixtures.");
    process.exit(1);
  }

  const samples: BenchmarkSample[] = [];

  for (const model of MODELS) {
    for (const prompt of PROMPTS) {
      process.stdout.write(`${model.id} × ${prompt.id} … `);
      const startedAt = Date.now();
      try {
        const result = await Agent.prompt(
          `${INSTRUCTIONS}\n\n---\n\n${prompt.text}`,
          { apiKey, model: { id: model.id }, tools: [] },
        );
        samples.push({
          promptId: prompt.id,
          modelId: model.id,
          output: result.result?.trim() ?? "",
          status: result.status === "finished" ? "finished" : "error",
          durationMs: result.durationMs ?? Date.now() - startedAt,
          harness: { sdk: SDK_NAME, tools: [] },
        });
        console.log(`done (${result.status})`);
      } catch (error) {
        samples.push({
          promptId: prompt.id,
          modelId: model.id,
          output: error instanceof Error ? error.message : String(error),
          status: "error",
          durationMs: Date.now() - startedAt,
          harness: { sdk: SDK_NAME, tools: [] },
        });
        console.log("error");
      }
    }
  }

  const run: BenchmarkRun = {
    benchmarkId: BENCHMARK_ID,
    title: "Short Prose I",
    description:
      "Three one-turn prompts probing scene-setting, technical lyricism, and plain-spoken product writing. Tools disabled; single response per model.",
    generatedAt: new Date().toISOString(),
    prompts: [...PROMPTS],
    models: [...MODELS],
    samples,
  };

  const outDir = path.join(import.meta.dirname, "..", "fixtures");
  await mkdir(outDir, { recursive: true });
  const outFile = path.join(outDir, `${BENCHMARK_ID}.json`);
  await Bun.write(outFile, `${JSON.stringify(run, null, 2)}\n`);
  console.log(`\nWrote ${samples.length} samples to ${outFile}`);
}

main();
