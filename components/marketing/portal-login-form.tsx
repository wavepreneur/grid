"use client";

import { useState, useTransition } from "react";
import { loginPortal } from "@/app/actions/portal-login";

export function PortalLoginForm({ nextPath }: { nextPath: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(null);
    startTransition(async () => {
      const result = await loginPortal(form);
      if (!result.success) {
        setError(result.error);
        return;
      }
      window.location.assign(nextPath);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="grid-card" style={{ display: "grid", gap: 16, padding: 32 }}>
      <label>
        <span className="grid-input-label">Email</span>
        <input
          className="grid-input"
          type="email"
          name="email"
          autoComplete="username"
          required
        />
      </label>
      <label>
        <span className="grid-input-label">Password</span>
        <input
          className="grid-input"
          type="password"
          name="password"
          autoComplete="current-password"
          required
        />
      </label>
      {error ? <p style={{ fontSize: 13, color: "#b42318" }}>{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="grid-cta"
        style={{ justifyContent: "center", opacity: pending ? 0.6 : 1 }}
      >
        {pending ? "Checking…" : "Log in"}
      </button>
    </form>
  );
}
