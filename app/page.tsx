import type { Metadata } from "next";
import { GridLandingPage } from "@/components/marketing/grid-landing-page";

export const metadata: Metadata = {
  title: "GRID | Zero-Ops Multiplayer-Infrastruktur",
  description:
    "Zero-Ops Multiplayer-Infrastruktur für synchronisierte Team-Erlebnisse — ohne App-Downloads, ohne IT-Freigaben. Gebaut auf 1.900 validierten Deployments in Europa.",
  openGraph: {
    title: "BEYOND BORDERS. BEYOND LIMITS. THE GRID.",
    description:
      "Zero-Ops Multiplayer-Infrastruktur — synchronized team collaboration on any device. Zero infrastructure. Infinite scale.",
  },
};

export default function HomePage() {
  return <GridLandingPage />;
}
