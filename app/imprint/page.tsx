import type { Metadata } from "next";
import { GridImprintPage } from "@/components/marketing/grid-imprint-page";

export const metadata: Metadata = {
  title: "Imprint | Tells",
  description:
    "Legal notice for Tells — a product of Kinetic Pillar OÜ. Registered office, contact and legally required disclosures.",
};

export default function ImprintRoute() {
  return <GridImprintPage />;
}
