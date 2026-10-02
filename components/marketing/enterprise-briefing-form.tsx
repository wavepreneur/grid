"use client";

import { useState, useTransition } from "react";
import { submitGridDemoRequest } from "@/app/actions/demo-request";

export function EnterpriseBriefingForm() {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "");
    const email = String(form.get("email") ?? "");
    const company = String(form.get("organization") ?? "");
    const note = [
      "Demo — no obligation",
      form.get("title"),
      form.get("plan"),
      form.get("workforce"),
      form.get("useCase"),
    ]
      .map((value) => String(value ?? "").trim())
      .filter(Boolean)
      .join(" · ");
    setError(null);
    startTransition(async () => {
      const result = await submitGridDemoRequest({ name, email, company, note, language: "en" });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setSubmitted(true);
    });
  }

  if (submitted) {
    return (
      <div
        className="grid-card"
        style={{ textAlign: "center", padding: "48px 24px" }}
      >
        <p style={{ fontSize: 20, fontWeight: 800 }}>We have it.</p>
        <p className="grid-body" style={{ marginTop: 12 }}>
          We reply within 24 hours.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid-card"
      style={{ display: "grid", gap: 16, padding: 32 }}
    >
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        <label>
          <span className="grid-input-label">Full name *</span>
          <input className="grid-input" name="name" required />
        </label>
        <label>
          <span className="grid-input-label">Job title *</span>
          <input className="grid-input" name="title" required />
        </label>
        <label>
          <span className="grid-input-label">Work email *</span>
          <input className="grid-input" type="email" name="email" required />
        </label>
        <label>
          <span className="grid-input-label">Organization *</span>
          <input className="grid-input" name="organization" required />
        </label>
      </div>
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        <label>
          <span className="grid-input-label">Who will play</span>
          <select className="grid-input" name="workforce" defaultValue="">
            <option value="">Select a range</option>
            <option>A few teams this quarter</option>
            <option>Monthly rooms, under 100 people</option>
            <option>Company-wide, 100–1,000</option>
            <option>Several countries, 1,000+</option>
            <option>Up to 50,000</option>
          </select>
        </label>
        <label>
          <span className="grid-input-label">Plan you have in mind</span>
          <select className="grid-input" name="plan" defaultValue="">
            <option value="">Not sure yet</option>
            <option>Start — 3 teams / 4 people</option>
            <option>Team — 12 teams / 8 people</option>
            <option>Company — 50 teams / 10 people</option>
            <option>Enterprise — up to 50,000</option>
          </select>
        </label>
        <label>
          <span className="grid-input-label">What you want to see</span>
          <select className="grid-input" name="useCase" defaultValue="">
            <option value="">Select (optional)</option>
            <option>How we make a session yours</option>
            <option>How people join</option>
            <option>What leadership sees</option>
            <option>We already played a public session</option>
            <option>Other</option>
          </select>
        </label>
      </div>
      <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13, color: "var(--grid-muted)" }}>
        <input type="checkbox" required style={{ marginTop: 3 }} />
        <span>I agree to be contacted by The GRID.</span>
      </label>
      {error ? <p style={{ fontSize: 13, color: "#b42318" }}>{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="grid-cta"
        style={{ justifyContent: "center", width: "fit-content", opacity: pending ? 0.6 : 1 }}
      >
        {pending ? "Sending…" : "Talk to The GRID"}
      </button>
      <p className="grid-body" style={{ fontSize: 12 }}>
        Access is granted · Response within 24 hours · Mutual NDA available
      </p>
    </form>
  );
}
