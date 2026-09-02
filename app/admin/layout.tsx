import type { Metadata } from "next";
import { BackofficeFrame } from "@/components/platform/backoffice-frame";
import { QueryProvider } from "@/components/platform/query-provider";

export const metadata: Metadata = {
  title: "GRID Studio | CMS",
  description: "Content management for the GRID asymmetric team dynamics engine.",
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <BackofficeFrame>{children}</BackofficeFrame>
    </QueryProvider>
  );
}
