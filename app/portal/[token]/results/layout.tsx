import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Event-Ergebnisse",
  robots: { index: false, follow: false },
};

export default function PortalResultsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
