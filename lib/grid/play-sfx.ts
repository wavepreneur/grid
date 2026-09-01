/**
 * Player feedback sounds — Kenney Interface Sounds (CC0) under /public/sfx.
 * Falls back to Web Audio tones if a file fails to load.
 * Safe to call from click/submit handlers (unlocks autoplay after gesture).
 */

import { hapticCorrect, hapticWrong, hapticUnlock, hapticComplete, hapticArrive, hapticBonus } from "@/lib/grid/haptics";

export type PlaySfxKind =
  | "wrong"
  | "correct"
  | "success"
  | "unlock"
  | "complete"
  | "ping"
  | "arrive"
  | "bonus";

const SFX_SRC: Record<PlaySfxKind, string> = {
  correct: "/sfx/correct.wav",
  wrong: "/sfx/wrong.wav",
  success: "/sfx/success.wav",
  unlock: "/sfx/unlock.wav",
  complete: "/sfx/complete.wav",
  ping: "/sfx/ping.wav",
  arrive: "/sfx/arrive.wav",
  bonus: "/sfx/bonus.wav",
};

const VOLUME: Partial<Record<PlaySfxKind, number>> = {
  ping: 0.45,
  arrive: 0.7,
  unlock: 0.85,
  complete: 0.9,
  bonus: 0.95,
};

let sharedCtx: AudioContext | null = null;
const cache = new Map<PlaySfxKind, HTMLAudioElement>();

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

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

function playSynthFallback(kind: PlaySfxKind): void {
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
      tone(ctx, { frequency: 880, start: t0, duration: 0.08, type: "sine", gain: 0.09 });
      return;
    }
    if (kind === "bonus") {
      tone(ctx, { frequency: 659.25, start: t0, duration: 0.1, type: "triangle", gain: 0.11 });
      tone(ctx, { frequency: 830.61, start: t0 + 0.08, duration: 0.11, type: "triangle", gain: 0.1 });
      tone(ctx, { frequency: 987.77, start: t0 + 0.17, duration: 0.13, type: "sine", gain: 0.1 });
      tone(ctx, { frequency: 1318.5, start: t0 + 0.28, duration: 0.28, type: "triangle", gain: 0.09 });
      tone(ctx, { frequency: 1975.5, start: t0 + 0.42, duration: 0.2, type: "sine", gain: 0.06 });
      return;
    }
    if (kind === "arrive" || kind === "unlock") {
      tone(ctx, { frequency: 523.25, start: t0, duration: 0.1, type: "sine", gain: 0.12 });
      tone(ctx, { frequency: 784, start: t0 + 0.09, duration: 0.14, type: "triangle", gain: 0.11 });
      tone(ctx, { frequency: 1046.5, start: t0 + 0.2, duration: 0.28, type: "sine", gain: 0.1 });
      return;
    }
    if (kind === "correct" || kind === "success") {
      tone(ctx, { frequency: 523.25, start: t0, duration: 0.12, type: "sine", gain: 0.1 });
      tone(ctx, { frequency: 659.25, start: t0 + 0.1, duration: 0.14, type: "sine", gain: 0.1 });
      tone(ctx, { frequency: 783.99, start: t0 + 0.2, duration: 0.22, type: "triangle", gain: 0.09 });
      return;
    }
    // complete
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
    // ignore
  }
}

let lastBonusPlayAt = 0;

function getAudio(kind: PlaySfxKind): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  let audio = cache.get(kind);
  if (audio) return audio;
  audio = new Audio(SFX_SRC[kind]);
  audio.preload = "auto";
  cache.set(kind, audio);
  return audio;
}

function playHapticFor(kind: PlaySfxKind): void {
  if (kind === "wrong") hapticWrong();
  else if (kind === "correct") hapticCorrect();
  else if (kind === "unlock") hapticUnlock();
  else if (kind === "complete" || kind === "success") hapticComplete();
  else if (kind === "arrive") hapticArrive();
  else if (kind === "bonus") hapticBonus();
}

/** Fire-and-forget SFX (+ matching haptic). Haptics skip when reduced-motion. */
export function playPlaySfx(kind: PlaySfxKind): void {
  const reduced = prefersReducedMotion();
  if (!reduced) playHapticFor(kind);
  // Bonus must still be audible — iOS Reduce Motion was muting the surprise entirely.
  if (reduced && kind !== "bonus") return;

  if (kind === "bonus") {
    const now = Date.now();
    if (now - lastBonusPlayAt < 1800) return;
    lastBonusPlayAt = now;
  }

  try {
    const audio = getAudio(kind);
    if (!audio) {
      playSynthFallback(kind);
      return;
    }
    audio.volume = VOLUME[kind] ?? 0.75;
    audio.currentTime = 0;
    const playResult = audio.play();
    if (playResult && typeof playResult.catch === "function") {
      playResult.catch(() => playSynthFallback(kind));
    }
  } catch {
    playSynthFallback(kind);
  }
}

/** Warm the AudioContext + preload files after first user gesture. */
export function unlockPlayAudio(): void {
  if (typeof window === "undefined") return;
  try {
    const ctx = getCtx();
    void ctx?.resume();
    (Object.keys(SFX_SRC) as PlaySfxKind[]).forEach((kind) => {
      getAudio(kind);
    });
  } catch {
    // ignore
  }
}
