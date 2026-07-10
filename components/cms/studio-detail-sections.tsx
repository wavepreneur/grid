"use client";

import { StudioPage } from "@/components/cms/studio-page";
import { GameEditorPanel } from "@/components/cms/games/game-editor-panel";
import { TaskEditor } from "@/components/cms/tasks/task-editor";
import { StudioGameDetailSkeleton, StudioTaskDetailSkeleton } from "@/components/cms/studio-list-skeletons";
import {
  useStudioGame,
  useStudioGameLiveMeta,
  useStudioGameTaskLinks,
} from "@/lib/hooks/use-studio-game-detail";
import { useStudioTask } from "@/lib/hooks/use-studio-task-detail";

export function StudioGameDetailSection({ gameId }: { gameId: string }) {
  const gameQuery = useStudioGame(gameId);
  const linksQuery = useStudioGameTaskLinks(gameId);
  const liveMetaQuery = useStudioGameLiveMeta(gameId);

  const game = gameQuery.data;
  const isInitialLoad = gameQuery.isPending && !game;

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

  return (
    <StudioPage
      title={game.name}
      description={
        game.is_template
          ? "Vorlage bearbeiten — Aufgaben, Layer und Logik werden beim Erstellen neuer Spiele dupliziert."
          : "Einstellungen, Layer-Profil und Content-Layer — Änderungen betreffen nur den Entwurf."
      }
    >
      <GameEditorPanel
        game={game}
        taskLinks={linksQuery.data ?? []}
        liveEventCount={liveMetaQuery.data?.liveEvents.length ?? 0}
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
