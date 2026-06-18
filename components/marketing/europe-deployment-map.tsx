"use client";

import { useMemo, useState } from "react";

type DeploymentNode = {
  name: string;
  x: number;
  y: number;
  tier: "hub" | "node";
};

const NODES: DeploymentNode[] = [
  { name: "London", x: 46, y: 36, tier: "hub" },
  { name: "Berlin", x: 50, y: 36, tier: "hub" },
  { name: "Paris", x: 47, y: 59, tier: "hub" },
  { name: "Amsterdam", x: 48, y: 37, tier: "node" },
  { name: "Hamburg", x: 50, y: 31, tier: "node" },
  { name: "Munich", x: 52, y: 61, tier: "node" },
  { name: "Vienna", x: 57, y: 61, tier: "node" },
  { name: "Prague", x: 57, y: 50, tier: "node" },
  { name: "Warsaw", x: 60, y: 42, tier: "node" },
  { name: "Copenhagen", x: 52, y: 32, tier: "node" },
  { name: "Stockholm", x: 58, y: 24, tier: "node" },
  { name: "Barcelona", x: 47, y: 64, tier: "node" },
  { name: "Rome", x: 52, y: 69, tier: "node" },
  { name: "Madrid", x: 44, y: 67, tier: "node" },
];

type EuropeDeploymentMapProps = {
  svgMarkup: string;
};

export function EuropeDeploymentMap({ svgMarkup }: EuropeDeploymentMapProps) {
  const [active, setActive] = useState<DeploymentNode | null>(null);

  const sanitizedSvg = useMemo(
    () => svgMarkup.replace(/aria-hidden="true"/, 'role="img" aria-label="Europe deployment cluster map"'),
    [svgMarkup],
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
      <div
        style={{
          padding: 24,
          borderRadius: 16,
          background: "rgba(0,229,255,0.03)",
          border: "1px solid rgba(0,229,255,0.12)",
          width: "100%",
          position: "relative",
        }}
      >
        <div
          style={{ position: "relative", width: "100%", maxWidth: 700, margin: "0 auto" }}
          onMouseLeave={() => setActive(null)}
        >
          <div
            style={{ opacity: 0.85, pointerEvents: "none" }}
            dangerouslySetInnerHTML={{ __html: sanitizedSvg }}
          />
          <svg
            viewBox="0 0 100 75"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              pointerEvents: "none",
            }}
            aria-hidden
          >
            {NODES.map((node) => (
              <g key={node.name} transform={`translate(${node.x} ${node.y})`}>
                <circle
                  r={node.tier === "hub" ? 2.8 : 2.2}
                  fill="#00e5ff"
                  fillOpacity={active?.name === node.name ? 0.15 : 0.08}
                  style={{
                    animation: "grid-node-pulse 2.8s ease-in-out infinite",
                    animationDelay: `${(node.x + node.y) * 0.03}s`,
                  }}
                />
              </g>
            ))}
          </svg>
          <div
            style={{
              position: "absolute",
              inset: 0,
            }}
          >
            {NODES.map((node) => (
              <button
                key={node.name}
                type="button"
                aria-label={`${node.name} deployment node`}
                onMouseEnter={() => setActive(node)}
                onFocus={() => setActive(node)}
                onBlur={() => setActive(null)}
                style={{
                  position: "absolute",
                  left: `${node.x}%`,
                  top: `${(node.y / 75) * 100}%`,
                  transform: "translate(-50%, -50%)",
                  width: node.tier === "hub" ? 28 : 22,
                  height: node.tier === "hub" ? 28 : 22,
                  borderRadius: "50%",
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  padding: 0,
                }}
              />
            ))}
          </div>
          {active ? (
            <div
              style={{
                position: "absolute",
                left: `${active.x}%`,
                top: `${(active.y / 75) * 100}%`,
                transform: "translate(-50%, calc(-100% - 14px))",
                background: "rgba(4,4,8,0.95)",
                border: "1px solid rgba(0,229,255,0.35)",
                borderRadius: 8,
                padding: "8px 12px",
                pointerEvents: "none",
                whiteSpace: "nowrap",
                boxShadow: "0 8px 32px rgba(0,0,0,0.45)",
              }}
            >
              <p style={{ fontSize: 12, fontWeight: 700, color: "#f0f4ff" }}>{active.name}</p>
              <p style={{ fontSize: 10, color: "rgba(240,244,255,0.45)", marginTop: 2 }}>
                Active deployment node
              </p>
            </div>
          ) : null}
        </div>
      </div>
      <p
        style={{
          fontSize: 12,
          color: "rgba(240,244,255,0.2)",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        Live deployment nodes — Europe cluster
      </p>
    </div>
  );
}
