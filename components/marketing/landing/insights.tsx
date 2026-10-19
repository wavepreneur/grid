"use client";

import { useState, type ReactNode } from "react";
import { Lock } from "lucide-react";
import { copy, EXAMPLE } from "@/components/marketing/landing/copy";
import { Signal } from "@/components/marketing/landing/signal";

type TabId = (typeof copy.insights.tabs)[number]["id"];

type Row = { label: string; value: number; display: string; signal?: boolean };

function HBars({ rows, max, marker }: { rows: readonly Row[]; max: number; marker?: { value: number; label: string } }) {
  return (
    <div className="tl-hbars">
      {marker ? (
        <span className="tl-hbars-marker" style={{ left: `calc(var(--tl-label-w) + (100% - var(--tl-label-w) - var(--tl-value-w)) * ${marker.value / max})` }}>
          <em>{marker.label}</em>
        </span>
      ) : null}
      {rows.map((row, index) => (
        <div key={row.label} className={`tl-hbar${row.signal ? " is-signal" : ""}`}>
          <span className="tl-hbar-label">{row.label}</span>
          <span className="tl-hbar-track">
            <i style={{ width: `${(row.value / max) * 100}%`, animationDelay: `${index * 30}ms` }} />
          </span>
          <span className="tl-hbar-value">
            {row.signal ? <Signal size={12} /> : null}
            {row.display}
          </span>
        </div>
      ))}
    </div>
  );
}

