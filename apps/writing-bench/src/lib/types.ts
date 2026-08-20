export interface BenchmarkPrompt {
  id: string;
  title: string;
  text: string;
}

export interface BenchmarkModel {
  id: string;
  displayName: string;
}

export type SampleStatus = "finished" | "error" | "cancelled";

export interface BenchmarkSample {
  promptId: string;
  modelId: string;
  output: string;
  status: SampleStatus;
  durationMs: number;
  harness: {
    sdk: string;
    tools: string[];
  };
}

export interface BenchmarkRun {
  benchmarkId: string;
  title?: string;
  description?: string;
  generatedAt: string;
  prompts: BenchmarkPrompt[];
  models: BenchmarkModel[];
  samples: BenchmarkSample[];
}
