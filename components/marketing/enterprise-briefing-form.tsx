"use client";

import { useState } from "react";

export function EnterpriseBriefingForm() {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "48px 24px",
          borderRadius: 16,
          border: "1px solid rgba(0,229,255,0.2)",
          background: "rgba(0,229,255,0.04)",
        }}
      >
        <p style={{ fontSize: 18, fontWeight: 700, color: "#f0f4ff" }}>Access request received.</p>
        <p style={{ marginTop: 12, fontSize: 14, color: "rgba(240,244,255,0.45)", lineHeight: 1.6 }}>
          We review every request. If the fit is there, you hear from us within 24 hours — with
          keys, not a checkout link.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: "grid",
        gap: 16,
        padding: 32,
        borderRadius: 16,
        border: "1px solid rgba(0,229,255,0.15)",
        background: "rgba(0,0,0,0.35)",
      }}
    >
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        <label>
          <span className="grid-input-label">Full Name *</span>
          <input className="grid-input" name="name" required />
        </label>
        <label>
          <span className="grid-input-label">Job Title *</span>
          <input className="grid-input" name="title" required />
        </label>
        <label>
          <span className="grid-input-label">Corporate Email *</span>
          <input className="grid-input" type="email" name="email" required />
        </label>
        <label>
          <span className="grid-input-label">Organization *</span>
          <input className="grid-input" name="organization" required />
        </label>
      </div>
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        <label>
          <span className="grid-input-label">Global Workforce *</span>
          <select className="grid-input" name="workforce" required defaultValue="">
            <option value="" disabled>
              Select headcount
            </option>
            <option>Under 500</option>
            <option>500 – 2,000</option>
            <option>2,000 – 5,000</option>
            <option>5,000 – 20,000</option>
            <option>20,000 – 50,000</option>
            <option>50,000+</option>
            <option>Partner / product team</option>
          </select>
        </label>
        <label>
          <span className="grid-input-label">Active Countries / Regions</span>
          <input className="grid-input" name="regions" placeholder="e.g. DACH, UK, Nordics" />
        </label>
        <label>
          <span className="grid-input-label">Primary Use Case</span>
          <select className="grid-input" name="useCase" defaultValue="">
            <option value="">Select use case (optional)</option>
            <option>City / on-site team event</option>
            <option>Company-wide program</option>
            <option>Our own page or Slack</option>
            <option>We need proof the team did the work</option>
            <option>Other</option>
          </select>
        </label>
      </div>
      <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 12, color: "rgba(240,244,255,0.45)" }}>
        <input type="checkbox" required style={{ marginTop: 3 }} />
        <span>I agree to be contacted by The GRID.</span>
      </label>
      <button type="submit" className="grid-cta" style={{ justifyContent: "center", width: "fit-content" }}>
        Talk to The GRID
      </button>
      <p style={{ fontSize: 11, color: "rgba(240,244,255,0.35)" }}>
        Access is granted · Response within 24 hours · Mutual NDA available
      </p>
    </form>
  );
}
