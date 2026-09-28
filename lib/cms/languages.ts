export const STUDIO_LOCALES = [
  { id: "de", label: "Deutsch", short: "DE", flag: "🇩🇪" },
  { id: "en", label: "English", short: "EN", flag: "🇬🇧" },
  { id: "fr", label: "Français", short: "FR", flag: "🇫🇷" },
  { id: "es", label: "Español", short: "ES", flag: "🇪🇸" },
  { id: "it", label: "Italiano", short: "IT", flag: "🇮🇹" },
  { id: "nl", label: "Nederlands", short: "NL", flag: "🇳🇱" },
  { id: "pl", label: "Polski", short: "PL", flag: "🇵🇱" },
] as const;

export type StudioLanguage = (typeof STUDIO_LOCALES)[number]["id"];

/** Locales Exitmania books at launch. Add more here when a language goes live. */
export const LAUNCH_LOCALES: readonly StudioLanguage[] = ["de", "en"];

/** Tabs shown when adding translations. Prepared now, filled later. */
export const STUDIO_TAB_LOCALES: readonly StudioLanguage[] = ["de", "en", "fr", "es", "it"];

export function isStudioLanguage(value: unknown): value is StudioLanguage {
  return typeof value === "string" && STUDIO_LOCALES.some((locale) => locale.id === value);
}

export function parseStudioLanguage(value: unknown): StudioLanguage {
  return isStudioLanguage(value) ? value : "de";
}

export function localeShort(id: string): string {
  return STUDIO_LOCALES.find((locale) => locale.id === id)?.short ?? id.toUpperCase().slice(0, 2);
}

export function localeLabel(id: string): string {
  return STUDIO_LOCALES.find((locale) => locale.id === id)?.label ?? id;
}

export function localeFlag(id: string): string {
  return STUDIO_LOCALES.find((locale) => locale.id === id)?.flag ?? "";
}
