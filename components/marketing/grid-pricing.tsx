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
    blurb: "Try a live event first. Then the room is yours.",
    featured: false,
    cta: "Try a live event",
    href: "#try",
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
    blurb: "The company rhythm.",
    featured: true,
    cta: "Talk to The GRID",
    href: "#access",
    points: [
      "Up to 8 people per team",
      "Everything in Start",
      "Scores by country and department",
      "Someone there if a room stalls",
    ],
  },
  {
    id: "company",
    name: "Company",
    monthly: 990,
    teams: "50 teams at once",
    credit: "€29 per team",
    blurb: "Many rooms. One place.",
    featured: false,
    cta: "Talk to The GRID",
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
    blurb: "The whole organisation.",
    featured: false,
    cta: "Talk about Enterprise",
    href: "#access",
    points: [
      "Groups of 12",
      "Your onboarding",
      "Security review and NDA",
      "A named contact",
    ],
  },
] as const;

function euro(value: number) {
  return `€${value.toLocaleString("en-US")}`;
}

export function GridPricing() {
  const [yearly, setYearly] = useState(true);

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
              <p className="grid-plan-eyebrow">
                {plan.id === "start" ? "Try first" : plan.id === "enterprise" ? "Talk to us" : "Studio + credits"}
              </p>
              <h3 className="grid-product-header grid-plan-name">{plan.name}</h3>
              <div className="grid-plan-price-block">
                <p className={`grid-plan-was${yearly ? "" : " is-empty"}`}>
                  {euro(plan.monthly)}
                </p>
                <p className="grid-plan-now">
                  {plan.id === "enterprise" ? <span className="grid-plan-from">from</span> : null}
                  {euro(price)}
                  <span className="grid-plan-cadence">/ month</span>
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
      <p className="grid-body" style={{ marginTop: 28, maxWidth: 640, marginInline: "auto", textAlign: "center" }}>
        Yearly is a 12-month plan, billed every month — 20% less. Credits are extra: one credit is one team, one session.
        Start with a live event before you take a plan.
      </p>
    </div>
  );
}
