import { notFound } from "next/navigation";
import { EventResultsLive } from "@/components/event/event-results-live";
import { loadEventResultsByPortalToken } from "@/lib/grid/event-results";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ token: string }>;
};

export default async function PortalEventResultsPage({ params }: Props) {
  const { token } = await params;
  const snapshot = await loadEventResultsByPortalToken(token);
  if (!snapshot) notFound();

  const finished = snapshot.teams.filter((team) => team.status === "finished").length;

  return (
    <main className="min-h-[100dvh] bg-[#f7f6f0] px-4 py-10 text-slate-900">
      <div className="mx-auto max-w-2xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-teal-800">
          Event-Ergebnisse
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">{snapshot.title}</h1>
        <p className="mt-2 text-sm text-slate-500">
          {snapshot.teams.length} Teams · {finished} fertig · nur für den Bucher · Aufgaben grün =
          gelöst
        </p>
        <div className="mt-8">
          <EventResultsLive portalToken={token} initial={snapshot} />
        </div>
      </div>
    </main>
  );
}
