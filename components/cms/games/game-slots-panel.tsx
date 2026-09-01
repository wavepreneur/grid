"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  addTaskToGame,
  removeTaskFromGame,
  reorderGameTasksInLayer,
  updateGameTaskLinkConfig,
} from "@/app/actions/cms/games";
import { StudioPanel } from "@/components/cms/admin-shell";
import { StudioModal } from "@/components/cms/shared/studio-modal";
import { useStudioConfirm } from "@/components/cms/shared/studio-confirm";
import {
  IconArrowRight,
  IconPlus,
  IconSave,
  IconTrash,
} from "@/components/cms/studio-icons";
import {
  StudioButton,
  StudioError,
  StudioHint,
  StudioInput,
  StudioLabel,
  StudioSectionTitle,
  StudioSelect,
  StudioSuccess,
} from "@/components/cms/studio-ui";
import { buildGameSlots, type GameSlot } from "@/lib/cms/game-slots";
import {
  groupLinksByLayerOnLink,
  parseLinkLayer,
  parseLinkOverrides,
  parseMissionUnlock,
  roleLabelShort,
  type MissionUnlock,
} from "@/lib/cms/game-link-config";
import { useDebouncedValue, useTaskLibrarySearch, useTaskLibraryTags } from "@/lib/hooks/use-task-library-search";
import { useStudioCache } from "@/lib/platform/studio-cache";
import type { ContentMode, RoleAssignment } from "@/lib/cms/layer-model";
import { contentModeLabel } from "@/lib/cms/layer-model";
import {
  BONUS_WHEN_OPTIONS,
  type BonusAudience,
  type BonusBinding,
  bonusWhenLabel,
} from "@/lib/cms/bonus-bindings";
import {
  DEFAULT_GPS_RADIUS_METERS,
  parseGpsOverride,
  type GpsPin,
} from "@/lib/cms/gps-defaults";
import type { StudioGameTaskLink } from "@/lib/cms/types";

