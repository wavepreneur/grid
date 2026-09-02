import { GridShell } from "@/components/grid/grid-shell";
import { PlayCodeEntry } from "@/components/entry/play-code-entry";

export const dynamic = "force-dynamic";

export default function PlayGoPage() {
  return (
    <GridShell
      variant="welcome"
      eyebrow="GRID"
      title="Zugangscode"
      description="Code vom Team oder aus der Mail eintippen — dann seid ihr im Spiel."
    >
      <PlayCodeEntry />
    </GridShell>
  );
}
