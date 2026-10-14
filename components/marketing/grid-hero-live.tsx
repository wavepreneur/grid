"use client";

import { useEffect, useState } from "react";

const PHASES = [
  { id: "join", ms: 2200 },
  { id: "roles", ms: 2000 },
  { id: "tell-wait", ms: 2600 },
  { id: "tell-fail", ms: 2600 },
  { id: "tell-mix", ms: 3200 },
] as const;

const PLAYERS = [
  { name: "Maya", role: "Navigator", beat: "decides" },
  { name: "Jan", role: "Solver", beat: "types" },
  { name: "Lea", role: "Spotter", beat: "waits" },
] as const;

const TELLS = [
  {
    id: "wait",
    phase: 2,
    text: "Spotter role waited 48s on average for input",
  },
  {
    id: "fail",
    phase: 3,
    text: "Task 4 failed in 3 of 5 teams: topic not understood",
  },
  {
    id: "mix",
    phase: 4,
    text: "Mixed-department teams solved 31% faster",
  },
] as const;

function formatClock(seconds: number) {
  const safe = Math.max(0, seconds);
  const mm = String(Math.floor(safe / 60)).padStart(2, "0");
  const ss = String(safe % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

export function GridHeroLive() {
  const [phase, setPhase] = useState(2);
  const [seconds, setSeconds] = useState(48);
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches) {
      setReduce(true);
      setPhase(PHASES.length - 1);
      setSeconds(48);
      return;
    }

    let cancelled = false;
    let phaseIndex = 2;
    let timer = 0;

    const advance = () => {
      if (cancelled) return;
      timer = window.setTimeout(() => {
        phaseIndex = (phaseIndex + 1) % PHASES.length;
        setPhase(phaseIndex);
        if (phaseIndex === 0) setSeconds(12);
        if (phaseIndex === 2) setSeconds(48);
        advance();
      }, PHASES[phaseIndex].ms);
    };

    advance();
    const clock = window.setInterval(() => {
      setSeconds((current) => current + 1);
    }, 1000);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      window.clearInterval(clock);
    };
  }, []);

  const rolesOn = reduce || phase >= 1;
  const liveOn = reduce || phase >= 4;
  const shownTells = reduce ? TELLS.length : Math.max(2, TELLS.filter((item) => phase >= item.phase).length);
  const clock = reduce ? 48 : Math.min(seconds, 59);

  return (
    <div className={`grid-hero-live${liveOn ? " is-live" : ""}`}>
      <div className="grid-hero-split">
        <section className="grid-hero-pane" aria-label="Live play">
          <div className="grid-hero-pane-top">
            <p className="grid-hero-live-kicker">
              <span className="grid-hero-live-dot" />
              Live play
            </p>
            <p className="grid-hero-timer" aria-live="polite">
              {formatClock(clock)}
            </p>
          </div>

          <ul className="grid-hero-play-list">
            {PLAYERS.map((person, index) => {
              const inPlay = reduce || phase >= 0;
              const waiting = person.beat === "waits" && (reduce || phase >= 2);
              return (
                <li
                  key={person.name}
                  className={`grid-hero-play-row${inPlay ? " is-in" : " is-wait"}${waiting ? " is-hot" : ""}`}
                  style={{ transitionDelay: `${index * 90}ms` }}
                >
                  <span className="grid-hero-live-avatar">{person.name.slice(0, 1)}</span>
                  <span className="grid-hero-live-who">
                    <strong>{person.name}</strong>
                    <em>{waiting ? "waiting" : person.beat}</em>
                  </span>
                  <span className={`grid-hero-live-role${rolesOn ? " is-on" : ""}`}>
                    {rolesOn ? person.role : "…"}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="grid-hero-pane is-tells" aria-label="Live tells">
          <div className="grid-hero-pane-top">
            <p className="grid-hero-live-kicker">
              <span className="grid-hero-live-dot" />
              Live tells
            </p>
            <p className={`grid-hero-live-go${shownTells > 0 ? " is-on" : ""}`}>
              {liveOn ? "Reading" : shownTells > 0 ? "Live" : "Watching"}
            </p>
          </div>

          <ul className="grid-tell-list" aria-live="polite">
            {TELLS.map((item, index) => {
              const visible = reduce || index < shownTells;
              if (!visible) return null;
              return (
                <li
                  key={item.id}
                  className="grid-tell-row is-in"
                  style={{ animationDelay: `${index * 80}ms` }}
                >
                  <span className="grid-tell-bolt" aria-hidden>
                    ⚡
                  </span>
                  <span>{item.text}</span>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}
