import type { Metadata } from "next";
import { GridLandingPage } from "@/components/marketing/grid-landing-page";

export const metadata: Metadata = {
  title: "GRID | Asymmetric Team Dynamics Engine",
  description:
    "Turn corporate content into asymmetric multiplayer experiences. One engine, zero onboarding, unlimited scale. JSON-injected scenarios on a fixed FSM — not a game builder.",
  openGraph: {
    title: "Turn Corporate Content into Asymmetric Multiplayer Experiences.",
    description:
      "The Asymmetric Team Dynamics Engine. Zero-Ops Multiplayer-Infrastruktur for enterprise team stress-tests and collaboration telemetry.",
  },
};

export default function HomePage() {
  return <GridLandingPage />;
}
