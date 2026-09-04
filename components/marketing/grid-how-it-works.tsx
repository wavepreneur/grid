"use client";

import { useEffect, useState } from "react";

const STEPS = [
  {
    n: "01",
    title: "Start",
    text: "A link, a name, a role. The team is in within seconds — no accounts, no one in a back room.",
  },
  {
    n: "02",
    title: "Play",
    text: "It feels like a game. GPS, stations, quizzes, live sync. People do not notice they are being measured.",
  },
  {
    n: "03",
    title: "Connect",
    text: "In the background GRID ties place, role, attempt, and time into one group record.",
  },
  {
    n: "04",
    title: "Read",
    text: "After the event you see the team — not a leaderboard of individuals.",
  },
] as const;

const DEVICES = [
  { id: "lead", label: "Lead", device: "Laptop", role: "Navigator" },
  { id: "mobile", label: "Mobile", device: "Phone", role: "Solver" },
  { id: "tablet", label: "Tablet", device: "Tablet", role: "Briefing" },
] as const;

const INTEL = [
  "Task 3 misread",
  "Waypoint 2 confirmed",
  "Hint on bonus",
  "Ops · DE",
] as const;

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
    }, 2800);
    return () => window.clearInterval(id);
  }, []);

  const started = step >= 0;
  const playing = step >= 1;
  const connected = step >= 2;
  const read = step >= 3;

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
        <div className={`grid-how-codes${started ? " is-on" : ""}`}>
          <p className="grid-how-kicker">Team in</p>
          <div className="grid-how-code-row">
            {["K7M2QP", "N4H9WL", "B2TX8R"].map((code, index) => (
              <span
                key={code}
                className="grid-how-code"
                style={{ animationDelay: `${index * 0.12}s` }}
              >
                {code}
              </span>
            ))}
          </div>
        </div>

        <div className="grid-how-devices">
          {DEVICES.map((device, index) => (
            <article
              key={device.id}
              className={`grid-how-device${playing ? " is-live" : ""}${read ? " is-solved" : ""}`}
              style={{ animationDelay: `${index * 0.15}s` }}
            >
              <div className="grid-how-device-top">
                <span className="grid-how-device-name">{device.label}</span>
                <span className={`grid-how-live${playing ? " is-on" : ""}`}>
                  {playing ? "Live" : "Idle"}
                </span>
              </div>
              <p className="grid-how-device-meta">
                {device.device} · {device.role}
              </p>
              <div className="grid-how-screen">
                <span className="grid-how-screen-label">
                  {read ? "Group closed" : connected ? "Signal tied" : playing ? "In play" : "Waiting"}
                </span>
                <span className="grid-how-score">{read ? "Team" : playing ? "—" : "—"}</span>
              </div>
            </article>
          ))}
        </div>

        <div className={`grid-how-data${connected ? " is-on" : ""}`}>
          <p className="grid-how-kicker">Team intelligence</p>
          <div className="grid-how-metrics">
            {INTEL.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
