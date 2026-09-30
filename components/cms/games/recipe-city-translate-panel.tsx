"use client";

import { useState, useTransition } from "react";
import { translateRecipeCityLocales } from "@/app/actions/cms/games";
import { StudioButton } from "@/components/cms/studio-ui";
import { IconLanguages } from "@/components/cms/studio-icons";
import { localeLabel, type StudioLanguage } from "@/lib/cms/languages";
import { useInvalidateStudioGames } from "@/lib/hooks/use-studio-games";

export function RecipeCityTranslatePanel({
  recipeId,
  language,
}: {
  recipeId: string;
  language: StudioLanguage;
}) {
  const invalidateGames = useInvalidateStudioGames();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);

  function run() {
    setError(null);
    startTransition(async () => {
      let remaining = 1;
      let done = 0;
      while (remaining > 0) {
        const result = await translateRecipeCityLocales({
          recipeId,
          language,
          limit: 4,
        });
        if (!result.success) {
          setError(result.error);
          return;
        }
        const data = result.data!;
        done += data.processed;
        remaining = data.remaining;
        setProgress(
          remaining === 0
            ? `${done} Städte nach ${localeLabel(language)} übersetzt.`
            : `${done} fertig, noch ${remaining}…`,
        );
        if (data.processed === 0) break;
      }
      invalidateGames();
    });
  }

  return (
    <div className="rounded-2xl border border-border bg-secondary/50 p-4">
      <p className="text-sm font-semibold text-foreground">Alle Städte übersetzen</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Nur Einstiegsaufgaben dieses Rezepts nach {localeLabel(language)}. Titel bleiben zum
        Anpassen. Layer 2 und 3 kommen vom Hauptspiel.
      </p>
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      {progress ? <p className="mt-2 text-sm text-foreground">{progress}</p> : null}
      <div className="mt-3">
        <StudioButton
          type="button"
          variant="secondary"
          size="sm"
          disabled={pending}
          icon={<IconLanguages size={16} />}
          onClick={run}
        >
          {pending ? "Übersetzt…" : `${localeLabel(language)} für alle Städte`}
        </StudioButton>
      </div>
    </div>
  );
}
