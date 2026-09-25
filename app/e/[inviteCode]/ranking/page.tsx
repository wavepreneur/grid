import { notFound } from "next/navigation";
import Link from "next/link";
import { getEventByInviteCode } from "@/lib/grid/session-auth";
import { EventLiveRanking } from "@/components/event/event-live-ranking";
import { eventPlayPath } from "@/lib/grid/event-routes";
import { normalizeCode } from "@/lib/grid/codes";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ inviteCode: string }>;
  searchParams: Promise<{ team?: string }>;
};

export default async function EventRankingPage({ params, searchParams }: Props) {
  const { inviteCode } = await params;
  const { team } = await searchParams;
  const invite = normalizeCode(inviteCode);
  const event = await getEventByInviteCode(invite);
  if (!event) notFound();

  const join = team ? normalizeCode(team) : "";

  return (
    <main className="min-h-[100dvh] bg-[#f7f6f0] px-4 py-10 text-slate-900">
      <div className="mx-auto max-w-3xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-teal-800">
          Live-Ranking
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">{event.title}</h1>
        <p className="mt-2 text-sm text-slate-500">
          Platzierung im Event. Teams, die noch spielen, bleiben sichtbar — öffne die Seite
          jederzeit erneut.
        </p>
        <div className="mt-8">
          <EventLiveRanking inviteCode={invite} highlightJoinCode={join || undefined} />
        </div>
        {join ? (
          <p className="mt-8 text-center">
            <Link
              href={eventPlayPath(invite, join)}
              className="text-sm font-semibold text-teal-800 hover:underline"
            >
              Zurück zum Team
            </Link>
          </p>
        ) : null}
      </div>
    </main>
  );
}
