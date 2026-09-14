import { GridShell } from "@/components/grid/grid-shell";
import { PlayCodeEntry } from "@/components/entry/play-code-entry";

export const dynamic = "force-dynamic";

export default function PlayGoPage() {
  return (
    <GridShell
      variant="welcome"
      eyebrow="Spiel starten"
      title="Team-Code"
      description="Den Team-Code eintippen, dann deinen Namen — so kommst du wieder ins selbe Spiel."
    >
      <PlayCodeEntry />
    </GridShell>
  );
}
