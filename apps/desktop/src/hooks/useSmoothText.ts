import { useEffect, useRef, useState } from "react";
import { MAX_SMOOTH_TEXT_CODE_UNITS } from "../lib/render-content-limits";

/**
 * Progressively reveals `source` text at the user's selected reading rate.
 *
 * Historical messages are immediate. A live reply keeps its reveal buffer
 * after completion; tools, persistence and stop semantics remain independent.
 *
 * There is no backlog acceleration or end-of-stream flush. Unmount cancels
 * the animation frame; reopening history displays the complete saved result.
 */
export function useSmoothText(
  source: string,
  streaming: boolean,
  enabled: boolean,
): string {
  const activeRevealRef = useRef(false);
  if (streaming) activeRevealRef.current = true;
  const shouldSmooth =
    enabled &&
    (streaming || activeRevealRef.current) &&
    source.length <= MAX_SMOOTH_TEXT_CODE_UNITS;
  const [revealed, setRevealed] = useState(streaming && enabled ? 0 : source.length);
  const revealedRef = useRef(streaming && enabled ? 0 : source.length);
  const rafRef = useRef<number | null>(null);
  const lastFrameRef = useRef(0);
  const fractionalAdvanceRef = useRef(0);

  // Historical messages and disabled animation always show full text.
  useEffect(() => {
    if (!shouldSmooth) {
      revealedRef.current = source.length;
      lastFrameRef.current = 0;
      fractionalAdvanceRef.current = 0;
      setRevealed(source.length);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    }
  }, [shouldSmooth, source.length]);

  // Core release loop
  useEffect(() => {
    if (!shouldSmooth) return;

    const tick = (now: number) => {
      const backlog = source.length - revealedRef.current;
      if (backlog <= 0) {
        // The source dependency restarts this effect when more text arrives.
        rafRef.current = null;
        lastFrameRef.current = 0;
        fractionalAdvanceRef.current = 0;
        return;
      }

      const elapsed = now - lastFrameRef.current;
      // Keep React and Markdown commits at or below 60 Hz on high-refresh screens.
      if (elapsed < 1000 / 60) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      lastFrameRef.current = now;

      // Read the setting on each frame so a speed change applies immediately.
      const configured = localStorage.getItem("anke.readingSpeed");
      const speed = configured !== null && [0, 20, 40, 80].includes(Number(configured))
        ? Number(configured) : 40;

      const dt = Math.min(elapsed, 100) / 1000; // cap dt to avoid big jumps
      // Carry fractional characters so skipped frames do not slow the reveal.
      const exactAdvance = speed === 0 ? backlog : fractionalAdvanceRef.current + speed * dt;
      const advance = Math.floor(exactAdvance);
      fractionalAdvanceRef.current = exactAdvance - advance;
      if (advance === 0) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      const next = Math.min(revealedRef.current + advance, source.length);

      revealedRef.current = next;
      setRevealed(next);

      rafRef.current = requestAnimationFrame(tick);
    };

    if (lastFrameRef.current === 0) {
      lastFrameRef.current = performance.now();
    }
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [shouldSmooth, source]);

  // Release the animation frame on unmount.
  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, []);

  if (!shouldSmooth) return source;
  // Avoid slicing in the middle of a UTF-16 surrogate pair.
  let end = revealed;
  if (end < source.length && end > 0) {
    const code = source.charCodeAt(end - 1);
    // High surrogate without its low surrogate: include both.
    if (code >= 0xd800 && code <= 0xdbff) end = Math.min(end + 1, source.length);
  }
  return source.slice(0, end);
}
