import type { Metadata } from "next";
import { GridAboNextPage } from "@/components/marketing/grid-abo-next-page";
import { playUiLang } from "@/lib/tells/play-ui";

export const dynamic = "force-dynamic";

type Search = { team?: string; score?: string; results?: string; lang?: string };

type Props = {
  searchParams: Promise<Search>;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { lang } = await searchParams;
  const english = playUiLang(lang) === "en";
  return {
    title: english ? "Next step: Tells" : "Nächster Schritt: Tells",
    description: english
      ? "How Tells turns today’s event into your own company game — with a demo slot."
      : "Wie Tells aus dem heutigen Event ein eigenes Firmen-Spiel macht — mit Demo-Termin.",
    robots: { index: false, follow: false },
  };
}

export default async function GridAboNextRoute({ searchParams }: Props) {
  const { team, score, results, lang } = await searchParams;
  const resultsUrl =
    typeof results === "string" && /^https?:\/\//i.test(results) ? results : undefined;
  const language = playUiLang(lang);
  return (
    <GridAboNextPage
      language={language}
      teamName={team?.trim() || undefined}
      score={score?.trim() || undefined}
      resultsUrl={resultsUrl}
    />
  );
}
