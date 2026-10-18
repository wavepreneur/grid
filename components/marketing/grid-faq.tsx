"use client";

const FAQS = [
  {
    q: "Is this just another quiz or team event tool?",
    a: "No. It's a team event your people enjoy, and a report on how they work together. Ready in 60 seconds, no host, and every session adds to what you know about your teams.",
  },
  {
    q: "Do we have to build a game?",
    a: "No. You pick a proven game and fill a few prepared slots with your content. Missions, difficulty and roles stay as tested.",
  },
  {
    q: "Do we need a host or facilitator?",
    a: "No. One link, and teams run themselves.",
  },
  {
    q: "Does it rate individual employees?",
    a: "No. Results are team-level only, from groups of 5 or more.",
  },
  {
    q: "What do we pay for?",
    a: "Start with a one-off session. If you take a yearly plan afterwards, the cost is credited in full.",
  },
  {
    q: "Will this land on IT's desk?",
    a: "No. It runs in any browser. If you prefer, also inside Slack or Microsoft Teams. No app, no login, no installation.",
  },
  {
    q: "Does it need our works council?",
    a: "If you have one, we provide a template agreement and all data protection documents.",
  },
  {
    q: "Can we try it first?",
    a: "Yes. Run a one-off session with your own team. If you take a yearly plan afterwards, the cost is credited in full. Or play an Exitmania game first: it runs on the same engine.",
  },
] as const;

export function GridFaq() {
  return (
    <div className="grid-faq">
      {FAQS.map((item) => (
        <details key={item.q} className="grid-faq-item">
          <summary className="grid-faq-q">{item.q}</summary>
          <p className="grid-faq-a">{item.a}</p>
        </details>
      ))}
    </div>
  );
}
