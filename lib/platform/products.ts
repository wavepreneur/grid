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
    description: "Live-Spiele überwachen und steuern",
    href: "/cockpit",
    available: true,
  },
  {
    id: "data",
    label: "Data",
    description: "Intelligence, Auswertungen und Insights",
    href: "/data",
    available: true,
  },
];

export function productFromPath(path: string): GridProduct {
  if (path.startsWith("/cockpit")) return "cockpit";
  if (path.startsWith("/data")) return "data";
  return "studio";
}
