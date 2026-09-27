import { notFound } from "next/navigation";
import Link from "next/link";
import { getEventByInviteCode } from "@/lib/grid/session-auth";
import { EventLiveRanking } from "@/components/event/event-live-ranking";
import { eventPlayPath, eventRecapPath } from "@/lib/grid/event-routes";
import { normalizeCode } from "@/lib/grid/codes";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ inviteCode: string }>;
  searchParams: Promise<{ team?: string; embed?: string }>;
};

export default async function EventRankingPage({ params, searchParams }: Props) {
  const { inviteCode } = await params;
  const { team, embed } = await searchParams;
  const invite = normalizeCode(inviteCode);
  const event = await getEventByInviteCode(invite);
  if (!event) notFound();

  const join = team ? normalizeCode(team) : "";
  const embedded = embed === "1";

  return (
    <main className={embedded ? "bg-[#f7f6f0] px-3 py-4 text-slate-900" : "min-h-[100dvh] bg-[#f7f6f0] px-4 py-10 text-slate-900"}>
      <div className="mx-auto max-w-3xl">
        {embedded ? null : (
          <>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-teal-800">
              Live-Ranking
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">{event.title}</h1>
            <p className="mt-2 text-sm text-slate-500">
              Nur die Teams dieses Events — jederzeit wieder öffnen.
            </p>
          </>
        )}
        <div className={embedded ? "" : "mt-8"}>
          <EventLiveRanking inviteCode={invite} highlightJoinCode={join || undefined} />
        </div>
        {join && !embedded ? (
          <p className="mt-8 text-center text-sm font-semibold">
            <Link href={eventRecapPath(invite, join)} className="text-teal-800 hover:underline">
              Eure Ergebnisse
            </Link>
            <span className="mx-2 text-slate-300">·</span>
            <Link href={eventPlayPath(invite, join)} className="text-teal-800 hover:underline">
              Zurück zum Team
            </Link>
          </p>
        ) : null}
      </div>
    </main>
  );
}
