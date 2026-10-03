"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

const SHOWS = [
  {
    id: "page",
    n: "01",
    pill: "Your page",
    title: "Your page. Your look.",
    text: "Their landing. Your mark. Briefing, then the code. They never leave your world.",
  },
  {
    id: "link",
    n: "02",
    pill: "A link",
    title: "They open a link.",
    text: "Copy it. Scan it. No app. No login. No one explaining how.",
  },
  {
    id: "room",
    n: "03",
    pill: "One room",
    title: "Every device. One room.",
    text: "Not a meeting room. One session — Berlin, Tokyo, New York. Phone, laptop, tablet. Same play.",
  },
  {
    id: "magic",
    n: "04",
    pill: "The facts",
    title: "You bring the facts. The rest is magic.",
    text: "A PDF. A few fields. Intelligence writes the room. It feels like you built it overnight.",
  },
  {
    id: "json",
    n: "05",
    pill: "A file",
    title: "A file in. A session out.",
    text: "Hand us a JSON file. The game is ready. No builder. No brief. No waiting on a studio.",
  },
  {
    id: "time",
    n: "06",
    pill: "The length",
    title: "Five minutes. Or twenty hours.",
    text: "You set the clock. A pulse before lunch, or a day. Same room. Same start.",
  },
  {
    id: "heal",
    n: "07",
    pill: "Self-heal",
    title: "The room mends itself.",
    text: "Someone drops. The team keeps playing. No host. No restart. No ticket.",
  },
  {
    id: "score",
    n: "08",
    pill: "Your score",
    title: "Scores the way you already work.",
    text: "You set the board first: country, department, time. Then the teams land on it.",
  },
  {
    id: "data",
    n: "09",
    pill: "The data",
    title: "Data that builds the next team.",
    text: "Anonymized. On the group, not the person. The record that tells you how to form the next one.",
  },
  {
    id: "scale",
    n: "10",
    pill: "50,000",
    title: "Fifty thousand. Whenever they want.",
    text: "All at once, or spread across the year. Same link. Same GRID. The room does not change.",
  },
] as const;

function ShowPage() {
  return (
    <div className="grid-show-page">
      <div className="grid-show-page-brand">
        <span className="grid-show-page-mark">H</span>
        <div>
          <strong>Helix</strong>
          <em>Q3 battle · Ops vs Field</em>
        </div>
      </div>
      <p className="grid-show-page-lead">Enter your team code. Same session as your people.</p>
      <a className="grid-show-page-brief" href="#how" onClick={(event) => event.preventDefault()}>
        Open briefing
      </a>
      <div className="grid-show-page-code" aria-hidden>
        {"HX7K2P".split("").map((ch) => (
          <span key={ch}>{ch}</span>
        ))}
      </div>
      <span className="grid-show-page-go">Enter</span>
    </div>
  );
}

function ShowLink() {
  return (
    <div className="grid-show-link">
      <div className="grid-show-link-bar">
        <span>grid.app/go/helix</span>
        <em>Copied</em>
      </div>
      <div className="grid-show-link-row">
        <svg className="grid-show-qr" viewBox="0 0 21 21" aria-hidden>
          {Array.from({ length: 21 * 21 }, (_, i) => {
            const x = i % 21;
            const y = Math.floor(i / 21);
            const on = (x * 7 + y * 13 + x * y) % 5 !== 0 || x < 3 || y < 3 || x > 17 || y > 17;
            return on ? <rect key={i} x={x} y={y} width="1" height="1" /> : null;
          })}
        </svg>
        <p>Scan, or paste. That is the start.</p>
      </div>
    </div>
  );
}

function ShowRoom() {
  return (
    <div className="grid-show-room">
      <p className="grid-show-room-world">Berlin · Tokyo · New York</p>
      <div className="grid-show-room-map">
        <span className="grid-show-node is-phone">Phone</span>
        <span className="grid-show-node is-hub">One session</span>
        <span className="grid-show-node is-laptop">Laptop</span>
        <span className="grid-show-node is-tablet">Tablet</span>
      </div>
      <p className="grid-show-room-note">The room is the session. It can be the whole world.</p>
    </div>
  );
}

function ShowMagic() {
  return (
    <div className="grid-show-magic">
      <div className="grid-show-drop">
        <span>facts.pdf</span>
        <span>Names · Q1 · Q2</span>
      </div>
      <div className="grid-show-arrow" aria-hidden />
      <div className="grid-show-tiles">
        <span>Brief</span>
        <span>Quiz</span>
        <span>Level</span>
      </div>
    </div>
  );
}

