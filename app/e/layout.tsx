import type { ReactNode } from "react";

/** Play routes inherit Outfit/Figtree from root layout. */
export default function EventPlayLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-full">{children}</div>;
}
