"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createEvent } from "@/app/actions/lobby";
import { RouteOverrideEditor } from "@/components/admin/route-override-editor";
import {
  GridButton,
  GridError,
  GridInput,
  GridLabel,
} from "@/components/grid/grid-shell";

export function CreateEventForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [createdInviteCode, setCreatedInviteCode] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    setCreatedInviteCode(null);

    startTransition(async () => {
      const result = await createEvent({
        title: String(formData.get("title") ?? ""),
        organizationName: String(formData.get("organizationName") ?? ""),
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      setCreatedInviteCode(result.data.invite_code);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <form action={handleSubmit} className="flex flex-col gap-5">
        <div>
          <GridLabel>Event-Titel</GridLabel>
          <GridInput
            name="title"
            placeholder="z. B. Exitmania Team Day 2026"
            required
            minLength={3}
          />
        </div>

        <div>
          <GridLabel>Organisation (optional)</GridLabel>
          <GridInput
            name="organizationName"
            placeholder="z. B. Acme GmbH"
          />
        </div>

        {error ? <GridError message={error} /> : null}

        <GridButton type="submit" disabled={isPending}>
          {isPending ? "Event wird erstellt…" : "Event erstellen"}
        </GridButton>
      </form>

      {createdInviteCode ? (
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-[var(--grid-accent)]/30 bg-[var(--grid-accent)]/10 p-4 text-sm text-[var(--grid-accent)]">
            <p className="font-medium">Event erstellt.</p>
            <p className="mt-2 break-all">
              Einladungslink: {`${window.location.origin}/join/${createdInviteCode}`}
            </p>
            <GridButton
              type="button"
              className="mt-4"
              onClick={() => router.push(`/join/${createdInviteCode}`)}
            >
              Zum Event
            </GridButton>
          </div>

          <RouteOverrideEditor inviteCode={createdInviteCode} />
        </div>
      ) : null}
    </div>
  );
}