function ShowJson() {
  return (
    <div className="grid-show-json">
      <span className="grid-show-file">session.json</span>
      <div className="grid-show-arrow" aria-hidden />
      <span className="grid-show-ready">Session ready</span>
    </div>
  );
}

function ShowTime() {
  return (
    <div className="grid-show-time">
      <div className="grid-show-time-opts">
        <span>5 min</span>
        <span className="is-on">20 hours</span>
      </div>
      <div className="grid-show-time-bar" aria-hidden>
        <i />
      </div>
      <p>You set how long they play.</p>
    </div>
  );
}

function ShowHeal() {
  return (
    <div className="grid-show-heal">
      <div className="grid-show-heal-row">
        <span className="is-ok">Lead · live</span>
        <span className="is-drop">Field · dropped</span>
        <span className="is-ok">HQ · live</span>
      </div>
      <p className="grid-show-heal-fix">Rejoined. The team never stopped.</p>
    </div>
  );
}

function ShowScore() {
  return (
    <div className="grid-show-score">
      <p>Your board</p>
      <table>
        <thead>
          <tr>
            <th>Team</th>
            <th>Country</th>
            <th>Dept</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>North</td>
            <td>DE</td>
            <td>Ops</td>
            <td>12:04</td>
          </tr>
          <tr>
            <td>APAC</td>
            <td>JP</td>
            <td>Field</td>
            <td>12:41</td>
          </tr>
          <tr>
            <td>West</td>
            <td>US</td>
            <td>HQ</td>
            <td>13:08</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function ShowData() {
  return (
    <div className="grid-show-data">
      <p>Anonymized group</p>
      <div className="grid-show-bars">
        <i style={{ "--h": "72%" } as CSSProperties} />
        <i style={{ "--h": "44%" } as CSSProperties} />
        <i style={{ "--h": "91%" } as CSSProperties} />
        <i style={{ "--h": "58%" } as CSSProperties} />
      </div>
      <ul>
        <li>Ops stalled · task 3</li>
        <li>Form the next team from Field + HQ</li>
      </ul>
    </div>
  );
}

function CountUp({ to, active }: { to: number; active: boolean }) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!active) {
      setValue(0);
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValue(to);
      return;
    }
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 1400);
      setValue(Math.round(to * (1 - (1 - t) ** 3)));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, to]);

  return <strong>{value.toLocaleString("en-US")}</strong>;
}

function ShowScale({ active }: { active: boolean }) {
  return (
    <div className="grid-show-scale">
      <CountUp to={50000} active={active} />
      <p>people. Same link. Same room.</p>
    </div>
  );
}

function Visual({ id, active }: { id: (typeof SHOWS)[number]["id"]; active: boolean }) {
  const body: Record<(typeof SHOWS)[number]["id"], ReactNode> = {
    page: <ShowPage />,
    link: <ShowLink />,
    room: <ShowRoom />,
    magic: <ShowMagic />,
    json: <ShowJson />,
    time: <ShowTime />,
    heal: <ShowHeal />,
    score: <ShowScore />,
    data: <ShowData />,
    scale: <ShowScale active={active} />,
  };
  return <div className={`grid-show-visual is-${id}${active ? " is-run" : ""}`}>{body[id]}</div>;
}

export function GridBenefits() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [inView, setInView] = useState(false);
  const hold = useRef(false);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.28 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!inView || hold.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => {
      if (hold.current) return;
      setIndex((current) => (current + 1) % SHOWS.length);
    }, 5200);
    return () => window.clearInterval(id);
  }, [inView]);

  const current = SHOWS[index];

  return (
    <div ref={rootRef} className="grid-show">
      <div className="grid-show-pills" role="tablist" aria-label="What you get">
        {SHOWS.map((item, i) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={i === index}
            className={i === index ? "is-on" : undefined}
            onClick={() => {
              hold.current = true;
              setIndex(i);
            }}
          >
            {item.pill}
          </button>
        ))}
      </div>

      <div className="grid-show-stage">
        <Visual key={current.id} id={current.id} active={inView} />
        <div className="grid-show-copy">
          <p className="grid-show-n">{current.n}</p>
          <h3 className="grid-product-header">{current.title}</h3>
          <p className="grid-product-copy">{current.text}</p>
        </div>
      </div>
    </div>
  );
}
