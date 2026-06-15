"use client";

import { useState, useTransition } from "react";
import { updateEventRouteOverride } from "@/app/actions/content";
import {
  GridButton,
  GridError,
  GridLabel,
} from "@/components/grid/grid-shell";

const EXAMPLE_OVERRIDE = `{
  "levels": {
    "2": {
      "title": "Custom Firmencampus",
      "type": "gps",
      "location": { "lat": 52.520008, "lng": 13.404954, "radius_meters": 100 }
    },
    "3": {
      "title": "Bonus: Unternehmens-Quiz",
      "type": "quiz",
      "description": "Was ist eure Firmenfarbe?",
      "options": [
        { "id": "a", "label": "Blau" },
        { "id": "b", "label": "Grün" }
      ],
      "correct_option_id": "a"
    }
  }
}`;

type RouteOverrideEditorProps = {
  inviteCode: string;
};

export function RouteOverrideEditor({ inviteCode }: RouteOverrideEditorProps) {
  const [json, setJson] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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

      setMessage("Route-Override gespeichert. Gilt für alle Teams dieses Events.");
    });
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-[var(--grid-border)] bg-black/20 p-4">
      <div>
        <p className="text-sm font-medium text-white">Custom-Route (Phase 3)</p>
        <p className="mt-1 text-xs leading-6 text-[var(--grid-muted)]">
          Überschreibt einzelne Level des Standard-Templates via{" "}
          <code className="text-[var(--grid-accent)]">events.route_override</code>.
        </p>
      </div>

      <div>
        <GridLabel>route_override JSON</GridLabel>
        <textarea
          value={json}
          onChange={(event) => setJson(event.target.value)}
          placeholder={EXAMPLE_OVERRIDE}
          rows={12}
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
