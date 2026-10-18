import type { Metadata } from "next";
import { TellsLandingPage } from "@/components/marketing/landing/landing-page";

export const metadata: Metadata = {
  title: "Tells | Don’t ask your team. Let it tell.",
  description:
    "Your team plays a game for 10 to 120 minutes. Tells measures how they work together and gives you a report: where they get stuck, which topic didn’t land, and what to do next.",
  openGraph: {
    title: "Tells | Don’t ask your team. Let it tell.",
    description: "Play-based team intelligence. Your team plays. You get a report on how it works.",
    images: [{ url: "/marketing/tells-icon.png", width: 512, height: 512, alt: "Tells" }],
  },
  icons: {
    icon: [{ url: "/icon.png", type: "image/png" }, { url: "/favicon.ico" }],
    apple: [{ url: "/apple-icon.png" }],
  },
};

export default function HomePage() {
  return <TellsLandingPage />;
}
