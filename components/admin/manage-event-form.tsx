"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  applyGpsTestOverride,
  getEventAdminDetails,
  type EventAdminDetails,
} from "@/app/actions/content";
import { RouteOverrideEditor } from "@/components/admin/route-override-editor";
import {
  GridButton,
  GridError,
  GridInput,
  GridLabel,
} from "@/components/grid/grid-shell";

export function ManageEventForm() {
  const [inviteCodeInput, setInviteCodeInput] = useState("");
  const [event, setEvent] = useState<EventAdminDetails | null>(null);
  const [radiusMeters, setRadiusMeters] = useState("50000");
  const [lat, setLat] = useState("52.516275");
  const [lng, setLng] = useState("13.377704");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleLoad() {
    setError(null);
    setMessage(null);

    startTransition(async () => {
      const result = await getEventAdminDetails(inviteCodeInput);
      if (!result.success) {
        setError(result.error);
        setEvent(null);
        return;
      }

      setEvent(result.data);
      setInviteCodeInput(result.data.inviteCode);
    });
  }

  function handleGpsTestMode() {
    if (!event) return;

    setError(null);
    setMessage(null);

    startTransition(async () => {
      const result = await applyGpsTestOverride({
        inviteCode: event.inviteCode,
        radiusMeters: Number(radiusMeters),
        lat: Number(lat),
        lng: Number(lng),
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      setEvent({
        ...event,
        routeOverrideJson: result.data.routeOverrideJson,
      });
      setMessage(
        `GPS-Testmodus aktiv für Level ${result.data.gpsLevels.join(", ")} (Radius ${radiusMeters} m).`,
      );
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <div>
          <GridLabel>Event Invite-Code</GridLabel>
          <GridInput
            value={inviteCodeInput}
            onChange={(event) => setInviteCodeInput(event.target.value.toUpperCase())}
            placeholder="z. B. UPGJT3XK"
          />
        </div>

        <GridButton type="button" disabled={isPending || !inviteCodeInput.trim()} onClick={handleLoad}>
          {isPending ? "Lädt…" : "Event laden"}
        </GridButton>
      </div>

      {error ? <GridError message={error} /> : null}
      {message ? <p className="text-sm text-emerald-300">{message}</p> : null}

      {event ? (
        <div className="flex flex-col gap-6">
          <div className="rounded-xl border border-[var(--grid-border)] bg-black/20 px-4 py-3 text-sm text-[var(--grid-muted)]">
            <p>
              <span className="text-white">{event.title}</span> · Status{" "}
              <span className="text-[var(--grid-accent)]">{event.status}</span>
            </p>
            <p className="mt-2 break-all">
              Link:{" "}
              <Link
                href={`/join/${event.inviteCode}`}
                className="text-[var(--grid-accent)] underline-offset-2 hover:underline"
              >
                /join/{event.inviteCode}
              </Link>
            </p>
            <p className="mt-2 break-all">
              Event Cockpit:{" "}
              <Link
                href={`/cockpit/${event.inviteCode}`}
                className="text-emerald-300 underline-offset-2 hover:underline"
              >
                /cockpit/{event.inviteCode}
              </Link>
            </p>
          </div>

          <div className="flex flex-col gap-4 rounded-xl border border-[var(--grid-accent)]/20 bg-[var(--grid-accent)]/5 p-4">
            <div>
              <p className="text-sm font-medium text-white">GPS-Testmodus</p>
              <p className="mt-1 text-xs leading-6 text-[var(--grid-muted)]">
                Setzt für alle GPS-Level denselben Checkpoint und vergrößert den Radius —
                ideal zum Testen ohne vor Ort zu sein.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <GridLabel>Radius (Meter)</GridLabel>
                <GridInput
                  value={radiusMeters}
                  onChange={(event) => setRadiusMeters(event.target.value)}
                  inputMode="numeric"
                />
              </div>
              <div>
                <GridLabel>Latitude</GridLabel>
                <GridInput
                  value={lat}
                  onChange={(event) => setLat(event.target.value)}
                  inputMode="decimal"
                />
              </div>
              <div>
                <GridLabel>Longitude</GridLabel>
                <GridInput
                  value={lng}
                  onChange={(event) => setLng(event.target.value)}
                  inputMode="decimal"
                />
              </div>
            </div>

            <GridButton type="button" disabled={isPending} onClick={handleGpsTestMode}>
              {isPending ? "Wird angewendet…" : "GPS-Testmodus anwenden"}
            </GridButton>
          </div>

          <RouteOverrideEditor
            inviteCode={event.inviteCode}
            initialJson={event.routeOverrideJson}
          />
        </div>
      ) : null}
    </div>
  );
}
