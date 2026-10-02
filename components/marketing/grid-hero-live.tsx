"use client";

import { useEffect, useState } from "react";

export function GridHeroLive() {
  const [seconds, setSeconds] = useState(60);
  const [teams, setTeams] = useState(2);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setSeconds(12);
      setTeams(1000);
      return;
    }
    const tick = window.setInterval(() => {
      setSeconds((current) => (current <= 1 ? 60 : current - 1));
    }, 1000);
    const swell = window.setInterval(() => {
      setTeams((current) => (current >= 1000 ? 2 : current === 2 ? 48 : current === 48 ? 240 : 1000));
    }, 2200);
    return () => {
      window.clearInterval(tick);
      window.clearInterval(swell);
    };
  }, []);

  const progress = ((60 - seconds) / 60) * 100;

  return (
    <div className="grid-hero-live" aria-hidden>
      <div className="grid-hero-live-ring">
        <svg viewBox="0 0 88 88" width="88" height="88">
          <circle cx="44" cy="44" r="38" className="grid-hero-live-track" />
          <circle
            cx="44"
            cy="44"
            r="38"
            className="grid-hero-live-progress"
            style={{ strokeDashoffset: 239 - (239 * progress) / 100 }}
          />
        </svg>
        <div className="grid-hero-live-count">
          <strong>{String(seconds).padStart(2, "0")}</strong>
          <span>sec</span>
        </div>
      </div>
      <div className="grid-hero-live-copy">
        <p className="grid-hero-live-kicker">Battle starts</p>
        <p className="grid-hero-live-teams">
          <span className="grid-hero-live-dot" />
          {teams.toLocaleString("en-US")} teams joining
        </p>
      </div>
      <div className="grid-hero-live-pills">
        <span>Phone</span>
        <span>Laptop</span>
        <span>Tablet</span>
      </div>
    </div>
  );
}
