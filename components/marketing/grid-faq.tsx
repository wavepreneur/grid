"use client";

const FAQS = [
  {
    q: "Do people need an app or an account?",
    a: "No. They open a link, type a name, and play. That is why it starts in minutes and why IT does not have to approve anything.",
  },
  {
    q: "Is this another quiz game?",
    a: "No. The GRID is the live room — outdoor, indoor, or online. Your site or your booking page can sell the event. The GRID runs the play and shows how the group did, not who clicked fastest.",
  },
  {
    q: "We already use a host or a facilitator.",
    a: "Keep them for a room of twelve. The GRID is for the events you cannot staff: a hundred people in a city, or thousands over a year, without someone watching a map.",
  },
  {
    q: "Can it handle a small team and a huge company?",
    a: "Yes. Same link, same roles, up to ten per team. One afternoon or a year-long program. Outdoor, indoor, or online. The room does not change.",
  },
  {
    q: "What do we see when it is over?",
    a: "Whether the team understood the task, where they stalled, if they were actually on site, and whether the roles you set held. Not a list of individual high-scorers.",
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
