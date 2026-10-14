"use client";

const FAQS = [
  {
    q: "Is this just another quiz or team event tool?",
    a: "No. Events end with a photo, Tells ends with a report. The game is the method, not the product.",
  },
  {
    q: "Do we have to build a game?",
    a: "No. You add content, Tells builds the game.",
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
    a: "Sessions via monthly plans and credits. Your first live session comes before any contract.",
  },
  {
    q: "Will this land on IT’s desk?",
    a: "No. No installation, no app, no login.",
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
