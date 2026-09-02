import type { CSSProperties } from "react";

type Maturity = "live" | "beta" | "legacy" | "vision";

const labels: Record<Maturity, string> = {
  live: "Live",
  beta: "Pilot",
  legacy: "Legacy",
  vision: "Roadmap",
};

const tones: Record<Maturity, CSSProperties> = {
  live: {
    borderColor: "rgba(52,211,153,0.35)",
    background: "rgba(52,211,153,0.1)",
    color: "#6ee7b7",
  },
  beta: {
    borderColor: "rgba(251,191,36,0.35)",
    background: "rgba(251,191,36,0.1)",
    color: "#fcd34d",
  },
  legacy: {
    borderColor: "rgba(148,163,184,0.35)",
    background: "rgba(148,163,184,0.08)",
    color: "rgba(203,213,225,0.75)",
  },
  vision: {
    borderColor: "rgba(240,244,255,0.12)",
    background: "rgba(240,244,255,0.04)",
    color: "rgba(240,244,255,0.45)",
  },
};

export function MaturityBadge({ status }: { status: Maturity }) {
  return (
    <span className="grid-maturity-badge" style={tones[status]}>
      {labels[status]}
    </span>
  );
}

export type { Maturity };
