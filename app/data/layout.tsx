import { BackofficeFrame } from "@/components/platform/backoffice-frame";
import { QueryProvider } from "@/components/platform/query-provider";

export default function DataLayout({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <BackofficeFrame>{children}</BackofficeFrame>
    </QueryProvider>
  );
}
