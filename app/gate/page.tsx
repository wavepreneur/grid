import type { Metadata } from "next";
import { GridLogo } from "@/components/marketing/grid-logo";
import { TellsGateForm } from "@/app/gate/tells-gate-form";
import { safeGateNext } from "@/lib/marketing/tells-gate";
import "@/app/grid-marketing.css";

export const metadata: Metadata = {
  title: "Tells",
  description: "Don’t ask your team. Let it tell.",
  robots: { index: false, follow: false },
};

export default async function TellsGatePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const params = await searchParams;
  return (
    <div className="grid-marketing grid-marketing-studio grid-gate">
      <div className="grid-gate-grid" aria-hidden />
      <div className="grid-gate-glow" aria-hidden />
      <main className="grid-gate-main">
        <GridLogo height={40} priority className="grid-gate-logo" />
        <p className="section-label">Play-based team intelligence</p>
        <h1 className="grid-gate-headline">
          <span>Don’t ask your team.</span>
          <span>Let it tell.</span>
        </h1>
        <TellsGateForm nextPath={safeGateNext(params.next)} />
      </main>
    </div>
  );
}
