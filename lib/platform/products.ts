export type GridProduct = "studio" | "cockpit" | "data";

export type GridProductMeta = {
  id: GridProduct;
  label: string;
  description: string;
  href: string;
  available: boolean;
};

export const GRID_PRODUCTS: GridProductMeta[] = [
  {
    id: "studio",
    label: "Studio",
    description: "Spiele, Aufgaben und Tickets erstellen",
    href: "/admin",
    available: true,
  },
  {
    id: "cockpit",
    label: "Cockpit",
    description: "Self-Healing für Live-Sessions",
    href: "/cockpit",
    available: true,
  },
  {
    id: "data",
    label: "Data",
    description: "Indizes und Benchmarks nach Spielende",
    href: "/data",
    available: true,
  },
];

export function productFromPath(path: string): GridProduct {
  if (path.startsWith("/cockpit")) return "cockpit";
  if (path.startsWith("/data")) return "data";
  return "studio";
}
