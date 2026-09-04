import type { Metadata } from "next";
import { GridLandingPage } from "@/components/marketing/grid-landing-page";

export const metadata: Metadata = {
  title: "The GRID | They're playing in 60 seconds",
  description:
    "The GRID is the live room for team events. No app. No login. No IT. Send a link — ten people or fifty thousand. When it ends, you see how the group actually did.",
  openGraph: {
    title: "The GRID — They're playing in 60 seconds",
    description: "No app. No login. No IT. The live room for team events.",
  },
};

export default function HomePage() {
  return <GridLandingPage />;
}
