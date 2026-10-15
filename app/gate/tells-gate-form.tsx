"use client";

import { useState } from "react";

export function TellsGateForm({ nextPath }: { nextPath: string }) {
  const [error, setError] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const password = new FormData(form).get("password");
    setError(false);
    setPending(true);
    try {
      const res = await fetch("/api/tells-gate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, next: nextPath }),
      });
      if (!res.ok) {
        setError(true);
        return;
      }
      const data = (await res.json()) as { next?: string };
      window.location.assign(typeof data.next === "string" ? data.next : "/");
    } catch {
      setError(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="grid-gate-form" onSubmit={(event) => void handleSubmit(event)}>
      <div className="grid-gate-unlock">
        <label className="grid-gate-field">
          <span className="sr-only">Password</span>
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            inputMode="numeric"
            required
            autoFocus
            disabled={pending}
            placeholder="••••••"
          />
        </label>
        <button type="submit" className="grid-gate-enter" disabled={pending}>
          {pending ? "…" : "Enter"}
        </button>
      </div>
      {error ? <p className="grid-gate-error">That didn’t work.</p> : null}
    </form>
  );
}
