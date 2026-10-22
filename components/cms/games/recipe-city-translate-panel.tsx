"use client";

import { useState, useTransition } from "react";
import {
  resetRecipeCityOpenerLocales,
  translateRecipeCityLocales,
} from "@/app/actions/cms/games";
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
  const [busy, setBusy] = useState<"reset" | "translate" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);

  function runReset() {
    setError(null);
    setBusy("reset");
    startTransition(async () => {
      try {
        const result = await resetRecipeCityOpenerLocales({ recipeId });
        if (!result.success) {
          setError(result.error);
          return;
        }
        const data = result.data!;
        setProgress(
          `Locales zurückgesetzt: ${data.games} Städte, ${data.packItems} Einstiege. EN zeigt jetzt Deutsch — dann „Übersetzen“.`,
        );
        invalidateGames();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Zurücksetzen fehlgeschlagen.");
      } finally {
        setBusy(null);
      }
    });
  }

  function runTranslate() {
    setError(null);
    setBusy("translate");
    startTransition(async () => {
      try {
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
      } catch (err) {
        setError(err instanceof Error ? err.message : "Übersetzen fehlgeschlagen.");
      } finally {
        setBusy(null);
      }
    });
  }

  const locked = pending || busy !== null;

  return (
    <div className="rounded-2xl border border-border bg-secondary/50 p-4">
      <p className="text-sm font-semibold text-foreground">Alle Städte · Locales</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Zuerst Locales auf Deutsch zurücksetzen (München-EN weg), dann Einstiegsaufgaben nach{" "}
        {localeLabel(language)} übersetzen. Titel bleiben manuell. Layer 2/3 kommen vom Hauptspiel.
      </p>
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      {progress ? <p className="mt-2 text-sm text-foreground">{progress}</p> : null}
      <div className="mt-3 flex flex-wrap gap-2">
        <StudioButton
          type="button"
          variant="secondary"
          size="sm"
          disabled={locked}
          onClick={runReset}
        >
          {busy === "reset" ? "Setzt zurück…" : "Locales → Deutsch"}
        </StudioButton>
        <StudioButton
          type="button"
          variant="secondary"
          size="sm"
          disabled={locked}
          icon={<IconLanguages size={16} />}
          onClick={runTranslate}
        >
          {busy === "translate" ? "Übersetzt…" : `${localeLabel(language)} für alle Städte`}
        </StudioButton>
      </div>
    </div>
  );
}
