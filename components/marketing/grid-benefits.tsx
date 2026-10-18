"use client";

import { useEffect, useRef, useState } from "react";
import { EXAMPLE, EXAMPLE_TEAMS } from "@/components/marketing/tells-example-data";

type Bar = { label: string; value: number; display: string; hot?: boolean };

function Bars({ bars, max, note }: { bars: readonly Bar[]; max: number; note?: string }) {
  return (
    <div className="ts-chart">
      <div className="ts-chart-bars">
        {bars.map((bar) => (
          <div key={bar.label} className={`ts-chart-col${bar.hot ? " is-hot" : ""}`}>
            <span className="ts-chart-val">{bar.display}</span>
            <span className="ts-chart-track">
              <i style={{ height: `${Math.round((bar.value / max) * 100)}%` }} />
            </span>
            <span className="ts-chart-label">{bar.label}</span>
          </div>
        ))}
      </div>
      {note ? <p className="ts-chart-note">{note}</p> : null}
    </div>
  );
}

function RoleFlow() {
  return (
    <div className="ts-chart">
      <svg viewBox="0 0 320 210" className="ts-flow" role="img" aria-label="Handoffs between roles">
        <defs>
          <marker id="ts-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="12" markerHeight="12" markerUnits="userSpaceOnUse" orient="auto">
            <path d="M0 0L10 5L0 10z" fill="currentColor" />
          </marker>
        </defs>
        <g className="ts-flow-edge">
          <line x1="88" y1="52" x2="226" y2="52" strokeWidth="5" markerEnd="url(#ts-arrow)" />
          <text x="157" y="40">14</text>
        </g>
        <g className="ts-flow-edge is-weak">
          <line x1="240" y1="78" x2="178" y2="158" strokeWidth="1.5" markerEnd="url(#ts-arrow)" strokeDasharray="4 4" />
          <text x="226" y="128">3</text>
        </g>
        <g className="ts-flow-edge">
          <line x1="140" y1="160" x2="80" y2="80" strokeWidth="3.5" markerEnd="url(#ts-arrow)" />
          <text x="88" y="130">9</text>
        </g>
        <g className="ts-flow-node">
          <circle cx="60" cy="52" r="28" />
          <text x="60" y="57">Alpha</text>
        </g>
        <g className="ts-flow-node">
          <circle cx="260" cy="52" r="28" />
          <text x="260" y="57">Beta</text>
        </g>
        <g className="ts-flow-node">
          <circle cx="160" cy="178" r="28" />
          <text x="160" y="183">Gamma</text>
        </g>
      </svg>
      <p className="ts-chart-note">Handoffs per session · average across {EXAMPLE.teamCount} teams</p>
    </div>
  );
}

