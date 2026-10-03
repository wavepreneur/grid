"use client";

import { useEffect, useState } from "react";
import { Laptop, Smartphone, Tablet } from "lucide-react";

const PHASES = [
  { id: "lead", ms: 2400, line: "The team lead opens the link." },
  { id: "members", ms: 2600, line: "Her team is in. Same second." },
  { id: "roles", ms: 3400, line: "Roles lock. The names follow the company — or the game." },
  { id: "parallel", ms: 2800, line: "Every team. Same event. Worldwide." },
  { id: "start", ms: 3000, line: "Up to 50,000 people. The battle starts." },
] as const;

const PEOPLE = [
  { name: "Maya", device: "laptop" as const, lead: true },
  { name: "Jan", device: "phone" as const, lead: false },
  { name: "Lea", device: "tablet" as const, lead: false },
  { name: "Ken", device: "phone" as const, lead: false },
];

const ROLE_PACKS = [
  { hint: "This game", roles: ["Navigator", "Solver", "Spotter", "Runner"] },
  { hint: "Your company", roles: ["Captain", "Analyst", "Field", "HQ"] },
  { hint: "Your teams", roles: ["Ops", "R&D", "Sales", "Lead"] },
] as const;

const CITIES = ["Berlin", "Tokyo", "New York", "São Paulo", "Lagos", "Sydney"] as const;

function DeviceIcon({ device }: { device: (typeof PEOPLE)[number]["device"] }) {
  const Icon = device === "laptop" ? Laptop : device === "tablet" ? Tablet : Smartphone;
  return <Icon size={13} strokeWidth={2.2} aria-hidden />;
}

function peopleCount(phase: number, packTick: number): number {
  if (phase <= 0) return 1;
  if (phase === 1) return 4;
  if (phase === 2) return 4;
  if (phase === 3) return 240 + packTick * 80;
  return 50_000;
}

export function GridHeroLive() {
  const [phase, setPhase] = useState(0);
  const [pack, setPack] = useState(0);
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches) {
      setReduce(true);
      setPhase(PHASES.length - 1);
      setPack(1);
      return;
    }

    let cancelled = false;
    let phaseIndex = 0;
    let timer = 0;
    const phaseRef = { current: 0 };

    const advance = () => {
      if (cancelled) return;
      timer = window.setTimeout(() => {
        phaseIndex = (phaseIndex + 1) % PHASES.length;
        phaseRef.current = phaseIndex;
        setPhase(phaseIndex);
        if (phaseIndex === 0) setPack(0);
        advance();
      }, PHASES[phaseIndex].ms);
    };

    advance();
    const packs = window.setInterval(() => {
      if (phaseRef.current >= 2) {
        setPack((current) => (current + 1) % ROLE_PACKS.length);
      }
    }, 1400);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      window.clearInterval(packs);
    };
  }, []);

  const current = PHASES[phase];
  const rolesOn = reduce || phase >= 2;
  const membersOn = reduce || phase >= 1;
  const worldOn = reduce || phase >= 3;
  const liveOn = reduce || phase >= 4;
  const rolePack = ROLE_PACKS[rolesOn ? pack : 0];
  const count = reduce ? 50_000 : peopleCount(phase, pack);

  return (
    <div className={`grid-hero-live${liveOn ? " is-live" : ""}`}>
      <div className="grid-hero-live-top">
        <p className="grid-hero-live-kicker">
          <span className="grid-hero-live-dot" />
          Live event
        </p>
        <p className="grid-hero-live-line" aria-live="polite">
          {current.line}
        </p>
      </div>

      <ul className="grid-hero-live-people">
        {PEOPLE.map((person, index) => {
          const visible = person.lead || membersOn;
          return (
            <li
              key={person.name}
              className={`grid-hero-live-person${visible ? " is-in" : " is-wait"}${person.lead ? " is-lead" : ""}`}
              style={{ transitionDelay: `${index * 90}ms` }}
            >
              <span className="grid-hero-live-avatar">{person.name.slice(0, 1)}</span>
              <span className="grid-hero-live-who">
                <strong>{person.name}</strong>
                <em>
                  <DeviceIcon device={person.device} />
                  {person.lead ? "Lead · laptop" : person.device}
                </em>
              </span>
              <span className={`grid-hero-live-role${rolesOn ? " is-on" : ""}`}>
                {rolesOn ? rolePack.roles[index] : "…"}
              </span>
            </li>
          );
        })}
      </ul>

      <p className={`grid-hero-live-roleshift${rolesOn ? " is-on" : ""}`}>
        {rolesOn ? (
          <>
            Roles right now: <strong>{rolePack.hint}</strong>
            <span> — they change with the company or the game.</span>
          </>
        ) : (
          "Roles wait for the team."
        )}
      </p>

      <ul className={`grid-hero-live-world${worldOn ? " is-on" : ""}`}>
        {CITIES.map((city, index) => (
          <li key={city} style={{ transitionDelay: `${index * 70}ms` }}>
            {city}
          </li>
        ))}
      </ul>

      <div className="grid-hero-live-foot">
        <p className="grid-hero-live-countline">
          <strong>{count.toLocaleString("en-US")}</strong>
          <span>{count === 1 ? "person in" : "people in"}</span>
        </p>
        <div className="grid-hero-live-pills">
          <span>
            <Smartphone size={12} strokeWidth={2.2} aria-hidden /> Phone
          </span>
          <span>
            <Laptop size={12} strokeWidth={2.2} aria-hidden /> Laptop
          </span>
          <span>
            <Tablet size={12} strokeWidth={2.2} aria-hidden /> Tablet
          </span>
        </div>
        <p className={`grid-hero-live-go${liveOn ? " is-on" : ""}`}>Battle live</p>
      </div>
    </div>
  );
}
