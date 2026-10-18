"use client";

import { useState, useTransition } from "react";
import { submitGridDemoRequest } from "@/app/actions/demo-request";
import { copy } from "@/components/marketing/landing/copy";

export function ContactForm() {
  const t = copy.contact;
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const note = [form.get("interest"), form.get("message")]
      .map((value) => String(value ?? "").trim())
      .filter(Boolean)
      .join(" · ");
    setError(null);
    startTransition(async () => {
      const result = await submitGridDemoRequest({
        name: String(form.get("name") ?? ""),
        email: String(form.get("email") ?? ""),
        company: String(form.get("organization") ?? ""),
        note,
        language: "en",
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setSubmitted(true);
    });
  }

  if (submitted) {
    return (
      <div className="tl-form tl-form-done" role="status">
        <p className="tl-h3">{t.doneTitle}</p>
        <p className="tl-body">{t.doneText}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="tl-form">
      <div className="tl-form-row">
        <label className="tl-label-field">
          <span>{t.name}</span>
          <input className="tl-input" name="name" autoComplete="name" required />
        </label>
        <label className="tl-label-field">
          <span>{t.email}</span>
          <input className="tl-input" type="email" name="email" autoComplete="email" required />
        </label>
      </div>
      <div className="tl-form-row">
        <label className="tl-label-field">
          <span>{t.company}</span>
          <input className="tl-input" name="organization" autoComplete="organization" required />
        </label>
        <label className="tl-label-field">
          <span>{t.interest}</span>
          <select className="tl-input" name="interest" defaultValue={t.interests[0]}>
            {t.interests.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
      </div>
      <label className="tl-label-field">
        <span>{t.message}</span>
        <textarea className="tl-input" name="message" rows={3} />
      </label>
      <label className="tl-consent">
        <input type="checkbox" required />
        <span>{t.consent}</span>
      </label>
      {error ? (
        <p className="tl-form-error" role="alert">
          {error}
        </p>
      ) : null}
      <button type="submit" disabled={pending} className="tl-btn tl-btn-primary">
        {pending ? t.sending : t.submit}
      </button>
    </form>
  );
}
