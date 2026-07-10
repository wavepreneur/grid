"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  addTaskToGame,
  removeTaskFromGame,
  reorderGameTasksInLayer,
} from "@/app/actions/cms/games";
import { updateGameLogicRules } from "@/app/actions/cms/logic";
import { groupLinksByLayerOnLink } from "@/lib/cms/game-link-config";
import {
  buildFlowRules,
  findEndGameTaskId,
  parseLogicRules,
} from "@/lib/cms/logic-rules";
import { isLayerActive, LAYER_DEFINITIONS, type StudioLayer } from "@/lib/cms/layer-model";
import { StudioPanel } from "@/components/cms/admin-shell";
import { GameLayerColumn, GameTaskLibrarySidebar } from "@/components/cms/games/game-layer-columns";
import { GameLogicFlowModal } from "@/components/cms/games/game-logic-flow-modal";
import { TaskLinkModal } from "@/components/cms/games/task-link-modal";
import { defaultMapCenter } from "@/lib/cms/gps-defaults";
import { parseGpsOverride } from "@/lib/cms/gps-defaults";
import {
  StudioButton,
  StudioError,
  StudioHint,
  StudioSectionTitle,
  StudioSuccess,
} from "@/components/cms/studio-ui";
import type { StudioGameTaskLink, StudioTask } from "@/lib/cms/types";

type Props = {
  gameId: string;
  language: "de" | "en";
  gpsEnabled: boolean;
  citySlug?: string | null;
  activeLayers: StudioLayer[];
  initialLinks: StudioGameTaskLink[];
  initialRules: unknown[];
  libraryTasks: StudioTask[];
};

