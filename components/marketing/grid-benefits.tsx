"use client";

import {
  FileJson,
  HeartPulse,
  LineChart,
  Link2,
  Palette,
  Smartphone,
  Timer,
  Trophy,
  Users,
  Wand2,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

const BENEFITS: {
  n: string;
  title: string;
  text: string;
  icon: LucideIcon;
  span: "wide" | "tall" | "base";
  featured?: boolean;
}[] = [
  {
    n: "01",
    title: "Your page. Your look.",
    text: "The company gets its own landing page, in its own design. Your people never leave your world.",
    icon: Palette,
    span: "wide",
  },
  {
    n: "02",
    title: "They open a link.",
    text: "That is the start. No app. No login. No one explaining how. Anyone, anywhere, when they are ready.",
    icon: Link2,
    span: "base",
  },
  {
    n: "03",
    title: "Every device. One room.",
    text: "Phone, laptop, tablet — they all play at once. Nobody waits for the right hardware.",
    icon: Smartphone,
    span: "base",
  },
  {
    n: "04",
    title: "You bring the facts. The rest is magic.",
    text: "Names. Questions. A look. You drop them in. Intelligence writes the room. It feels like you built it overnight.",
    icon: Wand2,
    span: "wide",
    featured: true,
  },
  {
    n: "05",
    title: "A file in. A session out.",
    text: "Hand us a JSON file. The game is ready. No builder. No brief. No waiting on a studio.",
    icon: FileJson,
    span: "base",
  },
  {
    n: "06",
    title: "Five minutes. Or twenty hours.",
    text: "A pulse before lunch. A program that lasts a day. Same room. Same start.",
    icon: Timer,
    span: "base",
  },
  {
    n: "07",
    title: "The room mends itself.",
    text: "If someone drops, the team keeps playing. No host. No restart. No ticket.",
    icon: HeartPulse,
    span: "base",
  },
  {
    n: "08",
    title: "Scores the way you already work.",
    text: "By department. By country. By office. The high score is yours to shape.",
    icon: Trophy,
    span: "base",
  },
  {
    n: "09",
    title: "Data that builds the next team.",
    text: "Anonymized. On the group, not the person. The record that tells you how to form the next one.",
    icon: LineChart,
    span: "base",
  },
  {
    n: "10",
    title: "Fifty thousand. Whenever they want.",
    text: "All at once, or spread across the year. Same link. Same GRID. The room does not change.",
    icon: Users,
    span: "wide",
    featured: true,
  },
];

function CountUp({ to, active }: { to: number; active: boolean }) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!active) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setValue(to);
      return;
    }
    const start = performance.now();
    const duration = 1400;
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      setValue(Math.round(to * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, to]);

  return <span className="grid-benefit-count">{value.toLocaleString("en-US")}</span>;
}

export function GridBenefits() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={rootRef} className={`grid-benefit-grid${inView ? " is-in" : ""}`}>
      {BENEFITS.map((item, index) => {
        const Icon = item.icon;
        return (
          <article
            key={item.n}
            className={`grid-card grid-benefit${item.span === "wide" ? " is-wide" : ""}${item.featured ? " is-featured" : ""}`}
            style={{ animationDelay: `${index * 70}ms` }}
          >
            <div className="grid-benefit-top">
              <span className="grid-benefit-icon" aria-hidden>
                <Icon size={22} strokeWidth={1.75} />
              </span>
              <span className="grid-product-index">{item.n}</span>
            </div>
            <h2 className="grid-product-header">
              {item.n === "10" && inView ? (
                <>
                  <CountUp to={50000} active={inView} />. Whenever they want.
                </>
              ) : (
                item.title
              )}
            </h2>
            <p className="grid-product-copy">{item.text}</p>
          </article>
        );
      })}
    </div>
  );
}
