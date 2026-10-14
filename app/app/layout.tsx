import type { Metadata } from "next";
import { BackofficeFrame } from "@/components/platform/backoffice-frame";
import { QueryProvider } from "@/components/platform/query-provider";

export const metadata: Metadata = {
  title: "Tells",
  description: "Your Tells workspace.",
};

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <BackofficeFrame>{children}</BackofficeFrame>
    </QueryProvider>
  );
}
