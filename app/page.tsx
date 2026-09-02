import type { Metadata } from "next";
import { GridLandingPage } from "@/components/marketing/grid-landing-page";

export const metadata: Metadata = {
  title: "GRID | The Zero-Headcount Growth Engine",
  description:
    "Deploy, automate and monetize corporate experiences across 1,900+ cities. Zero operational payroll. Absolute data telemetry. 95%+ net margin by design.",
  openGraph: {
    title: "GRID — The Zero-Headcount Growth Engine",
    description:
      "Turn training, team events, and onboarding into an automated multiplayer engine. Request private infrastructure access.",
  },
};

export default function HomePage() {
  return <GridLandingPage />;
}