function OverTime() {
  const points = [
    { s: "S1", v: 61 },
    { s: "S2", v: 64 },
    { s: "S3", v: 58, note: "Reorg" },
    { s: "S5", v: 66 },
    { s: "S8", v: 72 },
    { s: "S10", v: 78 },
  ];
  const x = (i: number) => 24 + i * 54;
  const y = (v: number) => 170 - ((v - 50) / 30) * 140;
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i)} ${y(p.v)}`).join(" ");
  return (
    <div className="ts-chart">
      <svg viewBox="0 0 320 200" className="ts-line" role="img" aria-label="Team score over sessions">
        <path d={path} className="ts-line-path" pathLength={1} />
        {points.map((p, i) => (
          <g key={p.s} className={p.note ? "is-hot" : undefined}>
            <circle cx={x(i)} cy={y(p.v)} r="5" />
            <text x={x(i)} y={y(p.v) - 12} className="ts-line-val">
              {p.v}
            </text>
            <text x={x(i)} y="194" className="ts-line-label">
              {p.s}
            </text>
            {p.note ? (
              <text x={x(i)} y={y(p.v) + 24} className="ts-line-note">
                {p.note}
              </text>
            ) : null}
          </g>
        ))}
      </svg>
      <p className="ts-chart-note">Team score per session</p>
    </div>
  );
}

function Board() {
  return (
    <div className="ts-chart">
      <div className="ts-board-filter">
        <span className="is-on">Department</span>
        <span>Country</span>
      </div>
      <ol className="ts-board">
        {EXAMPLE_TEAMS.map((team, index) => (
          <li key={team.name} className={index === 0 ? "is-hot" : undefined}>
            <span>#{index + 1}</span>
            <strong>{team.name}</strong>
            <i style={{ width: `${team.score}%` }} aria-hidden />
            <b>{team.score}</b>
          </li>
        ))}
      </ol>
    </div>
  );
}

const SEES = [
  {
    id: "bottlenecks",
    pill: "Bottlenecks",
    title: "Where does the team get stuck?",
    text: "Gamma waits for input in every team. Fix the handoff, not the people.",
    visual: (
      <Bars
        max={48}
        note={`Average wait for input · across ${EXAMPLE.teamCount} teams`}
        bars={[
          { label: "Alpha", value: 12, display: "12 s" },
          { label: "Beta", value: 18, display: "18 s" },
          { label: "Gamma", value: 48, display: "48 s", hot: true },
          { label: "Team Ø", value: 27, display: "27 s" },
        ]}
      />
    ),
  },
  {
    id: "roles",
    pill: "Role dynamics",
    title: "Who passes work to whom?",
    text: "Beta rarely hands over. Information stays in one place.",
    visual: <RoleFlow />,
  },
  {
    id: "understanding",
    pill: "Understanding",
    title: "Which topic didn't land?",
    text: "Mission 4, your discount policy. Teams bought hints and still guessed. Re-explain it before it costs a deal.",
    visual: (
      <Bars
        max={100}
        note="Solved without a hint · per mission · all teams"
        bars={[
          { label: "M1", value: 92, display: "92%" },
          { label: "M2", value: 88, display: "88%" },
          { label: "M3", value: 85, display: "85%" },
          { label: "M4", value: 40, display: "40%", hot: true },
          { label: "M5", value: 80, display: "80%" },
          { label: "M6", value: 90, display: "90%" },
        ]}
      />
    ),
  },
  {
    id: "overtime",
    pill: "Over time",
    title: "One session is a snapshot. Ten are a pattern.",
    text: "See the dip after the reorg, and how fast the team recovered.",
    visual: <OverTime />,
  },
  {
    id: "benchmarks",
    pill: "Benchmarks",
    title: "How do you compare?",
    text: "Your teams solve faster than average, but need more hints on Mission 4.",
    visual: (
      <Bars
        max={80}
        note="Team score · same game"
        bars={[
          { label: "Your teams", value: 72, display: "72", hot: true },
          { label: "Tells average", value: 64, display: "64" },
        ]}
      />
    ),
  },
  {
    id: "boards",
    pill: "Leaderboards",
    title: "Let teams compete.",
    text: "By department or country. A little pressure shows how they really work.",
    visual: <Board />,
  },
] as const;

export function GridBenefits() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [inView, setInView] = useState(false);
  const [held, setHeld] = useState(false);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      threshold: 0.35,
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!inView || held || index === SEES.length - 1) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setTimeout(() => setIndex((current) => current + 1), 5200);
    return () => window.clearTimeout(id);
  }, [inView, held, index]);

  const current = SEES[index]!;

  return (
    <div ref={rootRef} className="grid-show">
      <div className="grid-show-pills" role="tablist" aria-label="What you see">
        {SEES.map((item, i) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={i === index}
            className={i === index ? "is-on" : undefined}
            onClick={() => {
              setHeld(true);
              setIndex(i);
            }}
          >
            {item.pill}
          </button>
        ))}
      </div>

      <div className="grid-show-stage ts-show-stage">
        <div className={`ts-show-visual is-${current.id}`} key={current.id}>
          {current.visual}
          <p className="ts-example">Example data</p>
        </div>
        <div className="grid-show-copy">
          <h3 className="grid-product-header">{current.title}</h3>
          <p className="grid-product-copy">{current.text}</p>
        </div>
      </div>
    </div>
  );
}
