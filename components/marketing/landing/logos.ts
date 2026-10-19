/**
 * Customer logos above the problem section.
 * Only list companies that gave written approval. To hide one, delete its entry.
 * A logo shows once its file exists under /public; until then it is skipped in production.
 * `height` (px) evens out visual weight: wide wordmarks sit lower, square marks taller.
 */
export const CUSTOMER_LOGOS = [
  { name: "Lufthansa", src: "/marketing/logos/lufthansa.svg", height: 22 },
  { name: "Deutsche Bank", src: "/marketing/logos/deutsche-bank.svg", height: 24 },
  { name: "Siemens", src: "/marketing/logos/siemens.svg", height: 18 },
  { name: "SAP", src: "/marketing/logos/sap.svg", height: 26 },
  { name: "adidas", src: "/marketing/logos/adidas.svg", height: 34 },
  { name: "BMW", src: "/marketing/logos/bmw.svg", height: 36 },
] as const;
