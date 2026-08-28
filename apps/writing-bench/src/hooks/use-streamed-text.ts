import { useEffect, useState } from "react";

/**
 * Replays a cached string as if it were streaming in, a few words per tick.
 * `replayToken` restarts the stream; `enabled: false` returns the full text
 * immediately (used for prefers-reduced-motion).
 */
export function useStreamedText(
  text: string,
  { enabled, replayToken }: { enabled: boolean; replayToken: number },
): { streamed: string; done: boolean } {
  const [streamed, setStreamed] = useState(enabled ? "" : text);

  useEffect(() => {
    if (!enabled) {
      setStreamed(text);
      return;
    }
    // Split into word-sized chunks, whitespace attached, so the prefix stays
    // stable and TextLoader only animates the appended suffix.
    const chunks = text.match(/\S+\s*/g) ?? [];
    let index = 0;
    setStreamed("");
    const timer = setInterval(() => {
      // 3 words per tick at 35ms ≈ 85 words/second: brisk but readable.
      index = Math.min(index + 3, chunks.length);
      setStreamed(chunks.slice(0, index).join(""));
      if (index >= chunks.length) clearInterval(timer);
    }, 35);
    return () => clearInterval(timer);
  }, [text, enabled, replayToken]);

  return { streamed, done: streamed.length >= text.length };
}
