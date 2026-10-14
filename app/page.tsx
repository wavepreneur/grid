import type { Metadata } from "next";
import { GridLandingPage } from "@/components/marketing/grid-landing-page";

export const metadata: Metadata = {
  title: "Tells | Don’t ask your team. Let it tell.",
  description:
    "Play-based team intelligence. Surveys hear what people say. Tells sees what teams do — bottlenecks, roles, and whether the topic landed.",
  openGraph: {
    title: "Tells — Don’t ask your team. Let it tell.",
    description: "Play-based team intelligence. Your team plays. You see how it works.",
  },
};

export default function HomePage() {
  return <GridLandingPage />;
}