function PoolTagFilters({
  tags,
  selected,
  onSelect,
}: {
  tags: string[];
  selected: string;
  onSelect: (tag: string) => void;
}) {
  if (tags.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      <button
        type="button"
        onClick={() => onSelect("")}
        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
          !selected
            ? "bg-primary text-primary-foreground"
            : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
        }`}
      >
        Alle
      </button>
      {tags.map((tag) => {
        const active = selected === tag;
        return (
          <button
            key={tag}
            type="button"
            onClick={() => onSelect(active ? "" : tag)}
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
              active
                ? "bg-foreground text-background"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            {tag}
          </button>
        );
      })}
    </div>
  );
}

const VISIBLE_ROLE_OPTIONS: Array<{ value: RoleAssignment; label: string }> = [
  { value: "team", label: "Ganzes Team" },
  { value: "alpha", label: "Nur Alpha" },
  { value: "beta", label: "Nur Beta" },
  { value: "gamma", label: "Nur Gamma" },
];

const BONUS_ROLE_OPTIONS: Array<{ value: BonusAudience; label: string; hint: string }> = [
  {
    value: "gamma",
    label: "Nur Gamma",
    hint: "Technisch Gamma — im Spiel erscheint der Anzeigename (z. B. Organizer).",
  },
  {
    value: "alpha",
    label: "Nur Alpha",
    hint: "Technisch Alpha — im Spiel erscheint der Anzeigename (z. B. Team Lead).",
  },
  {
    value: "beta",
    label: "Nur Beta",
    hint: "Technisch Beta — im Spiel erscheint der Anzeigename (z. B. Profiler).",
  },
  {
    value: "team",
    label: "Ganzes Team",
    hint: "Alle Spieler sehen dieselbe Bonusaufgabe mit Team-Intro.",
  },
];

type OutdoorActivation = "immediate" | "gps" | "after_meters" | "after_minutes";

type Props = {
  gameId: string;
  surface: ContentMode;
  routeOrder?: "linear" | "free";
  language?: "de" | "en";
  initialLinks: StudioGameTaskLink[];
};

export function GameSlotsPanel({
  gameId,
  surface,
  routeOrder = "linear",
  initialLinks,
}: Props) {
  const cache = useStudioCache();
  const { confirm } = useStudioConfirm();
  const [links, setLinks] = useState(() => initialLinks);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [editSlot, setEditSlot] = useState<GameSlot | null>(null);
  const [quizEnabled, setQuizEnabled] = useState(false);
  const [openerTaskId, setOpenerTaskId] = useState("");
  const [openerTitle, setOpenerTitle] = useState("");
  const [quizPoints, setQuizPoints] = useState(0);
  const [openerSearch, setOpenerSearch] = useState("");
  const [bonusBindings, setBonusBindings] = useState<BonusBinding[]>([]);
  const [visibleTo, setVisibleTo] = useState<RoleAssignment>("team");
  const [endsGame, setEndsGame] = useState(false);
  const [outdoorActivation, setOutdoorActivation] = useState<OutdoorActivation>("gps");
  const [gpsDraft, setGpsDraft] = useState<GpsPin>({
    lat: 52.52,
    lng: 13.405,
    radius_meters: DEFAULT_GPS_RADIUS_METERS,
  });
  const [delayMeters, setDelayMeters] = useState(100);
  const [delayMinutes, setDelayMinutes] = useState(5);
  const [search, setSearch] = useState("");
  const [poolTag, setPoolTag] = useState("");
  const [openerTag, setOpenerTag] = useState("");
  const [pickedTaskId, setPickedTaskId] = useState("");
  const debounced = useDebouncedValue(search, 200);
  const debouncedOpener = useDebouncedValue(openerSearch, 200);
  const { data: libraryTags = [] } = useTaskLibraryTags();
  const { data: library = [] } = useTaskLibrarySearch(debounced, { tag: poolTag });
  const { data: quizLibrary = [] } = useTaskLibrarySearch(debouncedOpener, {
    quizOnly: true,
    tag: openerTag,
  });

  useEffect(() => {
    setLinks(initialLinks);
    // Sync when the set of link ids changes (add/remove/reorder from server), not on every new array ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional identity via ids
  }, [gameId, initialLinks.map((link) => `${link.id}:${link.sort_order}`).join("|")]);

  const slots = useMemo(() => buildGameSlots(links), [links]);
  const grouped = useMemo(() => groupLinksByLayerOnLink(links), [links]);
  const bonusCandidates = grouped[3];

  const activationHint =
    surface === "outdoor"
      ? "Outdoor: Sofort ab Start (z. B. Briefing), am GPS-Punkt, nach Metern oder nach Wartezeit."
      : surface === "indoor"
        ? "Indoor: Einstiegsfrage erscheint, sobald die Station angetippt wird."
        : "Online: Einstiegsfrage erscheint, wenn die nächste Mission an der Reihe ist.";

  function previousTaskIdFor(slot: GameSlot): string | undefined {
    const prev = slots.find((s) => s.index === slot.index - 1);
    return prev?.levelLink.task_id;
  }

  function outdoorActivationLabel(overrides: ReturnType<typeof parseLinkOverrides>): string {
    const unlock = parseMissionUnlock(overrides);
    const gps = parseGpsOverride(overrides.location ?? overrides.gps);
    if (unlock.type === "after_task_delay" && unlock.meters && unlock.meters > 0) {
      return `nach ${unlock.meters} m`;
    }
    if (
      (unlock.type === "after_task_delay" || unlock.type === "elapsed_minutes") &&
      unlock.minutes &&
      unlock.minutes > 0
    ) {
      return `nach ${unlock.minutes} Min`;
    }
    if (gps) return `GPS ${gps.radius_meters} m`;
    if (unlock.type === "game_start" || unlock.type === "previous") {
      return "sofort";
    }
    return "Aktivierung fehlt";
  }

  function commit(next: StudioGameTaskLink[]) {
    setLinks(next);
    cache.setGameTaskLinks(gameId, next);
  }

  function openQuizEditor(slot: GameSlot) {
    setEditSlot(slot);
    const overrides = parseLinkOverrides(slot.levelLink.overrides);
    const unlock = parseMissionUnlock(overrides);
    setQuizEnabled(Boolean(slot.quiz || slot.openerTaskId));
    setOpenerTaskId(slot.openerTaskId ?? "");
    setOpenerTitle(slot.quiz?.title ?? "");
    setQuizPoints(slot.quiz?.points ?? overrides.opener_points ?? 0);
    setOpenerSearch("");
    setBonusBindings(
      slot.bonusBindings.length > 0
        ? slot.bonusBindings
        : slot.bonusLink
          ? [
              {
                task_id: slot.bonusLink.task_id,
                role: (() => {
                  const r = parseLinkOverrides(slot.bonusLink!.overrides).role;
                  return r === "alpha" || r === "beta" || r === "gamma" || r === "team"
                    ? r
                    : "gamma";
                })(),
                when: { type: "immediate" },
              },
            ]
          : [],
    );
    setVisibleTo(
      overrides.visible_to === "alpha" ||
        overrides.visible_to === "beta" ||
        overrides.visible_to === "gamma" ||
        overrides.visible_to === "team"
        ? overrides.visible_to
        : "team",
    );
    setEndsGame(Boolean(overrides.ends_game));
    const existingGps = parseGpsOverride(overrides.location ?? overrides.gps);
    if (unlock.type === "after_task_delay" && unlock.meters && unlock.meters > 0) {
      setOutdoorActivation("after_meters");
      setDelayMeters(unlock.meters);
    } else if (
      (unlock.type === "after_task_delay" || unlock.type === "elapsed_minutes") &&
      unlock.minutes &&
      unlock.minutes > 0
    ) {
      setOutdoorActivation("after_minutes");
      setDelayMinutes(unlock.minutes);
    } else if (existingGps) {
      setOutdoorActivation("gps");
      setGpsDraft(existingGps);
    } else {
      setOutdoorActivation("immediate");
      setGpsDraft({
        lat: 52.52,
        lng: 13.405,
        radius_meters: DEFAULT_GPS_RADIUS_METERS,
      });
    }
    setError(null);
    setMessage(null);
  }

  function handleAddStop() {
    const pick =
      library.find((t) => t.id === pickedTaskId) ??
      library.find((t) => t.title.toLowerCase().includes(search.trim().toLowerCase())) ??
      null;
    if (!pick) {
      setError("Aufgabe in der Liste auswählen oder suchen.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await addTaskToGame(gameId, pick.id, 2);
      if (!result.success) {
        setError(result.error);
        return;
      }
      const next = [...links, result.data!];
      commit(next);
      setPickedTaskId("");
      setSearch("");
      setMessage(`„${pick.title}“ hinzugefügt.`);
    });
  }

  function handleSaveSlot() {
    if (!editSlot) return;

    if (quizEnabled && !openerTaskId) {
      setError("Bitte eine Quiz-Aufgabe aus dem Pool als Einstiegsfrage wählen — oder ausschalten.");
      return;
    }

    const prevTaskId = previousTaskIdFor(editSlot);
    let unlock: MissionUnlock =
      routeOrder === "free"
        ? { type: "game_start" }
        : editSlot.index === 1
          ? { type: "game_start" }
          : { type: "previous" };
    let location: GpsPin | null = null;

    if (surface === "outdoor") {
      if (outdoorActivation === "immediate") {
        // Kein GPS, keine Zeit/Meter — Freischaltung bleibt game_start / previous.
        location = null;
      } else if (outdoorActivation === "gps") {
        if (!Number.isFinite(gpsDraft.lat) || !Number.isFinite(gpsDraft.lng)) {
          setError("Bitte gültige Latitude und Longitude eintragen.");
          return;
        }
        if (!(gpsDraft.radius_meters > 0)) {
          setError("Radius muss größer als 0 Meter sein.");
          return;
        }
        location = {
          lat: gpsDraft.lat,
          lng: gpsDraft.lng,
          radius_meters: gpsDraft.radius_meters,
        };
      } else if (outdoorActivation === "after_meters") {
        if (!(delayMeters > 0)) {
          setError("Bitte Meter größer als 0 angeben.");
          return;
        }
        unlock = {
          type: "after_task_delay",
          ...(prevTaskId ? { source_task_id: prevTaskId } : {}),
          meters: delayMeters,
        };
      } else if (outdoorActivation === "after_minutes") {
        if (!(delayMinutes > 0)) {
          setError("Bitte Minuten größer als 0 angeben.");
          return;
        }
        if (prevTaskId) {
          unlock = {
            type: "after_task_delay",
            source_task_id: prevTaskId,
            minutes: delayMinutes,
          };
        } else {
          unlock = { type: "elapsed_minutes", minutes: delayMinutes };
        }
      }
    }

    setError(null);
    startTransition(async () => {
      if (bonusBindings.some((b) => !b.task_id.trim())) {
        setError("Bitte für jeden Bonus eine Aufgabe wählen.");
        return;
      }
      const result = await updateGameTaskLinkConfig(gameId, editSlot.levelLink.id, {
        opener_task_id: quizEnabled ? openerTaskId : null,
        opener_points: quizEnabled ? quizPoints : null,
        bonus_bindings: bonusBindings.length > 0 ? bonusBindings : null,
        unlock,
        visible_to: visibleTo,
        ends_game: endsGame,
        ...(surface === "outdoor" ? { location } : {}),
      });
      if (!result.success) {
        setError(result.error);
        return;
      }

      let nextLinks = links.map((l) => {
        if (l.id === result.data!.id) return result.data!;
        if (!endsGame) return l;
        const o = parseLinkOverrides(l.overrides);
        if (!o.ends_game) return l;
        const { ends_game: _removed, ...rest } = o;
        void _removed;
        return { ...l, overrides: rest };
      });

      for (const binding of bonusBindings) {
        if (!binding.task_id.trim()) continue;
        let bonusLink = nextLinks.find(
          (l) => l.task_id === binding.task_id && parseLinkLayer(l) === 3,
        );
        if (!bonusLink) {
          const add = await addTaskToGame(gameId, binding.task_id, 3);
          if (add.success && add.data) {
            bonusLink = add.data;
            nextLinks = [...nextLinks, add.data];
          } else {
            // Already linked (any layer) — compile can still resolve content by task_id.
            bonusLink =
              nextLinks.find((l) => l.task_id === binding.task_id) ?? undefined;
          }
        }
        if (bonusLink) {
          const delaySeconds =
            binding.when.type === "delay_minutes" && binding.when.minutes
              ? Math.round(binding.when.minutes * 60)
              : undefined;
          const bonusUpdate = await updateGameTaskLinkConfig(gameId, bonusLink.id, {
            role: binding.role,
            trigger: {
              type: "after_task_solved",
              source_task_id: editSlot.levelLink.task_id,
              delay_seconds: delaySeconds,
            },
          });
          if (bonusUpdate.success && bonusUpdate.data) {
            nextLinks = nextLinks.map((l) =>
              l.id === bonusUpdate.data!.id ? bonusUpdate.data! : l,
            );
          }
        }
      }

      commit(nextLinks);
      setMessage("Aufgabe gespeichert.");
      setEditSlot(null);
    });
  }

  function handleRemoveStop(slot: GameSlot) {
    void (async () => {
      const ok = await confirm({
        title: "Stop entfernen?",
        description: `„${slot.levelLink.task.title}“ wird aus diesem Spiel entfernt.`,
        confirmLabel: "Entfernen",
        cancelLabel: "Abbrechen",
        tone: "danger",
      });
      if (!ok) return;
      startTransition(async () => {
        const result = await removeTaskFromGame(slot.levelLink.id, gameId);
        if (!result.success) {
          setError(result.error);
          return;
        }
        commit(links.filter((l) => l.id !== slot.levelLink.id));
      });
    })();
  }

  function moveStop(slot: GameSlot, dir: -1 | 1) {
    const missionIds = slots.map((s) => s.levelLink.id);
    const idx = missionIds.indexOf(slot.levelLink.id);
    const swap = idx + dir;
    if (swap < 0 || swap >= missionIds.length) return;
    const next = [...missionIds];
    const tmp = next[idx]!;
    next[idx] = next[swap]!;
    next[swap] = tmp;
    startTransition(async () => {
      const result = await reorderGameTasksInLayer(gameId, 2, next);
      if (!result.success) {
        setError(result.error);
        return;
      }
      const byId = new Map(links.map((l) => [l.id, l]));
      const reordered = next
        .map((id, i) => {
          const link = byId.get(id);
          return link ? { ...link, sort_order: i } : null;
        })
        .filter(Boolean) as StudioGameTaskLink[];
      const others = links.filter((l) => parseLinkLayer(l) !== 2);
      commit([...reordered, ...others]);
    });
  }

  return (
    <StudioPanel>
      <StudioSectionTitle
        title="3 · Aufgaben"
        description={`Aufgaben aus dem Pool zuweisen und Reihenfolge festlegen. Surface: ${contentModeLabel(surface)}.`}
      />

      <StudioHint tone="info">{activationHint}</StudioHint>

      {error ? <StudioError message={error} /> : null}
      {message ? <StudioSuccess message={message} /> : null}

      <div className="mt-4 space-y-3">
        {slots.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-center">
            <p className="text-sm font-medium text-slate-700">Noch keine Aufgaben</p>
            <p className="mt-1 text-xs text-slate-500">
              Wähle unten eine Aufgabe aus dem Pool und füge sie hinzu.
            </p>
          </div>
        ) : (
          slots.map((slot) => {
            const overrides = parseLinkOverrides(slot.levelLink.overrides);
            const bonusOverrides = slot.bonusLink
              ? parseLinkOverrides(slot.bonusLink.overrides)
              : null;
            const visible =
              overrides.visible_to === "alpha" ||
              overrides.visible_to === "beta" ||
              overrides.visible_to === "gamma"
                ? overrides.visible_to
                : "team";
            const meta = [
              slot.quiz
                ? `Schlüssel: ${slot.quiz.title ?? "Einstiegsfrage"}${
                    slot.quiz.points ? ` · ${slot.quiz.points} P` : ""
                  }`
                : "Ohne Einstiegsfrage",
              slot.bonusLink
                ? `Bonus: ${slot.bonusLink.task.title}${
                    bonusOverrides?.role ? ` (${roleLabelShort(bonusOverrides.role)})` : ""
                  }`
                : "Ohne Bonus",
              surface === "outdoor" ? outdoorActivationLabel(overrides) : null,
              routeOrder === "free" ? "Frei" : "Linear",
              visible === "team" ? "Alle" : roleLabelShort(visible),
              overrides.ends_game ? "Abschluss" : null,
            ]
              .filter((part): part is string => Boolean(part))
              .join(" · ");
            return (
              <div
                key={slot.levelLink.id}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">
                      #{slot.index}
                    </p>
                    <h3 className="mt-1 truncate text-base font-semibold text-slate-900">
                      {slot.levelLink.task.title}
                    </h3>
                    <p className="mt-1 truncate text-xs text-slate-500" title={meta}>
                      {meta}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-nowrap gap-2">
                    <StudioButton
                      type="button"
                      variant="ghost"
                      disabled={pending || slot.index === 1}
                      onClick={() => moveStop(slot, -1)}
                    >
                      ↑
                    </StudioButton>
                    <StudioButton
                      type="button"
                      variant="ghost"
                      disabled={pending || slot.index === slots.length}
                      onClick={() => moveStop(slot, 1)}
                    >
                      ↓
                    </StudioButton>
                    <StudioButton
                      type="button"
                      variant="secondary"
                      onClick={() => openQuizEditor(slot)}
                    >
                      Bedingungen
                    </StudioButton>
                    <Link
                      href={`/admin/tasks/${slot.levelLink.task_id}?returnTo=/admin/games/${gameId}`}
                      className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-teal-700 hover:bg-teal-50"
                    >
                      Aufgabe <IconArrowRight size={14} />
                    </Link>
                    <StudioButton
                      type="button"
                      variant="ghost"
                      disabled={pending}
                      onClick={() => handleRemoveStop(slot)}
                      icon={<IconTrash size={14} />}
                    >
                      Entfernen
                    </StudioButton>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="mt-5 space-y-3">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <div>
            <StudioLabel>Aufgabe aus dem Pool</StudioLabel>
            <StudioInput
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPickedTaskId("");
              }}
              placeholder="Suchen…"
            />
          </div>
          <div className="flex items-end">
            <StudioButton
              type="button"
              disabled={pending || (!pickedTaskId && library.length === 0)}
              onClick={handleAddStop}
              icon={<IconPlus size={16} />}
            >
              Hinzufügen
            </StudioButton>
          </div>
        </div>

        <PoolTagFilters
          tags={libraryTags}
          selected={poolTag}
          onSelect={(tag) => {
            setPoolTag(tag);
            setPickedTaskId("");
          }}
        />

        {library.length > 0 ? (
          <div className="max-h-56 space-y-1 overflow-y-auto rounded-2xl border border-border p-2">
            {library.slice(0, 24).map((task) => {
              const selected = pickedTaskId === task.id;
              return (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => setPickedTaskId(task.id)}
                  className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm ${
                    selected
                      ? "bg-primary/15 font-semibold text-foreground"
                      : "hover:bg-secondary"
                  }`}
                >
                  <span className="min-w-0 flex-1 truncate">{task.title}</span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    {task.tags.slice(0, 2).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                    {selected ? <span className="text-xs text-primary">gewählt</span> : null}
                  </span>
                </button>
              );
            })}
          </div>
        ) : search.trim() || poolTag ? (
          <p className="text-xs text-muted-foreground">
            Keine Treffer — anderes Schlagwort wählen oder Aufgabe zuerst im Pool anlegen.
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Schlagwort tippen oder suchen, um aus dem Pool zu wählen.
          </p>
        )}
      </div>


      {editSlot ? (
        <StudioModal
          open
          onClose={() => setEditSlot(null)}
          title={`Aufgabe ${editSlot.index}: Bedingungen`}
        >
          <div className="space-y-5">
            <p className="text-sm text-slate-600">
              <strong>{editSlot.levelLink.task.title}</strong>
            </p>

            <section className="rounded-3xl bg-secondary/60 p-4">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 accent-primary"
                  checked={quizEnabled}
                  onChange={(e) => {
                    setQuizEnabled(e.target.checked);
                    if (!e.target.checked) {
                      setOpenerTaskId("");
                      setOpenerTitle("");
                    }
                  }}
                />
                <span>
                  <span className="block text-base font-bold">Einstiegsfrage (Schlüssel)</span>
                  <span className="mt-0.5 block text-sm text-muted-foreground">
                    {activationHint} Inhalt kommt aus einer Quiz-Aufgabe im Pool (Titel, Bild,
                    Beschreibung, MCQ, Side-Fact unter „Nach der Lösung“).
                  </span>
                </span>
              </label>

              {quizEnabled ? (
                <div className="mt-4 space-y-4">
                  {openerTaskId ? (
                    <div className="rounded-2xl border border-border bg-card px-4 py-3">
                      <p className="text-sm font-semibold text-foreground">
                        {openerTitle || "Quiz-Aufgabe gewählt"}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Link
                          href={`/admin/tasks/${openerTaskId}?returnTo=/admin/games/${gameId}`}
                          className="text-sm font-medium text-teal-700 underline-offset-2 hover:underline"
                        >
                          Im Pool bearbeiten
                        </Link>
                        <button
                          type="button"
                          className="text-sm text-muted-foreground underline-offset-2 hover:underline"
                          onClick={() => {
                            setOpenerTaskId("");
                            setOpenerTitle("");
                          }}
                        >
                          Andere wählen
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <StudioLabel>Quiz-Aufgabe aus dem Pool</StudioLabel>
                      <StudioInput
                        value={openerSearch}
                        onChange={(e) => setOpenerSearch(e.target.value)}
                        placeholder="Suchen (nur Multiple Choice)…"
                      />
                      <PoolTagFilters
                        tags={libraryTags}
                        selected={openerTag}
                        onSelect={setOpenerTag}
                      />
                      <div className="max-h-44 space-y-1 overflow-y-auto rounded-2xl border border-border bg-card p-2">
                        {quizLibrary.length === 0 ? (
                          <p className="px-2 py-3 text-xs text-muted-foreground">
                            Keine Quiz-Aufgabe gefunden. Lege im Pool eine Aufgabe mit Antworttyp
                            „Auswahl“ an (Titel, Bild, Beschreibung, Side-Fact).
                          </p>
                        ) : (
                          quizLibrary.map((task) => (
                            <button
                              key={task.id}
                              type="button"
                              onClick={() => {
                                setOpenerTaskId(task.id);
                                setOpenerTitle(task.title);
                              }}
                              className="flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-secondary"
                            >
                              <span className="min-w-0 flex-1 truncate font-medium">
                                {task.title}
                              </span>
                              <span className="flex shrink-0 items-center gap-1.5">
                                {task.tags.slice(0, 1).map((tag) => (
                                  <span
                                    key={tag}
                                    className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground"
                                  >
                                    {tag}
                                  </span>
                                ))}
                                <span className="text-xs text-muted-foreground">
                                  {task.answer_type === "multi_choice" ? "Mehrfach" : "MC"}
                                </span>
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  <div className="max-w-xs">
                    <StudioLabel hint="0 = nur Schlüssel, keine Extra-Punkte">
                      Punkte bei richtiger Antwort
                    </StudioLabel>
                    <StudioInput
                      type="number"
                      min={0}
                      value={quizPoints}
                      onChange={(e) => setQuizPoints(Math.max(0, Number(e.target.value) || 0))}
                    />
                  </div>
                </div>
              ) : null}
            </section>

            {surface === "outdoor" ? (
              <section className="space-y-3 rounded-3xl bg-secondary/60 p-4">
                <div>
                  <p className="text-base font-bold">Wann startet die Aufgabe?</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Sofort (z. B. Briefing), fester Wegpunkt, Meter oder Wartezeit. Die
                    Spiel-Reihenfolge (linear/frei) stellst du unter Spieldaten ein.
                  </p>
                </div>

                <div className="grid gap-2">
                  {(
                    [
                      {
                        value: "immediate" as const,
                        label:
                          editSlot.index === 1
                            ? "Sofort ab Spielstart"
                            : "Sofort nach vorheriger Aufgabe",
                        hint:
                          editSlot.index === 1
                            ? "Ohne GPS, Meter oder Wartezeit — ideal für Briefing vor der Karte"
                            : "Direkt nach der vorherigen Lösung, ohne zusätzliche Wartezeit",
                      },
                      {
                        value: "gps" as const,
                        label: "Fester GPS-Punkt",
                        hint: "Startet im Radius um Lat/Lng",
                      },
                      {
                        value: "after_meters" as const,
                        label: editSlot.index === 1
                          ? "Nach Spielstart + Meter"
                          : "Nach vorheriger Aufgabe + Meter",
                        hint:
                          editSlot.index === 1
                            ? "Sobald das Team X Meter seit Spielstart gelaufen ist"
                            : "Sobald das Team X Meter seit der vorherigen Lösung gelaufen ist",
                      },
                      {
                        value: "after_minutes" as const,
                        label: editSlot.index === 1
                          ? "Nach Spielstart + Minuten"
                          : "Nach vorheriger Aufgabe + Minuten",
                        hint:
                          editSlot.index === 1
                            ? "Sobald X Minuten seit Spielstart vergangen sind"
                            : "Sobald X Minuten seit der vorherigen Lösung vergangen sind",
                      },
                    ] as const
                  ).map((opt) => {
                    const active = outdoorActivation === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setOutdoorActivation(opt.value)}
                        className={`rounded-2xl border px-3 py-3 text-left text-sm transition ${
                          active
                            ? "border-primary bg-primary/10 font-semibold"
                            : "border-border hover:border-primary/40"
                        }`}
                      >
                        <span className="block">{opt.label}</span>
                        <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                          {opt.hint}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {outdoorActivation === "gps" ? (
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <StudioLabel>Latitude</StudioLabel>
                      <StudioInput
                        type="number"
                        step="any"
                        value={gpsDraft.lat}
                        onChange={(e) =>
                          setGpsDraft((g) => ({ ...g, lat: Number(e.target.value) }))
                        }
                      />
                    </div>
                    <div>
                      <StudioLabel>Longitude</StudioLabel>
                      <StudioInput
                        type="number"
                        step="any"
                        value={gpsDraft.lng}
                        onChange={(e) =>
                          setGpsDraft((g) => ({ ...g, lng: Number(e.target.value) }))
                        }
                      />
                    </div>
                    <div>
                      <StudioLabel>Radius (m)</StudioLabel>
                      <StudioInput
                        type="number"
                        min={1}
                        value={gpsDraft.radius_meters}
                        onChange={(e) =>
                          setGpsDraft((g) => ({
                            ...g,
                            radius_meters: Math.max(1, Number(e.target.value) || 1),
                          }))
                        }
                      />
                      <p className="mt-1 text-xs text-muted-foreground">
                        Empfohlen ≥ 40 m. Runtime nutzt mindestens 25 m + GPS-Genauigkeit.
                      </p>
                    </div>
                  </div>
                ) : null}

                {outdoorActivation === "after_meters" ? (
                  <div className="max-w-xs">
                    <StudioLabel
                      hint={
                        editSlot.index === 1
                          ? "Gemessen ab Spielstart"
                          : "Gemessen ab gelöster vorheriger Aufgabe"
                      }
                    >
                      Meter bis Aktivierung
                    </StudioLabel>
                    <StudioInput
                      type="number"
                      min={1}
                      value={delayMeters}
                      onChange={(e) =>
                        setDelayMeters(Math.max(1, Number(e.target.value) || 1))
                      }
                    />
                  </div>
                ) : null}

                {outdoorActivation === "after_minutes" ? (
                  <div className="max-w-xs">
                    <StudioLabel
                      hint={
                        editSlot.index === 1
                          ? "Ab Spielstart"
                          : "Ab gelöster vorheriger Aufgabe"
                      }
                    >
                      Minuten bis Aktivierung
                    </StudioLabel>
                    <StudioInput
                      type="number"
                      min={1}
                      value={delayMinutes}
                      onChange={(e) =>
                        setDelayMinutes(Math.max(1, Number(e.target.value) || 1))
                      }
                    />
                  </div>
                ) : null}
              </section>
            ) : (
              <section className="space-y-2 rounded-3xl bg-secondary/60 p-4">
                <p className="text-base font-bold">Freischaltung</p>
                <p className="text-sm text-muted-foreground">
                  {routeOrder === "free"
                    ? "Spielmodus „Freie Reihenfolge“: Alle Aufgaben sind ab Spielstart offen."
                    : "Spielmodus „Linear“: Aufgaben nacheinander. Die erste ist ab Start verfügbar."}
                </p>
              </section>
            )}

            <div>
              <StudioLabel>Sichtbar für</StudioLabel>
              <StudioSelect
                value={visibleTo}
                onChange={(e) => setVisibleTo(e.target.value as RoleAssignment)}
              >
                {VISIBLE_ROLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </StudioSelect>
            </div>

            <section className="space-y-2 rounded-3xl bg-secondary/60 p-4">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-border"
                  checked={endsGame}
                  onChange={(e) => setEndsGame(e.target.checked)}
                />
                <span>
                  <span className="block text-base font-bold">Abschlussaufgabe</span>
                  <span className="mt-0.5 block text-sm text-muted-foreground">
                    Nach dem Lösen endet das Spiel — Punkte, Ranking und Game Over. Weitere Stops
                    danach werden übersprungen. Ideal für die Verabschiedung; Outdoor am besten mit
                    „Sofort nach vorheriger Aufgabe“.
                  </span>
                </span>
              </label>
            </section>

            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <StudioLabel hint="Überraschungen — nicht der nächste Missions-Schritt">
                    Bonusaufgaben (Layer 3)
                  </StudioLabel>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Mehrere möglich: Sofort, +Minuten, +Meter, parallel je Rolle. Erscheinen mit
                    Fanfare.
                  </p>
                </div>
                <StudioButton
                  type="button"
                  variant="ghost"
                  onClick={() =>
                    setBonusBindings((prev) => [
                      ...prev,
                      {
                        task_id: bonusCandidates[0]?.task_id ?? library[0]?.id ?? "",
                        role: "team",
                        when: { type: "immediate" },
                      },
                    ])
                  }
                >
                  + Bonus
                </StudioButton>
              </div>

              {bonusBindings.some((b) => b.role !== "team") ? (
                <StudioHint tone="warn">
                  Rollen-Bonus (nur Alpha/Beta/Gamma): Bei Solo-Teams oder wenn die Rolle im
                  Team fehlt, erscheint dieser Bonus für niemanden. Für Tests oft „Ganzes Team“
                  oder die Rolle wählen, die wirklich mitspielt.
                </StudioHint>
              ) : null}

              {bonusBindings.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
                  Kein Bonus — Mission endet nach dem Lösen ohne Extra-Punkte-Überraschung.
                </p>
              ) : (
                <ul className="space-y-3">
                  {bonusBindings.map((binding, index) => (
                    <li
                      key={`${binding.task_id}-${index}`}
                      className="space-y-3 rounded-2xl border border-border bg-muted/30 px-3 py-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Bonus {index + 1}
                        </span>
                        <button
                          type="button"
                          className="text-xs font-semibold text-red-600"
                          onClick={() =>
                            setBonusBindings((prev) => prev.filter((_, i) => i !== index))
                          }
                        >
                          Entfernen
                        </button>
                      </div>

                      <div>
                        <StudioLabel>Inhalt</StudioLabel>
                        <StudioSelect
                          value={binding.task_id}
                          onChange={(e) => {
                            const task_id = e.target.value;
                            setBonusBindings((prev) =>
                              prev.map((b, i) => (i === index ? { ...b, task_id } : b)),
                            );
                          }}
                        >
                          <option value="">Aufgabe wählen…</option>
                          {bonusCandidates.map((b) => (
                            <option key={b.task_id} value={b.task_id}>
                              {b.task.title}
                            </option>
                          ))}
                          {library
                            .filter((t) => !bonusCandidates.some((b) => b.task_id === t.id))
                            .map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.title} (Pool)
                              </option>
                            ))}
                        </StudioSelect>
                      </div>

                      <div>
                        <StudioLabel>Wer?</StudioLabel>
                        <div className="mt-2 grid gap-2 sm:grid-cols-2">
                          {BONUS_ROLE_OPTIONS.map((opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() =>
                                setBonusBindings((prev) =>
                                  prev.map((b, i) =>
                                    i === index ? { ...b, role: opt.value } : b,
                                  ),
                                )
                              }
                              className={`rounded-2xl border px-3 py-2 text-left text-sm ${
                                binding.role === opt.value
                                  ? "border-primary bg-primary/10 font-semibold"
                                  : "border-border"
                              }`}
                            >
                              <span className="block font-medium">{opt.label}</span>
                              <span className="text-xs text-muted-foreground">{opt.hint}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <StudioLabel>Wann?</StudioLabel>
                        <div className="mt-2 grid gap-2">
                          {BONUS_WHEN_OPTIONS.map((opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() =>
                                setBonusBindings((prev) =>
                                  prev.map((b, i) =>
                                    i === index
                                      ? {
                                          ...b,
                                          when: {
                                            type: opt.value,
                                            minutes:
                                              opt.value === "delay_minutes" ||
                                              opt.value === "game_minutes" ||
                                              opt.value === "interval_minutes"
                                                ? b.when.minutes ?? 5
                                                : undefined,
                                            meters:
                                              opt.value === "delay_meters"
                                                ? b.when.meters ?? 20
                                                : undefined,
                                          },
                                        }
                                      : b,
                                  ),
                                )
                              }
                              className={`rounded-2xl border px-3 py-2 text-left text-sm ${
                                binding.when.type === opt.value
                                  ? "border-primary bg-primary/10 font-semibold"
                                  : "border-border"
                              }`}
                            >
                              <span className="block font-medium">{opt.label}</span>
                              <span className="text-xs text-muted-foreground">{opt.hint}</span>
                            </button>
                          ))}
                        </div>
                        {binding.when.type === "delay_minutes" ||
                        binding.when.type === "game_minutes" ||
                        binding.when.type === "interval_minutes" ? (
                          <div className="mt-2">
                            <StudioLabel>Minuten</StudioLabel>
                            <StudioInput
                              type="number"
                              min={1}
                              value={binding.when.minutes ?? 5}
                              onChange={(e) => {
                                const minutes = Math.max(1, Number(e.target.value) || 1);
                                setBonusBindings((prev) =>
                                  prev.map((b, i) =>
                                    i === index
                                      ? { ...b, when: { ...b.when, minutes } }
                                      : b,
                                  ),
                                );
                              }}
                            />
                          </div>
                        ) : null}
                        {binding.when.type === "delay_meters" ? (
                          <div className="mt-2">
                            <StudioLabel>Meter</StudioLabel>
                            <StudioInput
                              type="number"
                              min={1}
                              value={binding.when.meters ?? 20}
                              onChange={(e) => {
                                const meters = Math.max(1, Number(e.target.value) || 1);
                                setBonusBindings((prev) =>
                                  prev.map((b, i) =>
                                    i === index
                                      ? { ...b, when: { ...b.when, meters } }
                                      : b,
                                  ),
                                );
                              }}
                            />
                          </div>
                        ) : null}
                        <p className="mt-2 text-xs text-muted-foreground">
                          {bonusWhenLabel(binding.when)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {error ? <StudioError message={error} /> : null}

            <div className="flex flex-wrap gap-2 pt-2">
              <StudioButton
                type="button"
                disabled={pending}
                onClick={handleSaveSlot}
                icon={<IconSave size={16} />}
              >
                Speichern
              </StudioButton>
              <StudioButton type="button" variant="ghost" onClick={() => setEditSlot(null)}>
                Abbrechen
              </StudioButton>
            </div>
          </div>
        </StudioModal>
      ) : null}
    </StudioPanel>
  );
}
