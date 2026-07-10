import type { ReactNode } from "react";

export default function AdminTemplate({ children }: { children: ReactNode }) {
  return <div className="studio-route-enter flex min-h-0 flex-1 flex-col">{children}</div>;
}
