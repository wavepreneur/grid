/**
 * Soft device vibration for outdoor progress + solve feedback.
 * Not supported on all browsers (notably many iOS Safari builds) — safe no-op.
 *
 * Escalation strategy: we can't change "amplitude" on most phones, so we
 * lengthen pulses and add multi-buzz patterns as progress rises.
 */

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function canVibrate(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.vibrate === "function";
}

function vibrate(pattern: number | number[]): void {
  if (prefersReducedMotion() || !canVibrate()) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    // ignore
  }
}

/** Single soft pulse. */
export function hapticPulse(ms = 18): void {
  vibrate(ms);
}

/** Correct answer — short double tap. */
export function hapticCorrect(): void {
  vibrate([18, 40, 28]);
}

/** Wrong answer — longer buzz. */
export function hapticWrong(): void {
  vibrate([55, 30, 55]);
}

/** Key / lock opens the real task. */
export function hapticUnlock(): void {
  vibrate([25, 35, 25, 35, 70]);
}

/** Mission complete / celebration. */
export function hapticComplete(): void {
  vibrate([30, 40, 30, 40, 30, 40, 100]);
}

/**
 * Progress-scaled pulse while walking (0–1).
 * Near the start: short tick. Near the goal: longer / multi-buzz pattern.
 */
export function hapticWalkProgress(progress: number): void {
  if (prefersReducedMotion() || !canVibrate()) return;
  const p = Math.max(0, Math.min(1, progress));
  try {
    if (p < 0.35) {
      navigator.vibrate(Math.round(14 + p * 20));
    } else if (p < 0.7) {
      const ms = Math.round(22 + p * 36);
      navigator.vibrate([ms, 30, Math.round(ms * 0.7)]);
    } else if (p < 0.92) {
      const ms = Math.round(30 + p * 50);
      navigator.vibrate([ms, 24, ms, 24, Math.round(ms * 0.8)]);
    } else {
      navigator.vibrate([45, 20, 55, 20, 70]);
    }
  } catch {
    // ignore
  }
}

/** Arrival / unlock confirmation pattern. */
export function hapticArrive(): void {
  vibrate([40, 40, 80, 40, 120]);
}
