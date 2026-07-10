import { QueryProvider } from "@/components/platform/query-provider";

export default function CockpitLayout({ children }: { children: React.ReactNode }) {
  return <QueryProvider>{children}</QueryProvider>;
}
