"use client";

import { useEffect, useState, useTransition } from "react";
import { updateEventRouteOverride } from "@/app/actions/content";
import {
  GridButton,
  GridError,
  GridLabel,
} from "@/components/grid/grid-shell";

const EXAMPLE_OVERRIDE = `{
  "levels": {
    "2": {
      "location": { "lat": 52.516275, "lng": 13.377704, "radius_meters": 50000 }
    }
  }
}`;

type RouteOverrideEditorProps = {
  inviteCode: string;
  initialJson?: string;
};

export function RouteOverrideEditor({
  inviteCode,
  initialJson = "{}",
}: RouteOverrideEditorProps) {
  const [json, setJson] = useState(initialJson);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setJson(initialJson);
  }, [initialJson, inviteCode]);

  function handleSave() {
    setError(null);
    setMessage(null);

    startTransition(async () => {
      const result = await updateEventRouteOverride({
        inviteCode,
        routeOverrideJson: json.trim() || "{}",
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      setJson(result.data.routeOverrideJson);
      setMessage("Route-Override gespeichert. Gilt für alle Teams dieses Events.");
    });
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-[var(--grid-border)] bg-black/20 p-4">
      <div>
        <p className="text-sm font-medium text-white">Route-Override</p>
        <p className="mt-1 text-xs leading-6 text-[var(--grid-muted)]">
          Überschreibt einzelne Level via{" "}
          <code className="text-[var(--grid-accent)]">events.route_override</code>.
          Event: <span className="text-white">{inviteCode}</span>
        </p>
      </div>

      <div>
        <GridLabel>route_override JSON</GridLabel>
        <textarea
          value={json}
          onChange={(event) => setJson(event.target.value)}
          placeholder={EXAMPLE_OVERRIDE}
          rows={14}
          className="grid-input mt-2 w-full resize-y font-mono text-xs leading-6"
        />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <GridButton type="button" disabled={isPending} onClick={handleSave}>
          {isPending ? "Speichert…" : "Override speichern"}
        </GridButton>
        <GridButton
          type="button"
          className="sm:w-auto"
          onClick={() => setJson(EXAMPLE_OVERRIDE)}
        >
          Beispiel laden
        </GridButton>
      </div>

      {message ? (
        <p className="text-sm text-emerald-300">{message}</p>
      ) : null}
      {error ? <GridError message={error} /> : null}
    </div>
  );
}
