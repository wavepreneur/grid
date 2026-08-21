"use client";

import { useState, useTransition } from "react";
import { assignStudioAdminByEmail } from "@/app/actions/cms/organizations";
import { StudioButton, StudioError, StudioSuccess } from "@/components/cms/studio-ui";

const BOOTSTRAP_EMAILS = ["dk@kineticpillar.co", "dervis.kilic@gmail.com"] as const;

export function StudioMembershipBootstrap() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function run() {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const results: string[] = [];
      for (const email of BOOTSTRAP_EMAILS) {
        const result = await assignStudioAdminByEmail(email);
        if (!result.success) {
          setError(result.error ?? `Fehler bei ${email}`);
          return;
        }
        results.push(`${email} → ${result.data!.orgCount} Projekte (admin)`);
      }
      setMessage(results.join(" · "));
    });
  }

  return (
    <div className="space-y-3">
      <p className="text-sm leading-6 text-slate-600">
        Weist Exitmania + Tabbrain als <strong>admin</strong> zu (volle GRID-Kontrolle). Voraussetzung:
        Migration <code className="text-xs">organization_members</code> ist angewandt.
      </p>
      <StudioButton type="button" disabled={pending} onClick={run}>
        {pending ? "Wird zugewiesen…" : "Admin-Memberships setzen"}
      </StudioButton>
      {message ? <StudioSuccess message={message} /> : null}
      {error ? <StudioError message={error} /> : null}
    </div>
  );
}
