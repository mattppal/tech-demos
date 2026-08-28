import { ArrowLeft, RotateCcw } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMediaQuery } from "@/hooks/use-media-query";
import { formatDuration, getRun, runTitle, wordCount } from "@/lib/data";
import type { BenchmarkModel, BenchmarkPrompt, BenchmarkRun, BenchmarkSample } from "@/lib/types";

import { SampleProse } from "./sample-prose";

interface Column {
  model: BenchmarkModel;
  sample: BenchmarkSample;
}

export function ComparePage() {
  const { benchmarkId = "", promptId = "" } = useParams();
  const run = getRun(benchmarkId);
  const prompt = run?.prompts.find((p) => p.id === promptId);
  const [replayToken, setReplayToken] = useState(0);
  const isWide = useMediaQuery("(min-width: 1280px)");

  if (!run || !prompt) {
    return (
      <div className="mx-auto max-w-[46rem] px-6 py-24 text-center">
        <p className="font-serif text-xl">That page isn't in the archive.</p>
        <Link to="/" className="mt-4 inline-block font-sans text-sm text-accent hover:underline">
          Back to all runs
        </Link>
      </div>
    );
  }

  const columns: Column[] = run.models.flatMap((model) => {
    const sample = run.samples.find(
      (s) => s.promptId === prompt.id && s.modelId === model.id,
    );
    return sample ? [{ model, sample }] : [];
  });

  const onReplay = () => setReplayToken((t) => t + 1);

  return isWide ? (
    <SplitView
      run={run}
      prompt={prompt}
      columns={columns}
      replayToken={replayToken}
      onReplay={onReplay}
    />
  ) : (
    <TabbedView
      run={run}
      prompt={prompt}
      columns={columns}
      replayToken={replayToken}
      onReplay={onReplay}
    />
  );
}

interface ViewProps {
  run: BenchmarkRun;
  prompt: BenchmarkPrompt;
  columns: Column[];
  replayToken: number;
  onReplay: () => void;
}

/** ≥1280px: all model columns side by side in one page scroll. */
function SplitView({ run, prompt, columns, replayToken, onReplay }: ViewProps) {
  const gridStyle = {
    gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))`,
  };
  return (
    <div className="mx-auto w-full max-w-[96rem] px-10">
      <header className="wb-double-rule sticky top-0 z-10 -mx-10 bg-paper/95 px-10 pt-4 backdrop-blur-sm">
        <PromptHeader run={run} prompt={prompt} onReplay={onReplay} />
        <div className="mt-3 grid" style={gridStyle}>
          {columns.map(({ model, sample }, i) => (
            <div
              key={model.id}
              className={i > 0 ? "border-l border-rule pl-10 pr-10" : "pr-10"}
            >
              <div className="mx-auto w-full max-w-[66ch] font-serif text-[1.0625rem]">
                <ColumnLabel model={model} sample={sample} />
              </div>
            </div>
          ))}
        </div>
      </header>
      <div className="grid" style={gridStyle}>
        {columns.map(({ model, sample }, i) => (
          <article
            key={model.id}
            className={`py-10 ${i > 0 ? "border-l border-rule pl-10 pr-10" : "pr-10"}`}
          >
            <SampleProse output={sample.output} replayToken={replayToken} />
          </article>
        ))}
      </div>
      <footer className="py-6" />
    </div>
  );
}

/** <1280px: segmented tabs — one tab per model, plus Split. */
function TabbedView({ run, prompt, columns, replayToken, onReplay }: ViewProps) {
  return (
    <Tabs defaultValue={columns[0]?.model.id} className="mx-auto w-full max-w-[46rem] px-6 sm:px-8">
      <header className="wb-double-rule sticky top-0 z-10 -mx-6 bg-paper/95 px-6 pt-4 pb-3.5 backdrop-blur-sm sm:-mx-8 sm:px-8">
        <PromptHeader run={run} prompt={prompt} onReplay={onReplay} />
        <TabsList className="mt-3">
          {columns.map(({ model }) => (
            <TabsTrigger key={model.id} value={model.id}>
              {model.displayName}
            </TabsTrigger>
          ))}
          {columns.length > 1 && <TabsTrigger value="split">Split</TabsTrigger>}
        </TabsList>
      </header>

      {columns.map(({ model, sample }) => (
        <TabsContent key={model.id} value={model.id}>
          <article className="py-8">
            <div className="mx-auto w-full max-w-[66ch] font-serif text-[1.0625rem]">
              <ColumnLabel model={model} sample={sample} bordered />
            </div>
            <div className="mt-5">
              <SampleProse output={sample.output} replayToken={replayToken} />
            </div>
          </article>
        </TabsContent>
      ))}

      {columns.length > 1 && (
        <TabsContent value="split">
          <div className="grid grid-cols-2 py-8">
            {columns.map(({ model, sample }, i) => (
              <article
                key={model.id}
                className={i % 2 === 1 ? "border-l border-rule pl-5" : "pr-5"}
              >
                <ColumnLabel model={model} sample={sample} bordered />
                <div className="mt-5">
                  <SampleProse output={sample.output} replayToken={replayToken} compact />
                </div>
              </article>
            ))}
          </div>
        </TabsContent>
      )}
      <footer className="py-6" />
    </Tabs>
  );
}

function PromptHeader({
  run,
  prompt,
  onReplay,
}: {
  run: BenchmarkRun;
  prompt: BenchmarkPrompt;
  onReplay: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div>
      <Link
        to="/"
        className="inline-flex items-center gap-1 font-sans text-[0.6875rem] font-medium text-ink-muted transition-colors duration-150 hover:text-ink"
      >
        <ArrowLeft className="size-3" aria-hidden />
        {runTitle(run)}
      </Link>
      <div className="mt-0.5 flex items-baseline justify-between gap-6">
        <h1 className="font-serif text-[1.4375rem] leading-tight font-semibold tracking-tight">
          {prompt.title}
        </h1>
        <Button onClick={onReplay} className="shrink-0 self-center">
          <RotateCcw aria-hidden />
          Replay
        </Button>
      </div>
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        title={expanded ? "Collapse prompt" : "Show full prompt"}
        className={`mt-1 max-w-[72ch] cursor-pointer text-left font-serif text-[0.875rem] leading-relaxed text-ink-muted italic ${
          expanded ? "block" : "line-clamp-1"
        }`}
      >
        {prompt.text}
      </button>
    </div>
  );
}

/** Editorial byline: serif italic model name, quiet sans meta. */
function ColumnLabel({
  model,
  sample,
  bordered = false,
}: {
  model: BenchmarkModel;
  sample: BenchmarkSample;
  bordered?: boolean;
}) {
  return (
    <div
      className={`flex items-baseline justify-between gap-3 py-2.5 ${
        bordered ? "border-b border-rule" : ""
      }`}
    >
      <span className="font-serif text-[0.9375rem] font-medium italic">
        {model.displayName}
      </span>
      <span className="font-sans text-[0.625rem] tabular-nums tracking-[0.02em] text-ink-faint">
        {sample.status === "finished"
          ? `${wordCount(sample.output)} words · ${formatDuration(sample.durationMs)}`
          : sample.status}
      </span>
    </div>
  );
}
