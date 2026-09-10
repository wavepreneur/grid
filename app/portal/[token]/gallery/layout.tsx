import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Event-Galerie",
  robots: { index: false, follow: false },
};

export default function PortalGalleryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
