import type { Metadata } from "next";
import { GridLandingPage } from "@/components/marketing/grid-landing-page";

export const metadata: Metadata = {
  title: "GRID | Engine + Studio for asymmetric team missions",
  description:
    "GRID runs live asymmetric team missions on a fixed engine. GRID Studio authors games, GPS routes, and flow — publish a version, start live events.",
  openGraph: {
    title: "GRID — Asymmetric Team Dynamics Engine + Studio",
    description:
      "Author outdoor games in GRID Studio. Publish frozen versions. Run live events with GPS, roles, and cockpit telemetry.",
  },
};

export default function HomePage() {
  return <GridLandingPage />;
}
