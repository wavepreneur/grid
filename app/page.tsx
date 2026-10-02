import type { Metadata } from "next";
import { GridLandingPage } from "@/components/marketing/grid-landing-page";

export const metadata: Metadata = {
  title: "The GRID | A battle starts in 60 seconds",
  description:
    "A live battle in 60 seconds — two teams or a thousand. No app. No login. No IT. Send a link. When it ends, you see how the group actually did.",
  openGraph: {
    title: "The GRID — A battle starts in 60 seconds",
    description: "Two teams or a thousand. No app. No login. No IT.",
  },
};

export default function HomePage() {
  return <GridLandingPage />;
}
