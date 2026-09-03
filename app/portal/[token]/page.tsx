import { getPortalSnapshot } from "@/app/actions/portal";
import { EventPortalForm } from "@/components/portal/event-portal-form";
import { GridError, GridShell } from "@/components/grid/grid-shell";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ token: string }>;
};

export default async function EventPortalPage({ params }: Props) {
  const { token } = await params;
  const result = await getPortalSnapshot(token);

  if (!result.success) {
    return (
      <GridShell
        variant="welcome"
        eyebrow="Event-Portal"
        title="Link ungültig"
        description="Dieser Portal-Link ist abgelaufen oder existiert nicht."
      >
        <GridError message={result.error} />
      </GridShell>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#f7f6f0]">
      <header className="bg-[linear-gradient(165deg,#0f766e_0%,#134e4a_100%)] px-4 pb-10 pt-[max(1.5rem,env(safe-area-inset-top))] text-white">
        <div className="mx-auto max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/75">
            Event-Portal
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">{result.data.title}</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-white/85">
            Dauer, Koordinaten und Einstiegsquiz ändern — danach ist das Event sofort startklar.
          </p>
        </div>
      </header>
      <main className="mx-auto w-full max-w-2xl px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-6">
        <div className="rounded-[1.75rem] bg-white p-5 shadow-[0_20px_50px_-24px_rgba(15,23,42,0.45)] sm:p-7">
          <EventPortalForm initial={result.data} />
        </div>
      </main>
    </div>
  );
}
