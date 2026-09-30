import {
  aliasSlotConfirmedKeys,
  collectCityShellTranslationUnits,
  coverageForConfirmed,
  inferredConfirmedKeys,
  localesFromOverrides,
  parseConfirmed,
  parseTranslations,
  type GameLocaleCopy,
  type GameTranslations,
} from "@/lib/cms/game-i18n";
import { cityShellQuizSlots } from "@/lib/cms/game-slots";
import { isStudioLanguage, parseStudioLanguage, type StudioLanguage } from "@/lib/cms/languages";
import { parsePackLinkId } from "@/lib/cms/layer-packs";
import type { StudioGame, StudioGameTaskLink } from "@/lib/cms/types";

function cityShellAliases(
  slots: ReturnType<typeof cityShellQuizSlots>,
): Array<[string, string]> {
  return slots.flatMap((slot) => {
    const pairs: Array<[string, string]> = [];
    if (slot.geoId) {
      pairs.push([slot.geoId, slot.linkId], [slot.linkId, slot.geoId]);
      const geo = parsePackLinkId(slot.geoId);
      if (geo) {
        pairs.push([geo.itemId, slot.linkId], [slot.linkId, geo.itemId]);
        pairs.push([geo.itemId, slot.geoId], [slot.geoId, geo.itemId]);
      }
    }
    const level = parsePackLinkId(slot.linkId);
    if (level) {
      pairs.push([level.itemId, slot.linkId], [slot.linkId, level.itemId]);
    }
    return pairs;
  });
}

function localesOnLinks(links: StudioGameTaskLink[], source: StudioLanguage): StudioLanguage[] {
  const locales = new Set<StudioLanguage>();
  for (const link of links) {
    for (const key of Object.keys(localesFromOverrides(link.overrides))) {
      if (isStudioLanguage(key) && key !== source) locales.add(key);
    }
  }
  return [...locales];
}

/** Coverage for a city shell: title + Layer-1 quizzes already on the city pack. */
export function seedCityShellTranslations(
  game: StudioGame,
  links: StudioGameTaskLink[],
): GameTranslations {
  const slots = cityShellQuizSlots(links);
  const units = collectCityShellTranslationUnits({ game, slots });
  const aliases = cityShellAliases(slots);
  const allowed = new Set(units.map((unit) => unit.key));
  const source = parseStudioLanguage(game.language);
  const existing = parseTranslations(game.translations);
  const locales = new Set<StudioLanguage>([
    ...localesOnLinks(links, source),
    ...Object.keys(existing).filter(isStudioLanguage),
  ]);
  locales.delete(source);

  const translations: GameTranslations = { ...existing };
  for (const locale of locales) {
    const copy: GameLocaleCopy = translations[locale] ?? { name: game.name };
    const inferred = inferredConfirmedKeys({
      sourceGame: { name: game.name },
      currentGame: { name: copy.name ?? game.name },
      slots: slots.map((slot) => {
        const geo = links.find((link) => link.id === slot.geoId);
        const currentQuiz = geo ? localesFromOverrides(geo.overrides)[locale]?.quiz : undefined;
        return {
          linkId: slot.linkId,
          source: slot.source,
          current: { quiz: currentQuiz },
        };
      }),
    }).filter((key) => allowed.has(key));
    const confirmed = aliasSlotConfirmedKeys(
      parseConfirmed([
        ...parseConfirmed(copy.confirmed),
        ...inferred,
        ...(allowed.has("game:name") ? ["game:name"] : []),
      ]),
      aliases,
    ).filter((key) => allowed.has(key));
    translations[locale] = {
      name: copy.name ?? game.name,
      confirmed,
      coverage: coverageForConfirmed(units, confirmed),
    };
  }
  return translations;
}

export function withCityShellTranslations(
  game: StudioGame,
  links: StudioGameTaskLink[],
): StudioGame {
  const translations = seedCityShellTranslations(game, links);
  return { ...game, translations };
}
