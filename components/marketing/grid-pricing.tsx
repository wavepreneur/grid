import Link from "next/link";

const SESSION = {
  name: "One-off session",
  price: "€14.90",
  cadence: "per person + €490 setup",
  scope: "10 to 1,000 people · min. 2 teams of 5",
  points: [
    "All game features",
    "Team report",
    "Custom leaderboard",
    "Live view during play",
  ],
  cta: "Run a session now",
  href: "#access",
} as const;

const PLANS = [
  {
    id: "start",
    name: "Start",
    price: "€119",
    teams: "3 teams at once · €49 per team",
    featured: false,
    cta: "Get Start",
    points: ["Min. 5 people per team", "Your company page", "Live view and results"],
  },
  {
    id: "team",
    name: "Team",
    price: "€319",
    teams: "12 teams at once · €39 per team",
    featured: true,
    cta: "Get Team",
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
    price: "€792",
    teams: "50 teams at once · €29 per team",
    featured: false,
    cta: "Get Company",
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
    price: "€2,320",
    teams: "Up to 50,000 people · from €19 per team",
    featured: false,
    cta: "Book a demo",
    points: [
      "Up to 12 people per team",
      "Your onboarding",
      "Security review and NDA",
      "Works council package",
      "A named contact",
    ],
  },
] as const;

export function GridPricing() {
  return (
    <div className="grid-pricing">
      <section className="grid-pricing-step" aria-labelledby="pricing-session">
        <p className="grid-pricing-step-label">
          <span>1</span> Start here
        </p>
        <article className="grid-card grid-session">
          <div className="grid-session-main">
            <h3 id="pricing-session" className="grid-product-header grid-session-name">
              {SESSION.name}
            </h3>
            <p className="grid-session-lead">
              One live event with your own team. No contract, no subscription.
            </p>
            <ul className="grid-session-points">
              {SESSION.points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </div>
          <div className="grid-session-buy">
            <p className="grid-session-price">{SESSION.price}</p>
            <p className="grid-session-cadence">{SESSION.cadence}</p>
            <p className="grid-session-scope">{SESSION.scope}</p>
            <Link href={SESSION.href} className="grid-cta grid-session-cta">
              {SESSION.cta}
            </Link>
          </div>
        </article>
      </section>

      <p className="grid-pricing-bridge">
        Liked it? The full session cost is credited to your yearly plan.
      </p>

      <section className="grid-pricing-step" aria-labelledby="pricing-plans">
        <p className="grid-pricing-step-label">
          <span>2</span> Run Tells all year
        </p>
        <h3 id="pricing-plans" className="grid-pricing-plans-title">
          Yearly plans, billed monthly
        </h3>
        <div className="grid-price-grid">
          {PLANS.map((plan) => (
            <article
              key={plan.id}
              className={`grid-card grid-plan${plan.featured ? " is-featured" : ""}`}
            >
              {plan.featured ? <p className="grid-plan-pick">Most teams pick this</p> : null}
              <h4 className="grid-product-header grid-plan-name">{plan.name}</h4>
              <div className="grid-plan-price-block">
                <p className="grid-plan-now">
                  {plan.id === "enterprise" ? <span className="grid-plan-from">from</span> : null}
                  {plan.price}
                  <span className="grid-plan-cadence">/ month</span>
                </p>
                <p className="grid-plan-teams">{plan.teams}</p>
              </div>
              <ul className="grid-plan-list">
                {plan.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
              <Link
                href="#access"
                className={plan.featured ? "grid-cta" : "grid-cta-outline"}
                style={{ marginTop: "auto", justifyContent: "center" }}
              >
                {plan.cta}
              </Link>
            </article>
          ))}
        </div>
        <ul className="grid-price-notes">
          <li>
            <strong>Yearly:</strong> 12-month term, billed monthly, includes your own landing page
            (tells.team/yourcompany)
          </li>
          <li>
            <strong>Pay upfront:</strong> 2 months free
          </li>
          <li>
            <strong>Monthly:</strong> 20% more, cancel any month, no own landing page
          </li>
        </ul>
      </section>
    </div>
  );
}
