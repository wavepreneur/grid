/**
 * Soft device vibration for outdoor progress (GPS / walk ring).
 * Not supported on all browsers (notably many iOS Safari builds) — safe no-op.
 */

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function canVibrate(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.vibrate === "function";
}

/** Single soft pulse. */
export function hapticPulse(ms = 18): void {
  if (prefersReducedMotion() || !canVibrate()) return;
  try {
    navigator.vibrate(ms);
  } catch {
    // ignore
  }
}

/**
 * Progress-scaled pulse while walking (0–1).
 * Stronger / longer as progress rises — amplitude isn't available on most devices.
 */
export function hapticWalkProgress(progress: number): void {
  if (prefersReducedMotion() || !canVibrate()) return;
  const p = Math.max(0, Math.min(1, progress));
  const ms = Math.round(12 + p * 48);
  try {
    navigator.vibrate(ms);
  } catch {
    // ignore
  }
}

/** Arrival / unlock confirmation pattern. */
export function hapticArrive(): void {
  if (prefersReducedMotion() || !canVibrate()) return;
  try {
    navigator.vibrate([40, 40, 80]);
  } catch {
    // ignore
  }
}
