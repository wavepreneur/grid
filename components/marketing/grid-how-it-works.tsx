"use client";

import { useEffect, useState } from "react";

const STEPS = [
  {
    n: "01",
    title: "Roles pull",
    text: "Teams land. Roles lock. They start working on each other — not on a host.",
  },
  {
    n: "02",
    title: "Play",
    text: "It feels like a game. Underneath, every role, attempt, and stall is kept.",
  },
  {
    n: "03",
    title: "Depth",
    text: "No coach can watch this many people at once. No coach can go this far into the data.",
  },
  {
    n: "04",
    title: "Ready",
    text: "Seconds after the last move, the record is there. Who worked. Where it broke. What Monday needs.",
  },
] as const;

const ROLES = [
  { id: "nav", label: "Lead", device: "Laptop", role: "Navigator", finding: "Carried the brief", mark: "Lead" },
  { id: "sol", label: "Field", device: "Phone", role: "Solver", finding: "Stalled · task 3", mark: "Hold" },
  { id: "spot", label: "HQ", device: "Tablet", role: "Spotter", finding: "Hint unused", mark: "Gap" },
] as const;

const INTEL = [
  "Ops stalled on task 3",
  "Navigator carried Team 12",
  "APAC finished first",
  "41% unused the hint",
] as const;

function screenFor(step: number, finding: string): { label: string; score: string } {
  if (step >= 3) return { label: finding, score: "Read" };
  if (step >= 2) return { label: "Watched", score: "12k" };
  if (step >= 1) return { label: "Pulling", score: "Live" };
  return { label: "Waiting", score: "—" };
}

export function GridHowItWorks() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setStep(3);
      return;
    }
    const id = window.setInterval(() => {
      setStep((current) => (current + 1) % STEPS.length);
    }, 3200);
    return () => window.clearInterval(id);
  }, []);

  const playing = step >= 1;
  const deep = step >= 2;
  const ready = step >= 3;

  return (
    <div className="grid-how">
      <ol className="grid-how-steps">
        {STEPS.map((item, index) => {
          const active = index === step;
          const done = index < step;
          return (
            <li
              key={item.n}
              className={`grid-how-step${active ? " is-active" : ""}${done ? " is-done" : ""}`}
            >
              <button type="button" onClick={() => setStep(index)} className="grid-how-step-btn">
                <span className="grid-how-step-n">{item.n}</span>
                <span className="grid-how-step-title">{item.title}</span>
                <span className="grid-how-step-text">{item.text}</span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="grid-how-stage" aria-live="polite">
        <div className="grid-how-codes is-on">
          <p className="grid-how-kicker">Roles in the room</p>
          <div className="grid-how-code-row">
            {ROLES.map((item, index) => (
              <span key={item.id} className="grid-how-code" style={{ animationDelay: `${index * 0.12}s` }}>
                {item.role}
              </span>
            ))}
          </div>
        </div>

        <div className="grid-how-devices">
          {ROLES.map((device, index) => {
            const screen = screenFor(step, device.finding);
            return (
              <article
                key={device.id}
                className={`grid-how-device${playing ? " is-live" : ""}${ready ? " is-solved" : ""}`}
                style={{ animationDelay: `${index * 0.15}s` }}
              >
                <div className="grid-how-device-top">
                  <span className="grid-how-device-name">{device.label}</span>
                  <span className={`grid-how-live${playing ? " is-on" : ""}`}>
                    {ready ? "Read" : playing ? "Live" : "Idle"}
                  </span>
                </div>
                <p className="grid-how-device-meta">
                  {device.device} · {device.role}
                </p>
                <div className="grid-how-screen">
                  <span className="grid-how-screen-label">{screen.label}</span>
                  <span className="grid-how-score">{screen.score}</span>
                </div>
              </article>
            );
          })}
        </div>

        <div className={`grid-how-data${deep ? " is-on" : ""}`}>
          <p className="grid-how-kicker">What no host can see</p>
          <div className="grid-how-metrics">
            {INTEL.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </div>

        <p className={`grid-how-ready${ready ? " is-on" : ""}`}>Record ready · 8 seconds</p>
      </div>
    </div>
  );
}