function RoleFlow() {
  return (
    <svg viewBox="0 0 360 260" className="tl-flow">
      <defs>
        <marker id="tl-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="12" markerHeight="12" markerUnits="userSpaceOnUse" orient="auto">
          <path d="M0 0L10 5L0 10z" fill="context-stroke" />
        </marker>
      </defs>
      <line x1="114" y1="50" x2="240" y2="50" className="tl-flow-edge" strokeWidth="5" markerEnd="url(#tl-arrow)" />
      <text x="177" y="36" className="tl-flow-n">14</text>
      <line x1="280" y1="84" x2="280" y2="170" className="tl-flow-edge is-signal" strokeWidth="1.5" strokeDasharray="4 4" markerEnd="url(#tl-arrow)" />
      <text x="300" y="134" className="tl-flow-n is-signal">3</text>
      <line x1="246" y1="210" x2="120" y2="210" className="tl-flow-edge" strokeWidth="4" markerEnd="url(#tl-arrow)" />
      <text x="183" y="236" className="tl-flow-n">11</text>
      <line x1="80" y1="176" x2="80" y2="90" className="tl-flow-edge" strokeWidth="3.5" markerEnd="url(#tl-arrow)" />
      <text x="60" y="134" className="tl-flow-n">9</text>
      {[
        { x: 80, y: 50, label: "Alpha" },
        { x: 280, y: 50, label: "Beta" },
        { x: 280, y: 210, label: "Gamma" },
        { x: 80, y: 210, label: "Delta" },
      ].map((node) => (
        <g key={node.label} className="tl-flow-node">
          <circle cx={node.x} cy={node.y} r="30" />
          <text x={node.x} y={node.y + 5}>
            {node.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

const TREND = [61, 64, 58, 66, 72, 78] as const;
const REORG = 2;

function Trend() {
  const x = (i: number) => 36 + i * 60;
  const y = (v: number) => 190 - ((v - 50) / 35) * 160;
  const path = TREND.map((v, i) => `${i === 0 ? "M" : "L"}${x(i)} ${y(v)}`).join(" ");
  return (
    <svg viewBox="0 0 372 230" className="tl-trend">
      {[60, 70, 80].map((v) => (
        <g key={v}>
          <line x1="24" x2="356" y1={y(v)} y2={y(v)} className="tl-trend-grid" />
          <text x="0" y={y(v) + 4} className="tl-trend-axis">
            {v}
          </text>
        </g>
      ))}
      <path d={path} className="tl-trend-line" pathLength={1} />
      {TREND.map((v, i) => (
        <g key={i} className={i === REORG ? "is-signal" : undefined}>
          <circle cx={x(i)} cy={y(v)} r={i === REORG ? 5 : 3.5} className="tl-trend-dot" />
          <text x={x(i)} y={y(v) - 12} className="tl-trend-value">
            {v}
          </text>
          <text x={x(i)} y="222" className="tl-trend-axis is-center">
            S{i + 1}
          </text>
        </g>
      ))}
      <text x={x(REORG)} y={y(TREND[REORG]) + 24} className="tl-trend-note">
        Reorg
      </text>
    </svg>
  );
}

function Board() {
  const teams = copy.preview.teams;
  return (
    <ol className="tl-board">
      {teams.map((team, index) => (
        <li key={team.name}>
          <span className="tl-board-place">{index + 1}</span>
          <span className="tl-board-name">{team.name}</span>
          <span className="tl-hbar-track">
            <i style={{ width: `${team.score}%`, animationDelay: `${index * 30}ms` }} />
          </span>
          <span className="tl-board-score">{team.score}</span>
        </li>
      ))}
    </ol>
  );
}

const VISUALS: Record<TabId, { caption: string; node: ReactNode }> = {
  understanding: {
    caption: `Teams that got each task right · ${EXAMPLE.teams} teams`,
    node: (
      <HBars
        max={100}
        rows={copy.preview.tasks.map((task) => ({
          label: `${task.id} ${task.title}`,
          value: task.value,
          display: `${task.value}%`,
          signal: task.id === "T4",
        }))}
      />
    ),
  },
  bottlenecks: {
    caption: `Average wait for input per role · across ${EXAMPLE.teams} teams`,
    node: (
      <HBars
        max={60}
        marker={{ value: 27, label: "Team average 27 s" }}
        rows={[
          { label: "Alpha", value: 12, display: "12 s" },
          { label: "Beta", value: 18, display: "18 s" },
          { label: "Gamma", value: 48, display: "48 s", signal: true },
          { label: "Delta", value: 30, display: "30 s" },
        ]}
      />
    ),
  },
  roles: {
    caption: `Handoffs per session · four roles per team · average across ${EXAMPLE.teams} teams`,
    node: <RoleFlow />,
  },
  overtime: {
    caption: "Team Orca · team score over six sessions",
    node: <Trend />,
  },
  benchmarks: {
    caption: copy.insights.tabs.find((tab) => tab.id === "benchmarks")!.answer,
    node: (
      <div className="tl-locked">
        <Lock size={18} strokeWidth={1.5} aria-hidden />
        <p>{copy.insights.tabs.find((tab) => tab.id === "benchmarks")!.answer}</p>
      </div>
    ),
  },
  leaderboards: {
    caption: `Final ranking · ${EXAMPLE.session}`,
    node: <Board />,
  },
};

export function Insights() {
  const tabs = copy.insights.tabs;
  const [active, setActive] = useState<TabId>(tabs[0].id);
  const current = tabs.find((tab) => tab.id === active) ?? tabs[0];
  const visual = VISUALS[current.id];

  function onKey(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const index = tabs.findIndex((tab) => tab.id === active);
    const next = tabs[(index + (event.key === "ArrowDown" ? 1 : tabs.length - 1)) % tabs.length]!;
    setActive(next.id);
    document.getElementById(`tl-tab-${next.id}`)?.focus();
  }

  return (
    <div className="tl-insights">
      <div className="tl-tabs" role="tablist" aria-orientation="vertical" aria-label={copy.insights.title} onKeyDown={onKey}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            id={`tl-tab-${tab.id}`}
            type="button"
            role="tab"
            aria-selected={tab.id === active}
            aria-controls="tl-insight-panel"
            tabIndex={tab.id === active ? 0 : -1}
            className={`tl-tab${tab.id === active ? " is-active" : ""}`}
            onClick={() => setActive(tab.id)}
          >
            <span className="tl-tab-label">{tab.label}</span>
            <span className="tl-tab-question">{tab.question}</span>
          </button>
        ))}
      </div>

      <div id="tl-insight-panel" role="tabpanel" aria-labelledby={`tl-tab-${current.id}`} className="tl-insight">
        {"locked" in current ? (
          <>
            <div className="tl-insight-head">
              <h3 className="tl-h3">{current.label}</h3>
              <p className="tl-body">{current.question}</p>
            </div>
            <div className="tl-insight-chart" key={current.id}>
              {visual.node}
            </div>
          </>
        ) : (
          <>
            <div className="tl-insight-head">
              <h3 className="tl-h3">{current.question}</h3>
              <p className="tl-body">{current.answer}</p>
            </div>
            <figure className="tl-insight-chart" key={current.id}>
              <div role="img" aria-label={`${visual.caption}. ${current.answer}`}>
                {visual.node}
              </div>
              <figcaption>
                <span>{visual.caption}</span>
                <span>{copy.insights.note}</span>
              </figcaption>
            </figure>
          </>
        )}
      </div>
    </div>
  );
}
