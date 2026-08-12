import { TextLoader } from "generative-loaders";

import { usePrefersReducedMotion } from "@/hooks/use-media-query";
import { useStreamedText } from "@/hooks/use-streamed-text";

interface SampleProseProps {
  output: string;
  replayToken: number;
}

/**
 * Renders a cached model output as reading prose. When motion is allowed the
 * text replays through generative-loaders' cascade reveal; under
 * prefers-reduced-motion it renders as static paragraphs.
 */
export function SampleProse({ output, replayToken }: SampleProseProps) {
  const reducedMotion = usePrefersReducedMotion();
  const { streamed } = useStreamedText(output, {
    enabled: !reducedMotion,
    replayToken,
  });

  if (reducedMotion) {
    return (
      <div className="wb-prose">
        {output.split(/\n{2,}/).map((para, i) => (
          <p key={i} className="whitespace-pre-line">
            {para}
          </p>
        ))}
      </div>
    );
  }

  // Paragraphs (blank-line separated) and lines within them are split here
  // because TextLoader's cascade variant collapses raw newlines.
  return (
    <div className="wb-prose" aria-label={output}>
      {streamed.split(/\n{2,}/).map((para, i) => (
        <span key={i} className="wb-para">
          {para.split("\n").map((line, j) => (
            <span key={j} className="wb-line">
              <TextLoader
                text={line.trimEnd()}
                variant="cascade"
                color="#363737"
              />
            </span>
          ))}
        </span>
      ))}
    </div>
  );
}
