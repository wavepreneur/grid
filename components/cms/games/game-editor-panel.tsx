"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createLiveEventFromGame } from "@/app/actions/cms/events";
import {
  publishGame,
  saveGameAsTemplate,
  updateGame,
} from "@/app/actions/cms/games";
import { GridButton, GridError, GridInput, GridLabel, GridSelect } from "@/components/grid/grid-shell";
import { StudioBadge, StudioPanel } from "@/components/cms/admin-shell";
import { GameFlowPanel } from "@/components/cms/games/game-flow-panel";
import type { StudioGame, StudioGameTaskLink, StudioTask } from "@/lib/cms/types";
import { parseLogicRules, type StudioLogicRule } from "@/lib/cms/logic-rules";

type Props = {
  game: StudioGame;
  taskLinks: StudioGameTaskLink[];
  libraryTasks: StudioTask[];
};

type GameEditorState = Omit<StudioGame, "logic_rules"> & { logic_rules: StudioLogicRule[] };

function toEditorState(game: StudioGame): GameEditorState {
  return { ...game, logic_rules: parseLogicRules(game.logic_rules) };
}

export function GameEditorPanel({ game: initialGame, taskLinks, libraryTasks }: Props) {
  const router = useRouter();
  const [game, setGame] = useState<GameEditorState>(() => toEditorState(initialGame));
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [liveLink, setLiveLink] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSaveSettings(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await updateGame({
        id: game.id,
        name: game.name,
        description: game.description,
        language: game.language,
        city_slug: game.city_slug,
        duration_minutes: game.duration_minutes,
        gps_enabled: game.gps_enabled,
        farewell_text: game.farewell_text,
        logo_url: game.logo_url,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setGame(toEditorState(result.data!));
      setMessage("Einstellungen gespeichert (nur Draft — Live-Events unverändert).");
      router.refresh();
    });
  }

  function handlePublish() {
    setError(null);
    startTransition(async () => {
      const result = await publishGame(game.id);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setGame((g) => ({
        ...g,
        status: "published",
        published_version_number: result.data!.versionNumber,
      }));
      setMessage(`Version v${result.data!.versionNumber} veröffentlicht — Live-Events unverändert.`);
      router.refresh();
    });
  }

  function handleSaveTemplate() {
    startTransition(async () => {
      const result = await saveGameAsTemplate(game.id);
      if (!result.success) setError(result.error);
      else setMessage("Als Template gespeichert.");
    });
  }

  function handleStartLiveEvent() {
    if (!window.confirm("Live-Event aus dem veröffentlichten Snapshot erstellen?")) return;
    setError(null);
    setLiveLink(null);
    startTransition(async () => {
      const result = await createLiveEventFromGame(game.id);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setLiveLink(result.data!.joinPath);
      setMessage(
        `Live-Event erstellt — Code ${result.data!.inviteCode}. Teams können über /e/${result.data!.inviteCode} beitreten.`,
      );
    });
  }

  return (
    <div className="space-y-8">
      {error ? <GridError message={error} /> : null}
      {message ? (
        <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {message}
        </p>
      ) : null}

      <form onSubmit={handleSaveSettings}>
        <StudioPanel>
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <StudioBadge tone={game.status === "published" ? "live" : "draft"}>{game.status}</StudioBadge>
            <StudioBadge>v{game.published_version_number}</StudioBadge>
            {game.gps_enabled ? <StudioBadge>GPS</StudioBadge> : <StudioBadge>Indoor</StudioBadge>}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <GridLabel>Name</GridLabel>
              <GridInput
                value={game.name}
                onChange={(e) => setGame({ ...game, name: e.target.value })}
                required
              />
            </div>
            <div>
              <GridLabel>Logo URL</GridLabel>
              <GridInput
                value={game.logo_url ?? ""}
                onChange={(e) => setGame({ ...game, logo_url: e.target.value || null })}
                placeholder="https://…"
              />
            </div>
            <div className="md:col-span-2">
              <GridLabel>Beschreibung</GridLabel>
              <textarea
                className="grid-input min-h-20 w-full rounded-xl px-4 py-3 text-sm text-white outline-none"
                value={game.description}
                onChange={(e) => setGame({ ...game, description: e.target.value })}
              />
            </div>
            <div>
              <GridLabel>Sprache</GridLabel>
              <GridSelect
                value={game.language}
                onChange={(e) => setGame({ ...game, language: e.target.value as "de" | "en" })}
              >
                <option value="de">Deutsch</option>
                <option value="en">English</option>
              </GridSelect>
            </div>
            <div>
              <GridLabel>Stadt</GridLabel>
              <GridInput
                value={game.city_slug ?? ""}
                onChange={(e) => setGame({ ...game, city_slug: e.target.value || null })}
                placeholder="berlin"
              />
            </div>
            <div>
              <GridLabel>Dauer (Minuten)</GridLabel>
              <GridInput
                type="number"
                min={1}
                value={game.duration_minutes ?? ""}
                onChange={(e) =>
                  setGame({
                    ...game,
                    duration_minutes: e.target.value ? Number(e.target.value) : null,
                  })
                }
              />
            </div>
            <div>
              <GridLabel>GPS</GridLabel>
              <GridSelect
                value={game.gps_enabled ? "1" : "0"}
                onChange={(e) => setGame({ ...game, gps_enabled: e.target.value === "1" })}
              >
                <option value="1">GPS-gesteuert</option>
                <option value="0">Ohne GPS (Indoor/Digital)</option>
              </GridSelect>
            </div>
            <div className="md:col-span-2">
              <GridLabel>Abschiedstext (Spielende)</GridLabel>
              <textarea
                className="grid-input min-h-16 w-full rounded-xl px-4 py-3 text-sm text-white outline-none"
                value={game.farewell_text}
                onChange={(e) => setGame({ ...game, farewell_text: e.target.value })}
                placeholder="Danke fürs Spielen…"
              />
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <GridButton type="submit" disabled={pending} className="w-auto px-6">
              {pending ? "Speichern…" : "Einstellungen speichern"}
            </GridButton>
            <GridButton
              type="button"
              disabled={pending}
              className="w-auto px-6"
              onClick={handlePublish}
            >
              Version veröffentlichen
            </GridButton>
            <GridButton
              type="button"
              disabled={pending || game.published_version_number < 1}
              className="w-auto px-6"
              onClick={handleStartLiveEvent}
            >
              Live-Event starten
            </GridButton>
            <GridButton
              type="button"
              disabled={pending}
              className="w-auto px-6"
              onClick={handleSaveTemplate}
            >
              Als Template speichern
            </GridButton>
          </div>
          {liveLink ? (
            <p className="mt-4 text-sm">
              <a href={liveLink} className="text-[var(--grid-accent)] underline" target="_blank" rel="noreferrer">
                {liveLink}
              </a>
            </p>
          ) : null}
        </StudioPanel>
      </form>

      <GameFlowPanel
        gameId={game.id}
        language={game.language}
        gpsEnabled={game.gps_enabled}
        citySlug={game.city_slug}
        initialLinks={taskLinks}
        initialRules={game.logic_rules}
        libraryTasks={libraryTasks}
      />
    </div>
  );
}
