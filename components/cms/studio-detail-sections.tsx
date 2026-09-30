"use client";

import { StudioPage } from "@/components/cms/studio-page";
import { GameEditorPanel } from "@/components/cms/games/game-editor-panel";
import { TaskEditor } from "@/components/cms/tasks/task-editor";
import { StudioGameDetailSkeleton, StudioTaskDetailSkeleton } from "@/components/cms/studio-list-skeletons";
import { resolveSharedGameCopy } from "@/lib/cms/game-i18n";
import { localeLabel, parseStudioLanguage } from "@/lib/cms/languages";
import {
  useRecipeOrigin,
  useStudioGame,
  useStudioGameTaskLinks,
} from "@/lib/hooks/use-studio-game-detail";
import { useStudioTask } from "@/lib/hooks/use-studio-task-detail";

export function StudioGameDetailSection({
  gameId,
  locale,
}: {
  gameId: string;
  locale?: string;
}) {
  const gameQuery = useStudioGame(gameId);
  const linksQuery = useStudioGameTaskLinks(gameId);
  const originQuery = useRecipeOrigin(gameQuery.data);

  const game = gameQuery.data;
  const originContext = originQuery.data ?? { origin: null, isSource: false, recipe: null };
  const origin = originContext.origin;
  const waitingForOrigin = Boolean(game?.compose_recipe_id) && originQuery.isPending;
  const isInitialLoad = (gameQuery.isPending && !game) || waitingForOrigin;

  if (isInitialLoad) {
    return (
      <StudioPage title="Spiel" description="Editor wird geladen…">
        <StudioGameDetailSkeleton />
      </StudioPage>
    );
  }

  if (gameQuery.isError || !game) {
    return (
      <StudioPage title="Spiel nicht gefunden" description="">
        <p className="text-sm text-red-600">
          {gameQuery.error instanceof Error ? gameQuery.error.message : "Unbekannter Fehler"}
        </p>
      </StudioPage>
    );
  }

  if (originQuery.isError) {
    return (
      <StudioPage title={game.name} description="">
        <p className="text-sm text-red-600">
          {originQuery.error instanceof Error
            ? originQuery.error.message
            : "Rezept-Ursprung konnte nicht geladen werden."}
        </p>
      </StudioPage>
    );
  }

  const activeLocale = parseStudioLanguage(locale ?? game.language);
  const sourceLocale = parseStudioLanguage(game.language);
  const localeCopy = resolveSharedGameCopy(game, activeLocale, origin);
  const pageTitle = localeCopy.name.trim() || game.name;
  const localeNote =
    activeLocale !== sourceLocale
      ? `${localeLabel(activeLocale)} · Ausgangssprache ${localeLabel(sourceLocale)}`
      : null;

  return (
    <StudioPage
      title={pageTitle}
      description={
        game.is_template
          ? "Vorlage bearbeiten — Aufgaben, Layer und Logik werden beim Erstellen neuer Spiele dupliziert."
          : `${localeNote ? `${localeNote}. ` : ""}Spiel-Code ${game.slug}${game.city_slug ? ` · Stadt ${game.city_slug}` : ""}. Bedingungen im Spiel, Inhalt in Aufgaben.`
      }
    >
      <GameEditorPanel
        game={game}
        origin={origin}
        isRecipeSource={originContext.isSource}
        recipeName={originContext.recipe?.name ?? null}
        recipeId={originContext.recipe?.id ?? null}
        taskLinks={linksQuery.data ?? []}
        locale={locale}
      />
    </StudioPage>
  );
}

export function StudioTaskDetailSection({
  taskId,
  returnTo,
}: {
  taskId: string;
  returnTo?: string;
}) {
  const taskQuery = useStudioTask(taskId);
  const task = taskQuery.data;
  const isInitialLoad = taskQuery.isPending && !task;

  if (isInitialLoad) {
    return (
      <StudioPage title="Aufgabe" description="Editor wird geladen…">
        <StudioTaskDetailSkeleton />
      </StudioPage>
    );
  }

  if (taskQuery.isError || !task) {
    return (
      <StudioPage title="Aufgabe nicht gefunden" description="">
        <p className="text-sm text-red-600">
          {taskQuery.error instanceof Error ? taskQuery.error.message : "Unbekannter Fehler"}
        </p>
      </StudioPage>
    );
  }

  return (
    <StudioPage
      title={task.title}
      description={
        returnTo
          ? "Aufgabe bearbeiten — danach kehrst du zum Spiel zurück."
          : `Aufgabe bearbeiten · ${task.slug}`
      }
    >
      <TaskEditor task={task} returnTo={returnTo} />
    </StudioPage>
  );
}
