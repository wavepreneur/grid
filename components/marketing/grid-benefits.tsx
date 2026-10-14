"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

const SEES = [
  {
    id: "bottlenecks",
    n: "01",
    pill: "Bottlenecks",
    title: "Where does the team get stuck, and who waits on whom?",
    text: "Waits, stalls and dropped handoffs become a map. You see the bottleneck before Monday does.",
  },
  {
    id: "roles",
    n: "02",
    pill: "Role dynamics",
    title: "Does information flow, or does one role carry everything?",
    text: "Navigator, Solver, Spotter. You see who decides, who waits, and who never gets the next input.",
  },
  {
    id: "understanding",
    n: "03",
    pill: "Understanding",
    title: "Did the topic land, or did teams guess their way through?",
    text: "Wrong answers cluster. If three of five miss the same task, the topic did not land.",
  },
  {
    id: "benchmarks",
    n: "04",
    pill: "Benchmarks",
    title: "How does your team compare to anonymized teams worldwide?",
    text: "Same task. Same clock. Your pattern next to anonymized teams — not a survey score.",
  },
  {
    id: "boards",
    n: "05",
    pill: "Leaderboards",
    title: "Rankings by team, department, country and language.",
    text: "The board you already use at work. Then the teams land on it.",
  },
] as const;

const WAIT_BARS = [
  { role: "Navigator", seconds: 12, tell: false },
  { role: "Solver", seconds: 18, tell: false },
  { role: "Spotter", seconds: 48, tell: true },
  { role: "Team", seconds: 27, tell: false },
] as const;

function ShowBottlenecks() {
  return (
    <div className="grid-show-data">
      <p>Who waits on whom</p>
      <p className="grid-show-example">Example data</p>
      <div className="grid-show-chart" aria-label="Wait time by role">
        {WAIT_BARS.map((bar) => (
          <div key={bar.role} className={`grid-show-chart-col${bar.tell ? " is-tell" : ""}`}>
            <span className="grid-show-chart-val">{bar.seconds}s</span>
            <i style={{ "--h": `${Math.round((bar.seconds / 48) * 100)}%` } as CSSProperties} />
            <span className="grid-show-chart-role">{bar.role}</span>
          </div>
        ))}
      </div>
      <ul>
        <li>Spotter waited 48s for input</li>
        <li>Task 4 stalled · 3 of 5 teams</li>
      </ul>
    </div>
  );
}

function ShowRoles() {
  return (
    <div className="grid-show-heal">
      <div className="grid-show-heal-row">
        <span className="is-ok">Navigator · decides</span>
        <span className="is-ok">Solver · types</span>
        <span className="is-drop">Spotter · waits</span>
      </div>
      <p className="grid-show-heal-fix">One role carries. The others wait.</p>
    </div>
  );
}

const LAND_BARS = [
  { role: "Navigator", value: 88, tell: false },
  { role: "Solver", value: 80, tell: false },
  { role: "Spotter", value: 24, tell: true },
  { role: "Team", value: 76, tell: false },
] as const;

function ShowUnderstanding() {
  return (
    <div className="grid-show-data">
      <p>Did the topic land</p>
      <p className="grid-show-example">Example data</p>
      <div className="grid-show-chart" aria-label="Solved share by role">
        {LAND_BARS.map((bar) => (
          <div key={bar.role} className={`grid-show-chart-col${bar.tell ? " is-tell" : ""}`}>
            <span className="grid-show-chart-val">{bar.value}%</span>
            <i style={{ "--h": `${bar.value}%` } as CSSProperties} />
            <span className="grid-show-chart-role">{bar.role}</span>
          </div>
        ))}
      </div>
      <ul>
        <li>Task 4 failed in 3 of 5 teams</li>
        <li>Guessed through. Topic missed.</li>
      </ul>
    </div>
  );
}

function ShowBenchmarks() {
  return (
    <div className="grid-show-time">
      <div className="grid-show-time-opts">
        <span>Same dept</span>
        <span className="is-on">Mixed +31%</span>
      </div>
      <div className="grid-show-time-bar" aria-hidden>
        <i />
      </div>
      <p>Anonymized teams. Same task. Your pattern next to theirs.</p>
    </div>
  );
}

function ShowBoards() {
  return (
    <div className="grid-show-score">
      <p>Your board</p>
      <table>
        <thead>
          <tr>
            <th>Team</th>
            <th>Dept</th>
            <th>Country</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>North</td>
            <td>Mixed</td>
            <td>DE</td>
            <td>12:04</td>
          </tr>
          <tr>
            <td>APAC</td>
            <td>Ops</td>
            <td>JP</td>
            <td>12:41</td>
          </tr>
          <tr>
            <td>West</td>
            <td>HQ</td>
            <td>US</td>
            <td>13:08</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function Visual({ id }: { id: (typeof SEES)[number]["id"] }) {
  const body = {
    bottlenecks: <ShowBottlenecks />,
    roles: <ShowRoles />,
    understanding: <ShowUnderstanding />,
    benchmarks: <ShowBenchmarks />,
    boards: <ShowBoards />,
  } as const;
  return <div className={`grid-show-visual is-${id} is-run`}>{body[id]}</div>;
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
      setIndex((current) => (current + 1) % SEES.length);
    }, 4800);
    return () => window.clearInterval(id);
  }, [inView]);

  const current = SEES[index];

  return (
    <div ref={rootRef} className="grid-show">
      <div className="grid-show-pills" role="tablist" aria-label="What you see">
        {SEES.map((item, i) => (
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
        <Visual key={current.id} id={current.id} />
        <div className="grid-show-copy">
          <p className="grid-show-n">{current.n}</p>
          <h3 className="grid-product-header">{current.title}</h3>
          <p className="grid-product-copy">{current.text}</p>
        </div>
      </div>
    </div>
  );
}
