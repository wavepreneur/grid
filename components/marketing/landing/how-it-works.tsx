"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Lock } from "lucide-react";
import { copy, EXAMPLE } from "@/components/marketing/landing/copy";
import { Signal } from "@/components/marketing/landing/signal";

const STEP_MS = 5000;

export function HowItWorks() {
  const steps = copy.how.steps;
  const rootRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [inView, setInView] = useState(false);
  const [held, setHeld] = useState(false);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      threshold: 0.4,
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!inView || held || active === steps.length - 1) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setTimeout(() => setActive((step) => step + 1), STEP_MS);
    return () => window.clearTimeout(id);
  }, [inView, held, active, steps.length]);

  return (
    <div ref={rootRef} className="tl-how">
      <div className="tl-steps" role="tablist" aria-label={copy.how.title}>
        {steps.map((step, index) => (
          <button
            key={step.n}
            type="button"
            role="tab"
            id={`tl-step-${index}`}
            aria-selected={index === active}
            aria-controls="tl-step-panel"
            className={`tl-step${index === active ? " is-active" : ""}${index < active ? " is-done" : ""}`}
            onClick={() => {
              setHeld(true);
              setActive(index);
            }}
          >
            <span className="tl-step-line" aria-hidden>
              <i
                key={`${index}-${active}-${held}`}
                className={index === active && !held && inView && index < steps.length - 1 ? "is-running" : undefined}
                style={{ animationDuration: `${STEP_MS}ms` }}
              />
            </span>
            <span className="tl-step-n">{step.n}</span>
            <span className="tl-step-title">{step.title}</span>
            <span className="tl-step-text">{step.text}</span>
          </button>
        ))}
      </div>

      <div
        id="tl-step-panel"
        role="tabpanel"
        aria-labelledby={`tl-step-${active}`}
        className="tl-how-stage"
      >
        <div className="tl-panel-swap" key={active}>
          {active === 0 ? <SetupPanel /> : active === 1 ? <LivePanel /> : <ReportPanel />}
        </div>
      </div>
    </div>
  );
}

function PanelBar({ title, aside }: { title: string; aside?: string }) {
  return (
    <div className="tl-panel-bar">
      <span className="tl-app-mark" aria-hidden />
      <strong>{title}</strong>
      {aside ? <span className="tl-panel-aside">{aside}</span> : null}
    </div>
  );
}

function SetupPanel() {
  const t = copy.panels.setup;
  return (
    <div className="tl-panel">
      <PanelBar title={t.title} aside={`${EXAMPLE.company}`} />
      <div className="tl-panel-grid">
        <div className="tl-field">
          <p className="tl-field-label">{t.game}</p>
          <p className="tl-field-value">{t.gameValue}</p>
          <p className="tl-field-label tl-gap">{t.fixedTitle}</p>
          <p className="tl-fixed">
            <Lock size={14} strokeWidth={1.5} aria-hidden /> {t.fixed}
          </p>
        </div>
        <div className="tl-field">
          <p className="tl-field-label">{t.slotsTitle}</p>
          <ul className="tl-slots">
            {t.slots.map((slot) => (
              <li key={slot.kind}>
                <span className="tl-slot-kind">{slot.kind}</span>
                <span className="tl-slot-value">{slot.value}</span>
                <span className="tl-slot-ok">
                  <Check size={14} strokeWidth={1.75} aria-hidden /> {t.checked}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="tl-field tl-field-wide">
          <p className="tl-field-label">{t.linkTitle}</p>
          <div className="tl-join">
            <span className="tl-join-link">{t.link}</span>
            <span className="tl-join-actions">
              {t.share.map((label, index) => (
                <span key={label} className={`tl-app-btn${index === 0 ? " is-primary" : ""}`}>
                  {label}
                </span>
              ))}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function LivePanel() {
  const t = copy.panels.live;
  return (
    <div className="tl-panel">
      <PanelBar title={`${EXAMPLE.company} · ${EXAMPLE.session}`} aside={t.timer} />
      <div className="tl-live">
        <p className="tl-live-status">
          <span className="tl-live-dot" aria-hidden /> {t.title} · {t.status}
        </p>
        <ul className="tl-live-teams">
          {t.progress.map((team) => (
            <li key={team.name}>
              <span className="tl-live-name">{team.name}</span>
              <span className="tl-live-track">
                {Array.from({ length: 6 }, (_, index) => (
                  <i key={index} className={index < team.done ? "is-done" : undefined} />
                ))}
              </span>
              <span className="tl-live-meta">
                {team.done}/6 {t.missions}
                {team.hint ? <em>{t.hint}</em> : null}
              </span>
            </li>
          ))}
        </ul>
        <p className="tl-tell">
          <Signal size={16} className="tl-signal-pop" />
          {t.tell}
        </p>
      </div>
    </div>
  );
}

function ReportPanel() {
  const t = copy.panels.report;
  const p = copy.preview;
  return (
    <div className="tl-panel">
      <PanelBar title={t.title} aside={t.readyIn} />
      <div className="tl-panel-report">
        <div className="tl-rp-score">
          <p className="tl-rp-score-value">{EXAMPLE.score}</p>
          <div>
            <p className="tl-rp-score-label">{p.scoreLabel}</p>
            <p className="tl-rp-verdict is-small">{p.verdict}</p>
          </div>
        </div>
        <ol className="tl-rp-findings">
          {p.findings.map((finding, index) => (
            <li key={finding.what} className={index === 0 ? "is-signal" : undefined}>
              <span className="tl-rp-finding-n">
                {index === 0 ? <Signal size={14} className="tl-signal-pop" /> : index + 1}
              </span>
              <div>
                <p className="tl-rp-finding-what">{finding.what}</p>
                <p className="tl-rp-finding-next">
                  <span>{p.nextLabel}</span> {finding.next}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
