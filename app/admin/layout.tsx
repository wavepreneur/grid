import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "GRID Studio | CMS",
  description: "Content management for the GRID asymmetric team dynamics engine.",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
