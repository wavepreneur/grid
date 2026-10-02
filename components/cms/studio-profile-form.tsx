"use client";

import { useState, useTransition } from "react";
import { logoutPortal } from "@/app/actions/portal-login";
import { updatePortalProfile } from "@/app/actions/portal-profile";
import { Btn, Field, inputCls, Panel } from "@/components/cms/ui";

export function StudioProfileForm({ name, email }: { name: string; email: string }) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await updatePortalProfile(data);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setMessage("Gespeichert.");
      form.querySelectorAll<HTMLInputElement>('input[type="password"]').forEach((input) => {
        input.value = "";
      });
    });
  }

  return (
    <div className="space-y-6">
    <Panel title="Dein Profil" subtitle="So spricht dich The GRID an — und so meldest du dich an.">
      <form onSubmit={handleSubmit} className="grid max-w-xl gap-4">
        <Field label="Name">
          <input className={inputCls} name="name" defaultValue={name} required autoComplete="name" />
        </Field>
        <Field label="Email" hint="Damit loggst du dich ein.">
          <input
            className={inputCls}
            type="email"
            name="email"
            defaultValue={email}
            required
            autoComplete="email"
          />
        </Field>
        <Field label="Neues Passwort" hint="Leer lassen, wenn es bleiben soll.">
          <input
            className={inputCls}
            type="password"
            name="password"
            autoComplete="new-password"
            minLength={8}
          />
        </Field>
        <Field label="Passwort wiederholen">
          <input
            className={inputCls}
            type="password"
            name="passwordConfirm"
            autoComplete="new-password"
          />
        </Field>
        {error ? <p className="text-sm font-semibold text-destructive">{error}</p> : null}
        {message ? <p className="text-sm font-semibold text-primary">{message}</p> : null}
        <div className="flex flex-wrap items-center gap-3">
          <Btn type="submit" disabled={pending}>
            {pending ? "Speichern…" : "Profil speichern"}
          </Btn>
        </div>
      </form>
    </Panel>
    <Panel title="Abmelden" subtitle="Du landest wieder auf der Startseite.">
      <form action={logoutPortal}>
        <Btn type="submit" variant="outline">
          Logout
        </Btn>
      </form>
    </Panel>
    </div>
  );
}
