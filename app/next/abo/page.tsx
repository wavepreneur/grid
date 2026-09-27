import type { Metadata } from "next";
import { GridAboNextPage } from "@/components/marketing/grid-abo-next-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Nächster Schritt: GRID Abo",
  description:
    "Wie GRID aus dem heutigen Event ein eigenes Firmen-Spiel macht — mit Demo-Termin.",
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: Promise<{ team?: string; score?: string; results?: string }>;
};

export default async function GridAboNextRoute({ searchParams }: Props) {
  const { team, score, results } = await searchParams;
  const resultsUrl =
    typeof results === "string" && /^https?:\/\//i.test(results) ? results : undefined;
  return (
    <GridAboNextPage
      teamName={team?.trim() || undefined}
      score={score?.trim() || undefined}
      resultsUrl={resultsUrl}
    />
  );
}
