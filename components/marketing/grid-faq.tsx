"use client";

const FAQS = [
  {
    q: "Do people need an app or an account?",
    a: "No. They open a link, type a name, and play. That is why it starts in minutes and why IT does not have to approve anything.",
  },
  {
    q: "Is this another quiz game?",
    a: "No. The GRID is the live room. Your people join, play, and leave a record of the group — not who clicked fastest.",
  },
  {
    q: "Do we have to build a game?",
    a: "No. You bring the facts — names, questions, a look, or a JSON file. Intelligence writes the room. Five minutes or twenty hours.",
  },
  {
    q: "We already use a host or a facilitator.",
    a: "Keep them for a room of twelve. The GRID is for the events you cannot staff: two hours, thousands of people, no one in the room — and a record when it ends.",
  },
  {
    q: "What do we pay for?",
    a: "A monthly subscription. Choose yearly and you keep paying every month — 20% less, for twelve months. Credits are extra: one credit is one team, one session. Unused credits wait. You can test a live event in Start before you take a plan.",
  },
  {
    q: "What do we see when it is over?",
    a: "Whether the team worked. Where to improve. How countries and departments actually play together. Anonymized. On the group, not the person. The game was the room. The record is the point.",
  },
  {
    q: "Can we feel it before a company plan?",
    a: "Yes. Book one team on Exitmania — outdoor in a city, indoor, or online. Same room. One team today. Thousands when you are ready.",
  },
  {
    q: "Will this land on IT’s desk?",
    a: "Players use a browser link. No install, no company login, no new account. If IT asks, the answer is: they opened a page.",
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
