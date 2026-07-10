import { QueryProvider } from "@/components/platform/query-provider";

export default function DataLayout({ children }: { children: React.ReactNode }) {
  return <QueryProvider>{children}</QueryProvider>;
}
