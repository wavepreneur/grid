import { notFound } from "next/navigation";
import { listEventCapturesByPortalToken } from "@/lib/grid/event-captures";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ token: string }>;
};

export default async function PortalEventGalleryPage({ params }: Props) {
  const { token } = await params;
  const snapshot = await listEventCapturesByPortalToken(token);
  if (!snapshot) notFound();

  return (
    <main className="min-h-[100dvh] bg-[#f7f6f0] px-4 py-10 text-slate-900">
      <div className="mx-auto max-w-3xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-teal-800">
          Event-Galerie
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">{snapshot.title}</h1>
        <p className="mt-2 text-sm text-slate-500">
          {snapshot.items.length} Aufnahmen · nur für den Bucher · zum Teilen kopieren
        </p>

        {snapshot.items.length === 0 ? (
          <p className="mt-10 rounded-2xl bg-white px-5 py-8 text-center text-sm text-slate-500">
            Noch keine Fotos oder Videos. Sobald ein Team sendet, erscheinen sie hier.
          </p>
        ) : (
          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {snapshot.items.map((item) => (
              <li key={item.id} className="overflow-hidden rounded-2xl bg-white shadow-sm">
                {item.kind === "video" ? (
                  <video
                    src={item.publicUrl}
                    controls
                    playsInline
                    className="aspect-[3/4] w-full bg-black object-cover"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.publicUrl}
                    alt=""
                    className="aspect-[3/4] w-full object-cover"
                  />
                )}
                <div className="space-y-1 px-4 py-3">
                  <p className="text-sm font-semibold text-slate-900">{item.teamName}</p>
                  <p className="text-xs text-slate-500">
                    Aufgabe {item.levelNumber}
                    {item.kind === "video"
                      ? " · Video"
                      : item.kind === "augmented_photo"
                        ? " · Rahmen-Foto"
                        : " · Foto"}
                  </p>
                  <a
                    href={item.publicUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block pt-1 text-sm font-medium text-teal-700 hover:underline"
                  >
                    Öffnen / teilen
                  </a>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
