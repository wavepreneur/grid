import { redirect } from "next/navigation";
import { lookupAccessCode } from "@/lib/grid/access";
import { GridError, GridShell } from "@/components/grid/grid-shell";
import { PlayCodeEntry } from "@/components/entry/play-code-entry";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ code: string }>;
};

export default async function PlayGoCodePage({ params }: Props) {
  const { code } = await params;
  const result = await lookupAccessCode(code);
  if (result.ok) {
    redirect(result.data.path);
  }

  return (
    <GridShell
      variant="welcome"
      eyebrow="Spiel starten"
      title="Team-Code"
      description="Den Team-Code eintippen, dann deinen Namen — so kommst du wieder ins selbe Spiel."
    >
      <div className="space-y-4">
        <GridError message={result.error} />
        <PlayCodeEntry initialCode={code} />
      </div>
    </GridShell>
  );
}
