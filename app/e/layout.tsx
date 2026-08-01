import { Figtree, Outfit } from "next/font/google";
import type { ReactNode } from "react";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-figtree",
  display: "swap",
});

export default function EventPlayLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`${outfit.variable} ${figtree.variable} min-h-full`}>{children}</div>
  );
}
