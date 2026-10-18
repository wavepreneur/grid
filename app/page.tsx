import type { Metadata } from "next";
import { GridLandingPage } from "@/components/marketing/grid-landing-page";

export const metadata: Metadata = {
  title: "Tells | Don’t ask your team. Let it tell.",
  description:
    "Play-based team intelligence. Surveys hear what people say. Tells sees what teams do. Your team plays for 10, 30 or 120 minutes — then you see how it works.",
  openGraph: {
    title: "Tells — Don’t ask your team. Let it tell.",
    description: "Play-based team intelligence. Your team plays. You see how it works.",
    images: [{ url: "/marketing/tells-icon.png", width: 512, height: 512, alt: "Tells" }],
  },
  icons: {
    icon: [{ url: "/icon.png", type: "image/png" }, { url: "/favicon.ico" }],
    apple: [{ url: "/apple-icon.png" }],
  },
};

export default function HomePage() {
  return <GridLandingPage />;
}
