/**
 * Lightweight game feedback sounds via Web Audio (no asset files).
 * Safe to call from click/submit handlers — resumes AudioContext on gesture.
 */

export type PlaySfxKind = "wrong" | "correct" | "success" | "ping" | "arrive";

let sharedCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!sharedCtx) sharedCtx = new AC();
  return sharedCtx;
}

function tone(
  ctx: AudioContext,
  {
    frequency,
    start,
    duration,
    type = "sine",
    gain = 0.12,
    slideTo,
  }: {
    frequency: number;
    start: number;
    duration: number;
    type?: OscillatorType;
    gain?: number;
    slideTo?: number;
  },
) {
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, start);
  if (slideTo !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), start + duration);
  }
  amp.gain.setValueAtTime(0.0001, start);
  amp.gain.exponentialRampToValueAtTime(gain, start + 0.02);
  amp.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(amp);
  amp.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Fire-and-forget SFX. No-ops when AudioContext unavailable. */
export function playPlaySfx(kind: PlaySfxKind): void {
  if (prefersReducedMotion()) return;

  try {
    const ctx = getCtx();
    if (!ctx) return;
    void ctx.resume();
    const t0 = ctx.currentTime;

    if (kind === "wrong") {
      tone(ctx, { frequency: 280, start: t0, duration: 0.12, type: "square", gain: 0.07 });
      tone(ctx, {
        frequency: 220,
        start: t0 + 0.1,
        duration: 0.22,
        type: "square",
        gain: 0.06,
        slideTo: 110,
      });
      return;
    }

    if (kind === "ping") {
      // Soft outdoor reminder while walking — short high blip
      tone(ctx, { frequency: 880, start: t0, duration: 0.08, type: "sine", gain: 0.09 });
      tone(ctx, { frequency: 1320, start: t0 + 0.07, duration: 0.12, type: "triangle", gain: 0.07 });
      return;
    }

    if (kind === "arrive") {
      // Louder confirmation when radius / walk goal is reached
      tone(ctx, { frequency: 523.25, start: t0, duration: 0.1, type: "sine", gain: 0.12 });
      tone(ctx, { frequency: 784, start: t0 + 0.09, duration: 0.14, type: "triangle", gain: 0.11 });
      tone(ctx, { frequency: 1046.5, start: t0 + 0.2, duration: 0.28, type: "sine", gain: 0.1 });
      return;
    }

    if (kind === "correct") {
      tone(ctx, { frequency: 523.25, start: t0, duration: 0.12, type: "sine", gain: 0.1 });
      tone(ctx, { frequency: 659.25, start: t0 + 0.1, duration: 0.14, type: "sine", gain: 0.1 });
      tone(ctx, { frequency: 783.99, start: t0 + 0.2, duration: 0.22, type: "triangle", gain: 0.09 });
      return;
    }

    // success — short fanfare for the post-solve note screen
    tone(ctx, { frequency: 392, start: t0, duration: 0.14, type: "triangle", gain: 0.1 });
    tone(ctx, { frequency: 523.25, start: t0 + 0.12, duration: 0.14, type: "triangle", gain: 0.1 });
    tone(ctx, { frequency: 659.25, start: t0 + 0.24, duration: 0.16, type: "sine", gain: 0.11 });
    tone(ctx, { frequency: 783.99, start: t0 + 0.38, duration: 0.28, type: "sine", gain: 0.1 });
    tone(ctx, {
      frequency: 1046.5,
      start: t0 + 0.5,
      duration: 0.35,
      type: "triangle",
      gain: 0.08,
    });
  } catch {
    // Autoplay / unsupported — ignore
  }
}
