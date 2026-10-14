"use client";

import Link from "next/link";
import { useState } from "react";

const PLANS = [
  {
    id: "start",
    name: "Start",
    monthly: 149,
    teams: "3 teams at once",
    credit: "€49 per team",
    perTeam: 49,
    peoplePerTeam: 4,
    maxTeams: 3,
    blurb: "Try a live event first. Then the room is yours.",
    featured: false,
    cta: "Run a session",
    href: "#access",
    points: [
      "Test a live event before you subscribe",
      "Up to 4 people per team",
      "Your company page",
      "Live view and results",
    ],
  },
  {
    id: "team",
    name: "Team",
    monthly: 399,
    teams: "12 teams at once",
    credit: "€39 per team",
    perTeam: 39,
    peoplePerTeam: 8,
    maxTeams: 12,
    blurb: "The company rhythm.",
    featured: true,
    cta: "Get Team",
    href: "#access",
    points: [
      "Up to 8 people per team",
      "Everything in Start",
      "Scores by country and department",
      "Live support if a session stalls",
    ],
  },
  {
    id: "company",
    name: "Company",
    monthly: 990,
    teams: "50 teams at once",
    credit: "€29 per team",
    perTeam: 29,
    peoplePerTeam: 10,
    maxTeams: 50,
    blurb: "Many rooms. One place.",
    featured: false,
    cta: "Get Company",
    href: "#access",
    points: [
      "Up to 10 people per team",
      "Everything in Team",
      "Volume credits",
      "One page for every country",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    monthly: 2900,
    teams: "Up to 50,000 people",
    credit: "from €19 per team",
    perTeam: 19,
    peoplePerTeam: 12,
    maxTeams: 4167,
    blurb: "The whole organisation.",
    featured: false,
    cta: "Talk to us",
    href: "#access",
    points: [
      "Up to 12 people per team",
      "Your onboarding",
      "Security review and NDA",
      "A named contact",
    ],
  },
] as const;

type PlanId = (typeof PLANS)[number]["id"];

function planById(id: PlanId) {
  return PLANS.find((plan) => plan.id === id) ?? PLANS[1];
}

function teamCount(people: number, peoplePerTeam: number) {
  return Math.max(1, Math.ceil(Math.max(2, people) / peoplePerTeam));
}

function euro(value: number) {
  return `€${value.toLocaleString("en-US")}`;
}

export function GridPricing() {
  const [yearly, setYearly] = useState(true);
  const [people, setPeople] = useState(40);
  const [planId, setPlanId] = useState<PlanId>("team");
  const [teams, setTeams] = useState(5);
  const calc = planById(planId);
  const planPrice = yearly ? Math.round(calc.monthly * 0.8) : calc.monthly;
  const sessionPrice = teams * calc.perTeam;
  const over = teams > calc.maxTeams;
  const better = over ? PLANS.find((plan) => plan.maxTeams >= teams) : null;

  return (
    <div>
      <div className="grid-bill-toggle" role="group" aria-label="Billing">
        <span className={!yearly ? "is-on" : undefined}>Monthly</span>
        <button
          type="button"
          className={`grid-bill-switch${yearly ? " is-yearly" : ""}`}
          aria-pressed={yearly}
          onClick={() => setYearly((current) => !current)}
        >
          <span className="grid-bill-knob" />
        </button>
        <span className={yearly ? "is-on" : undefined}>
          Yearly <em>−20%</em>
        </span>
      </div>

      <div className="grid-price-grid">
        {PLANS.map((plan) => {
          const offer = Math.round(plan.monthly * 0.8);
          const price = yearly ? offer : plan.monthly;
          return (
            <article
              key={plan.id}
              className={`grid-card grid-plan${plan.featured ? " is-featured" : ""}`}
            >
              {plan.featured ? (
                <p className="grid-plan-pick">Most teams pick this</p>
              ) : null}
              {plan.id === "start" ? <p className="grid-plan-eyebrow">Try first</p> : <p className="grid-plan-eyebrow is-empty" />}
              <h3 className="grid-product-header grid-plan-name">{plan.name}</h3>
              <div className="grid-plan-price-block">
                <p className="grid-plan-now">
                  {plan.id === "enterprise" ? <span className="grid-plan-from">from</span> : null}
                  {euro(price)}
                  <span className="grid-plan-cadence">/ month</span>
                </p>
                <p className="grid-plan-term">
                  {yearly ? "12-month term" : "Cancel monthly"}
                </p>
                <p className="grid-plan-teams">{plan.teams}</p>
              </div>
              <p className="grid-product-copy grid-plan-blurb">{plan.blurb}</p>
              <p style={{ marginTop: 12, fontSize: 14, fontWeight: 700, color: "var(--grid-cyan)" }}>
                {plan.credit}
              </p>
              <ul className="grid-plan-list">
                {plan.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
              <Link
                href={plan.href}
                className={plan.featured || plan.id === "start" ? "grid-cta" : "grid-cta-outline"}
                style={{ marginTop: "auto", paddingTop: 8, justifyContent: "center" }}
              >
                {plan.cta}
              </Link>
            </article>
          );
        })}
      </div>
      <aside className="grid-price-example">
        <p className="grid-price-example-kicker">Your session</p>
        <p className="grid-price-example-title">What would it cost?</p>
        <p className="grid-price-example-meta">Change the numbers. The total updates.</p>
        <div className="grid-price-calc">
          <label>
            People
            <input
              className="grid-input"
              type="number"
              min={2}
              max={50000}
              inputMode="numeric"
              value={people || ""}
              onChange={(event) => {
                const raw = event.target.value;
                if (raw === "") {
                  setPeople(0);
                  return;
                }
                const next = Math.min(50000, Math.max(0, Math.round(Number(raw)) || 0));
                setPeople(next);
                if (next >= 2) setTeams(teamCount(next, calc.peoplePerTeam));
              }}
            />
          </label>
          <label>
            Plan
            <select
              className="grid-input"
              value={planId}
              onChange={(event) => {
                const nextId = event.target.value as PlanId;
                const nextPlan = planById(nextId);
                setPlanId(nextId);
                setTeams(teamCount(people, nextPlan.peoplePerTeam));
              }}
            >
              {PLANS.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Teams
            <input
              className="grid-input"
              type="number"
              min={1}
              inputMode="numeric"
              value={teams || ""}
              onChange={(event) => {
                const raw = event.target.value;
                if (raw === "") {
                  setTeams(0);
                  return;
                }
                setTeams(Math.max(0, Math.round(Number(raw)) || 0));
              }}
            />
          </label>
        </div>
        <dl className="grid-price-breakdown">
          <div>
            <dt>{calc.name} plan</dt>
            <dd>
              {calc.id === "enterprise" ? "from " : ""}
              {euro(planPrice)}
              <span>/ month</span>
            </dd>
          </div>
          <div>
            <dt>
              {teams} {teams === 1 ? "team" : "teams"} in this session
            </dt>
            <dd>
              {calc.id === "enterprise" ? "from " : ""}
              {euro(sessionPrice)}
              <span>{euro(calc.perTeam)} each</span>
            </dd>
          </div>
          <div className="is-total">
            <dt>You pay this month</dt>
            <dd>
              {calc.id === "enterprise" ? "from " : ""}
              {euro(planPrice + sessionPrice)}
            </dd>
          </div>
        </dl>
        {over ? (
          <p className="grid-price-example-note">
            {calc.name} runs {calc.maxTeams} teams at once. This session needs {teams}.
            {better ? ` ${better.name} covers that.` : ""}
          </p>
        ) : (
          <p className="grid-price-example-note">
            Up to {calc.peoplePerTeam} people per team · {calc.maxTeams} teams at once
          </p>
        )}
      </aside>
      <p className="grid-body" style={{ marginTop: 16, maxWidth: 520, marginInline: "auto", textAlign: "center" }}>
        Yearly is billed every month at the lower rate, with a 12-month term. Monthly can be cancelled each month.
      </p>
    </div>
  );
}
