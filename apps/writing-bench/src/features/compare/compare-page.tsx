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
    <div className="mx-auto w-full max-w-[90rem] px-8">
      <header className="sticky top-0 z-10 -mx-8 border-b border-rule bg-paper px-8 pt-5">
        <PromptHeader run={run} prompt={prompt} onReplay={onReplay} />
        <div className="mt-4 grid" style={gridStyle}>
          {columns.map(({ model, sample }, i) => (
            <ColumnLabel
              key={model.id}
              model={model}
              sample={sample}
              className={i > 0 ? "border-l border-rule" : ""}
            />
          ))}
        </div>
      </header>
      <div className="grid" style={gridStyle}>
        {columns.map(({ model, sample }, i) => (
          <article
            key={model.id}
            className={`py-8 pr-8 ${i > 0 ? "border-l border-rule pl-8" : "pr-8"}`}
          >
            <SampleProse output={sample.output} replayToken={replayToken} />
          </article>
        ))}
      </div>
      <footer className="border-t border-rule py-10" />
    </div>
  );
}

/** <1280px: segmented tabs — one tab per model, plus Split. */
function TabbedView({ run, prompt, columns, replayToken, onReplay }: ViewProps) {
  return (
    <Tabs defaultValue={columns[0]?.model.id} className="mx-auto w-full max-w-[46rem] px-6 sm:px-8">
      <header className="sticky top-0 z-10 -mx-6 border-b border-rule bg-paper px-6 pt-5 pb-4 sm:-mx-8 sm:px-8">
        <PromptHeader run={run} prompt={prompt} onReplay={onReplay} />
        <TabsList className="mt-4">
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
            <ColumnLabel model={model} sample={sample} bare />
            <div className="mt-4">
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
                <ColumnLabel model={model} sample={sample} bare />
                <div className="mt-4 text-[0.9375rem]">
                  <SampleProse output={sample.output} replayToken={replayToken} />
                </div>
              </article>
            ))}
          </div>
        </TabsContent>
      )}
      <footer className="border-t border-rule py-10" />
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
      <div className="flex items-center justify-between gap-4">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 font-sans text-xs font-medium text-ink-muted transition-colors hover:text-ink"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          {runTitle(run)}
        </Link>
        <Button onClick={onReplay}>
          <RotateCcw aria-hidden />
          Replay
        </Button>
      </div>
      <h1 className="mt-2 font-serif text-[1.5rem] leading-tight font-semibold tracking-tight">
        {prompt.title}
      </h1>
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        title={expanded ? "Collapse prompt" : "Show full prompt"}
        className={`mt-1 block max-w-[68ch] cursor-pointer text-left font-serif text-[0.9375rem] leading-relaxed text-ink-muted ${
          expanded ? "" : "line-clamp-2"
        }`}
      >
        {prompt.text}
      </button>
    </div>
  );
}

function ColumnLabel({
  model,
  sample,
  className = "",
  bare = false,
}: {
  model: BenchmarkModel;
  sample: BenchmarkSample;
  className?: string;
  bare?: boolean;
}) {
  return (
    <div
      className={`flex items-baseline justify-between gap-3 font-sans ${
        bare ? "border-b border-rule pb-3" : "py-3 [&:not(:first-child)]:pl-8 [&:not(:last-child)]:pr-8"
      } ${className}`}
    >
      <span className="text-[0.6875rem] font-semibold tracking-[0.14em] uppercase">
        {model.displayName}
      </span>
      <span className="text-[0.6875rem] tabular-nums text-ink-muted">
        {sample.status === "finished"
          ? `${wordCount(sample.output)} words · ${formatDuration(sample.durationMs)}`
          : sample.status}
      </span>
    </div>
  );
}
