import type { GameLocaleCopy, TranslationCoverage } from "@/lib/cms/game-i18n";
import { parseConfirmed } from "@/lib/cms/game-i18n";

/**
 * Studio CMS writes are patches.
 *
 * Catalog pages (`/app/games`, `/app/tasks`, `/app/packs`) load through
 * React Query. `revalidatePath` on those routes blocks the mutation and does
 * not update the client cache — so field saves must not call it.
 *
 * Structural ops (create / delete / compose) still return the row; the client
 * patches or invalidates the affected query keys only.
 */
export function studioOwnedPackIds(game: {
  layer1_pack_id?: string | null;
  layer2_pack_id?: string | null;
  layer3_pack_id?: string | null;
}): string[] {
  return [game.layer1_pack_id, game.layer2_pack_id, game.layer3_pack_id].filter(
    (id): id is string => Boolean(id),
  );
}

export function localeWritePackIds(
  game: {
    layer1_pack_id?: string | null;
    layer2_pack_id?: string | null;
    layer3_pack_id?: string | null;
  },
  cityShell: boolean,
): string[] {
  if (cityShell) return game.layer1_pack_id ? [game.layer1_pack_id] : [];
  return studioOwnedPackIds(game);
}

export function localeCopyFromPatch(
  current: GameLocaleCopy | undefined,
  next: GameLocaleCopy,
  cityShell = false,
): GameLocaleCopy {
  const confirmed = parseConfirmed(next.confirmed ?? current?.confirmed).filter((key) =>
    cityShell ? key === "game:name" || key.includes(":quiz:") : true,
  );
  const coverage: TranslationCoverage | undefined = next.coverage ?? current?.coverage;
  if (cityShell) {
    return {
      name: next.name,
      confirmed,
      coverage,
    };
  }
  return {
    ...current,
    name: next.name,
    description: next.description,
    farewell_text: next.farewell_text,
    briefing_iframe_url: next.briefing_iframe_url,
    faq_iframe_url: next.faq_iframe_url,
    intro_youtube_url: next.intro_youtube_url,
    confirmed,
    coverage,
  };
}
