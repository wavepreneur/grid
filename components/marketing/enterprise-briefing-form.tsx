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
    const note = ["Enterprise / question", form.get("message")]
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
          We’ll get back to you shortly.
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
      <p className="grid-body" style={{ margin: 0, fontSize: 15 }}>
        Enterprise or a question? Talk to us.
      </p>
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        <label>
          <span className="grid-input-label">Name *</span>
          <input className="grid-input" name="name" autoComplete="name" required />
        </label>
        <label>
          <span className="grid-input-label">Work email *</span>
          <input className="grid-input" type="email" name="email" autoComplete="email" required />
        </label>
        <label>
          <span className="grid-input-label">Company *</span>
          <input className="grid-input" name="organization" autoComplete="organization" required />
        </label>
      </div>
      <label>
        <span className="grid-input-label">What do you need?</span>
        <textarea className="grid-input" name="message" rows={4} />
      </label>
      <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13, color: "var(--grid-muted)" }}>
        <input type="checkbox" required style={{ marginTop: 3 }} />
        <span>I agree to be contacted by Tells.</span>
      </label>
      {error ? <p style={{ fontSize: 13, color: "#b42318" }}>{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="grid-cta"
        style={{ justifyContent: "center", width: "fit-content", opacity: pending ? 0.6 : 1 }}
      >
        {pending ? "Sending…" : "Talk to us"}
      </button>
    </form>
  );
}
