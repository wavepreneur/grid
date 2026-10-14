"use client";

import { useEffect, useState } from "react";

const STEPS = [
  {
    n: "01",
    title: "Drop in your content",
    text: "Onboarding, product training, values, compliance, strategy. Paste it in and confirm. Tells builds it into the game. No designer, no agency.",
  },
  {
    n: "02",
    title: "Share one link",
    text: "Teams join from any device in seconds. Roles lock automatically. You decide whether Navigator, Solver or Spotter gets the next task.",
  },
  {
    n: "03",
    title: "Read the tells",
    text: "The report is ready seconds after the last task. Strengths, gaps, open questions. Ready for Monday.",
  },
] as const;

const DROPS = ["Onboarding.pdf", "Values · Q1–Q4", "Strategy brief"] as const;
const ROLES = ["Navigator", "Solver", "Spotter"] as const;
const TELLS = [
  "Spotter waited 48s",
  "Task 4 missed · 3/5",
  "Mixed teams +31%",
] as const;

export function GridHowItWorks() {
  const [step, setStep] = useState(2);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const id = window.setInterval(() => {
      setStep((current) => (current + 1) % STEPS.length);
    }, 3400);
    return () => window.clearInterval(id);
  }, []);

  const sharing = true;
  const reading = true;

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
          <p className="grid-how-kicker">Your content</p>
          <div className="grid-how-code-row">
            {DROPS.map((item, index) => (
              <span key={item} className="grid-how-code" style={{ animationDelay: `${index * 0.12}s` }}>
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="grid-how-devices">
          {ROLES.map((role, index) => (
            <article
              key={role}
              className={`grid-how-device${sharing ? " is-live" : ""}${reading ? " is-solved" : ""}`}
              style={{ animationDelay: `${index * 0.15}s` }}
            >
              <div className="grid-how-device-top">
                <span className="grid-how-device-name">{role}</span>
                <span className={`grid-how-live${sharing ? " is-on" : ""}`}>
                  {reading ? "Read" : sharing ? "Live" : "Idle"}
                </span>
              </div>
              <p className="grid-how-device-meta">{sharing ? "One link · any device" : "Waiting for the link"}</p>
              <div className="grid-how-screen">
                <span className="grid-how-screen-label">
                  {reading ? TELLS[index] : sharing ? "Playing" : "Content in"}
                </span>
                <span className="grid-how-score">{reading ? "Tell" : sharing ? "Go" : "—"}</span>
              </div>
            </article>
          ))}
        </div>

        <div className="grid-how-data is-on">
          <p className="grid-how-kicker">The tells</p>
          <div className="grid-how-metrics">
            {TELLS.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </div>

        <p className="grid-how-ready is-on">Report ready · 8 seconds</p>
      </div>
    </div>
  );
}
