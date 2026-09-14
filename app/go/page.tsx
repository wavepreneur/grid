import { GridShell } from "@/components/grid/grid-shell";
import { PlayCodeEntry } from "@/components/entry/play-code-entry";

export const dynamic = "force-dynamic";

export default function PlayGoPage() {
  return (
    <GridShell
      variant="welcome"
      eyebrow="Spiel starten"
      title="Team-Code"
      description="Den Code aus der Mail oder vom Ticket hier eintippen. Keine App — dann seid ihr im Spiel."
    >
      <PlayCodeEntry />
    </GridShell>
  );
}