export function GameLogicPanel({
  gameId,
  language,
  gpsEnabled,
  citySlug,
  activeLayers,
  initialLinks,
  initialRules,
  libraryTasks,
}: Props) {
  const router = useRouter();
  const [links, setLinks] = useState(() => sortLinks(initialLinks));
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [selectedLink, setSelectedLink] = useState<StudioGameTaskLink | null>(null);
  const [flowOpen, setFlowOpen] = useState(false);
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [focusedLayer, setFocusedLayer] = useState<StudioLayer>(2);

  const mapDefault = useMemo(() => defaultMapCenter(citySlug), [citySlug]);
  const visibleLayers = useMemo(
    () => ([1, 2, 3] as StudioLayer[]).filter((l) => isLayerActive(l, activeLayers)),
    [activeLayers],
  );
  const grouped = useMemo(() => groupLinksByLayerOnLink(links), [links]);
  const assignedIds = useMemo(() => new Set(links.map((l) => l.task_id)), [links]);

  const libraryFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return libraryTasks.filter((task) => {
      if (!q) return true;
      return (
        task.title.toLowerCase().includes(q) ||
        task.slug.includes(q) ||
        task.description.toLowerCase().includes(q)
      );
    });
  }, [libraryTasks, search]);

  useEffect(() => {
    setLinks(sortLinks(initialLinks));
  }, [initialLinks]);

  useEffect(() => {
    setFocusedLayer((current) =>
      visibleLayers.includes(current) ? current : (visibleLayers[0] ?? 2),
    );
  }, [visibleLayers]);

  const saveMissionFlow = useCallback(
    async (nextLinks: StudioGameTaskLink[]) => {
      const missionLinks = groupLinksByLayerOnLink(nextLinks)[2];
      const rules = buildFlowRules("linear", missionLinks, {
        endTaskId: findEndGameTaskId(parseLogicRules(initialRules)),
      });
      const result = await updateGameLogicRules(gameId, rules);
      if (!result.success) {
        setError(result.error);
        return false;
      }
      return true;
    },
    [gameId, initialRules],
  );

  function addTask(taskId: string, layer: StudioLayer) {
    if (assignedIds.has(taskId)) {
      setError("Diese Aufgabe ist bereits in diesem Spiel.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await addTaskToGame(gameId, taskId, layer);
      if (!result.success) {
        setError(result.error);
        return;
      }
      const next = sortLinks([...links, result.data!]);
      setLinks(next);
      if (layer === 2) await saveMissionFlow(next);
      setMessage(`Aufgabe zu ${LAYER_DEFINITIONS[layer].shortDe} hinzugefügt.`);
      setDraggingTaskId(null);
      router.refresh();
    });
  }

  function handleRemove(linkId: string) {
    setError(null);
    startTransition(async () => {
      const result = await removeTaskFromGame(linkId, gameId);
      if (!result.success) {
        setError(result.error);
        return;
      }
      const next = links.filter((l) => l.id !== linkId);
      setLinks(next);
      setSelectedLink(null);
      await saveMissionFlow(next);
      router.refresh();
    });
  }

  function handleSaveAll() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const ok = await saveMissionFlow(links);
      if (ok) {
        setMessage("Spiel-Logik gespeichert.");
        router.refresh();
      }
    });
  }

  function handleReorderLayer(layer: StudioLayer, fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex) return;
    const layerLinks = [...grouped[layer]];
    const [moved] = layerLinks.splice(fromIndex, 1);
    layerLinks.splice(toIndex, 0, moved);
    const reordered = layerLinks.map((l, i) => ({ ...l, sort_order: i }));
    const other = links.filter((l) => l.layer !== layer);
    const next = sortLinks([...other, ...reordered]);
    setLinks(next);
    startTransition(async () => {
      const result = await reorderGameTasksInLayer(
        gameId,
        layer,
        reordered.map((l) => l.id),
      );
      if (!result.success) {
        setError(result.error);
        return;
      }
      if (layer === 2) await saveMissionFlow(next);
      setMessage(
        layer === 2
          ? "Reihenfolge gespeichert."
          : "Reihenfolge in der Spalte gespeichert.",
      );
      router.refresh();
    });
  }

  function getLinkGps(link: StudioGameTaskLink) {
    return parseGpsOverride(link.overrides?.location ?? link.overrides?.gps);
  }

  const selectedIndex =
    selectedLink && selectedLink.layer
      ? grouped[selectedLink.layer]?.findIndex((l) => l.id === selectedLink.id) ?? -1
      : -1;

  return (
    <div className="space-y-4">
      <StudioPanel>
        <StudioSectionTitle
          title="Spiel-Logik"
          description="Ziehe Aufgaben aus der Bibliothek in die Layer-Spalten. Layer-spezifische Einstellungen (GPS, Reihenfolge, Rollen) pro Aufgabe."
        />
        <StudioHint tone="info">
          Aufgaben in der Bibliothek sind spielneutral — die Layer-Zuordnung passiert erst hier im Spiel.
        </StudioHint>

        {error ? (
          <div className="mt-4">
            <StudioError message={error} />
          </div>
        ) : null}
        {message ? (
          <div className="mt-4">
            <StudioSuccess message={message} />
          </div>
        ) : null}

        <div className="mt-6 grid gap-4 xl:grid-cols-[1fr_280px]">
          <div
            className="grid gap-4"
            style={{
              gridTemplateColumns: `repeat(${Math.min(visibleLayers.length, 3)}, minmax(0, 1fr))`,
            }}
          >
            {visibleLayers.map((layer) => (
              <GameLayerColumn
                key={layer}
                layer={layer}
                links={grouped[layer]}
                allLinks={links}
                pending={pending}
                draggingTaskId={draggingTaskId}
                focused={focusedLayer === layer}
                onFocus={() => setFocusedLayer(layer)}
                selectedLinkId={selectedLink?.id}
                onSelectLink={setSelectedLink}
                onRemove={handleRemove}
                onDropTask={(taskId) => addTask(taskId, layer)}
                onReorder={(from, to) => handleReorderLayer(layer, from, to)}
              />
            ))}
          </div>

          <GameTaskLibrarySidebar
            tasks={libraryFiltered}
            search={search}
            onSearchChange={setSearch}
            pending={pending}
            assignedIds={assignedIds}
            focusedLayerLabel={LAYER_DEFINITIONS[focusedLayer].shortDe}
            onAddTask={(taskId) => addTask(taskId, focusedLayer)}
            onDragTaskStart={setDraggingTaskId}
            onDragTaskEnd={() => setDraggingTaskId(null)}
          />
        </div>

        <div className="mt-6 flex flex-wrap gap-3 border-t border-slate-100 pt-6">
          <StudioButton type="button" disabled={pending} onClick={handleSaveAll}>
            {pending ? "Speichern…" : "Spiel-Logik speichern"}
          </StudioButton>
          <StudioButton
            type="button"
            variant="secondary"
            disabled={links.length === 0}
            onClick={() => setFlowOpen(true)}
          >
            Logik-Vorschau
          </StudioButton>
          <Link
            href="/admin/tasks"
            className="inline-flex items-center text-sm font-medium text-teal-600 hover:text-teal-700"
          >
            Aufgaben-Bibliothek öffnen →
          </Link>
        </div>
      </StudioPanel>

      <TaskLinkModal
        open={selectedLink !== null}
        link={selectedLink}
        index={selectedIndex}
        layer={selectedLink?.layer ?? 2}
        language={language}
        gpsEnabled={gpsEnabled && (selectedLink?.layer ?? 0) === 1}
        gameId={gameId}
        mapDefault={mapDefault}
        missionLinks={grouped[2]}
        allLinks={links}
        getLinkGps={getLinkGps}
        returnTo={encodeURIComponent(`/admin/games/${gameId}`)}
        pending={pending}
        onClose={() => setSelectedLink(null)}
        onUpdated={(link) => {
          setLinks((prev) => prev.map((l) => (l.id === link.id ? link : l)));
          setSelectedLink(link);
        }}
        onRemove={() => selectedLink && handleRemove(selectedLink.id)}
      />

      <GameLogicFlowModal
        open={flowOpen}
        onClose={() => setFlowOpen(false)}
        links={links}
        activeLayers={visibleLayers}
      />
    </div>
  );
}

function sortLinks(links: StudioGameTaskLink[]): StudioGameTaskLink[] {
  return [...links].sort((a, b) => {
    if (a.layer !== b.layer) return a.layer - b.layer;
    return a.sort_order - b.sort_order;
  });
}
