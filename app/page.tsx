import type { Metadata } from "next";
import { GridLandingPage } from "@/components/marketing/grid-landing-page";

export const metadata: Metadata = {
  title: "GRID | Synchronisierte Team-Erlebnisse in 60 Sekunden",
  description:
    "Zero-Ops Multiplayer-Infrastruktion: Keine Apps, keine Logins. Ein QR-Code verwandelt Smartphones in ein synchronisiertes Team-Cockpit — skalierbar von 2 bis 100.000 Personen.",
};

export default function HomePage() {
  return <GridLandingPage />;
}
