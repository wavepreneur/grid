import type { Metadata } from "next";
import { GridStatusPage } from "@/components/marketing/grid-status-page";

export const metadata: Metadata = {
  title: "GRID | Engine status (dev)",
  description:
    "Internal system of record: live, pilot, legacy, and roadmap for the GRID engine, Studio, and Cockpit.",
  robots: { index: false, follow: false },
};

export default function StatusPage() {
  return <GridStatusPage />;
}
