import type { CSSProperties } from "react";

type Maturity = "live" | "beta" | "vision";

const labels: Record<Maturity, string> = {
  live: "Live",
  beta: "Pilot",
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
