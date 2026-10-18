"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

type Options = {
  /** Duration of each step in ms. Step count = durations.length + 1 (last step is the end state). */
  durations: readonly number[];
  /** Restart after the end state, waiting this long first. Omit to play once. */
  loopPauseMs?: number;
};

const REDUCE_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReduced(onChange: () => void) {
  const media = window.matchMedia(REDUCE_QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

/**
 * Plays a stepped animation once when the element scrolls into view.
 * Reduced motion jumps straight to the end state.
 */
export function useStoryTimeline<T extends HTMLElement>({ durations, loopPauseMs }: Options) {
  const ref = useRef<T>(null);
  const last = durations.length;
  const [step, setStep] = useState(0);
  const [started, setStarted] = useState(false);
  const reduced = useSyncExternalStore(
    subscribeReduced,
    () => window.matchMedia(REDUCE_QUERY).matches,
    () => false,
  );

  useEffect(() => {
    if (reduced) return;
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStarted(true);
          observer.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [reduced]);

  useEffect(() => {
    if (!started || reduced) return;
    if (step < last) {
      const id = window.setTimeout(() => setStep((s) => s + 1), durations[step]);
      return () => window.clearTimeout(id);
    }
    if (loopPauseMs === undefined) return;
    const id = window.setTimeout(() => setStep(0), loopPauseMs);
    return () => window.clearTimeout(id);
  }, [started, reduced, step, last, durations, loopPauseMs]);

  return { ref, step: reduced ? last : step, reduced, replay: () => setStep(0) };
}
