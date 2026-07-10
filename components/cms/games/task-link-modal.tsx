"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { updateGameTaskLinkConfig } from "@/app/actions/cms/games";
import {
  BONUS_TRIGGER_OPTIONS,
  parseBonusTrigger,
  parseLinkOverrides,
  type BonusTrigger,
  type BonusTriggerType,
} from "@/lib/cms/game-link-config";
import type { StudioLayer } from "@/lib/cms/layer-model";
import { ROLE_ASSIGNMENTS, roleAssignmentLabel, type RoleAssignment } from "@/lib/cms/layer-model";
import type { GpsPin } from "@/lib/cms/gps-defaults";
import { GpsWaypointPicker } from "@/components/cms/gps/gps-waypoint-picker";
import { StudioModal } from "@/components/cms/shared/studio-modal";
import { TaskTilePreview } from "@/components/cms/tasks/task-tile-preview";
import { IconEdit, IconMapPin, IconSave, IconTrash } from "@/components/cms/studio-icons";
import {
  StudioButton,
  StudioError,
  StudioInput,
  StudioLabel,
  StudioSelect,
  StudioSuccess,
} from "@/components/cms/studio-ui";
import type { StudioGameTaskLink } from "@/lib/cms/types";

type Props = {
  open: boolean;
  link: StudioGameTaskLink | null;
  index: number;
  layer: StudioLayer;
  language: "de" | "en";
  gpsEnabled: boolean;
  gameId: string;
  mapDefault: GpsPin;
  missionLinks: StudioGameTaskLink[];
  allLinks: StudioGameTaskLink[];
  getLinkGps: (link: StudioGameTaskLink) => GpsPin | null;
  returnTo: string;
  pending: boolean;
  onClose: () => void;
  onUpdated: (link: StudioGameTaskLink) => void;
  onRemove: () => void;
};

export function TaskLinkModal({
  open,
  link,
  index,
  layer,
  gpsEnabled,
  gameId,
  mapDefault,
  missionLinks,
  allLinks,
  getLinkGps,
  returnTo,
  pending,
  onClose,
  onUpdated,
  onRemove,
}: Props) {
  const router = useRouter();
  const [gpsDraft, setGpsDraft] = useState<GpsPin | null>(null);
  const [role, setRole] = useState<RoleAssignment>("team");
  const [triggerType, setTriggerType] = useState<BonusTriggerType>("game_start");
  const [triggerPoints, setTriggerPoints] = useState(100);
  const [triggerMinutes, setTriggerMinutes] = useState(10);
  const [triggerSourceTaskId, setTriggerSourceTaskId] = useState("");
  const [triggerDelaySeconds, setTriggerDelaySeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, startTransition] = useTransition();

  const currentGps = link ? getLinkGps(link) : null;
  const draft = gpsDraft ?? currentGps ?? mapDefault;
  const layerLabel =
    layer === 1 ? "Geo / Wegpunkt" : layer === 3 ? "Bonus / Rolle" : "Mission";

  useEffect(() => {
    if (!open || !link) return;
    setGpsDraft(null);
    setError(null);
    setMessage(null);
    const overrides = parseLinkOverrides(link.overrides);
    setRole(overrides.role ?? "team");
    const trigger = parseBonusTrigger(overrides);
    setTriggerType(trigger.type);
    setTriggerPoints(trigger.points ?? 100);
    setTriggerMinutes(trigger.minutes ?? 10);
    setTriggerSourceTaskId(trigger.source_task_id ?? "");
    setTriggerDelaySeconds(trigger.delay_seconds ?? 0);
  }, [open, link?.id]);

  function buildTrigger(): BonusTrigger {
    switch (triggerType) {
      case "team_points_at_least":
        return { type: triggerType, points: triggerPoints };
      case "elapsed_minutes":
        return { type: triggerType, minutes: triggerMinutes };
      case "after_task_solved":
        return {
          type: triggerType,
          source_task_id: triggerSourceTaskId || undefined,
          delay_seconds: triggerDelaySeconds > 0 ? triggerDelaySeconds : undefined,
        };
      default:
        return { type: "game_start" };
    }
  }

  function saveConfig(patch: Parameters<typeof updateGameTaskLinkConfig>[2]) {
    if (!link) return;
    setError(null);
    startTransition(async () => {
      const result = await updateGameTaskLinkConfig(gameId, link.id, patch);
      if (!result.success) {
        setError(result.error);
        return;
      }
      onUpdated(result.data!);
      setMessage("Gespeichert.");
      router.refresh();
    });
  }

  if (!link) return null;

  const triggerSourceOptions = [...missionLinks, ...allLinks.filter((l) => l.layer === 1)];

  return (
    <StudioModal
      open={open}
      onClose={onClose}
      size="xl"
      title={link.task.title}
      subtitle={`${layerLabel} · Aufgabe ${index + 1}`}
      hero={
        <div className="border-b border-slate-100 bg-gradient-to-br from-slate-50 to-white px-6 py-5">
          <TaskTilePreview title={link.task.title} content={link.task.content} solo />
        </div>
      }
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {layer === 1 && gpsEnabled ? (
              <StudioButton
                type="button"
                disabled={pending || saving}
                icon={<IconSave size={14} />}
                onClick={() => saveConfig({ location: draft })}
              >
                Wegpunkt speichern
              </StudioButton>
            ) : null}
            {layer === 3 ? (
              <StudioButton
                type="button"
                disabled={pending || saving}
                icon={<IconSave size={14} />}
                onClick={() => saveConfig({ role, trigger: buildTrigger() })}
              >
                Bedingung speichern
              </StudioButton>
            ) : null}
            <Link href={`/admin/tasks/${link.task_id}?returnTo=${returnTo}`}>
              <StudioButton type="button" variant="secondary" icon={<IconEdit size={14} />}>
                Aufgaben-Inhalt bearbeiten
              </StudioButton>
            </Link>
          </div>
          <StudioButton
            type="button"
            variant="ghost"
            disabled={pending || saving}
            icon={<IconTrash size={14} />}
            onClick={() => {
              if (window.confirm("Aufgabe aus dem Spiel entfernen?")) onRemove();
            }}
          >
            Entfernen
          </StudioButton>
        </div>
      }
    >
      {error ? <StudioError message={error} /> : null}
      {message ? (
        <div className="mb-4">
          <StudioSuccess message={message} />
        </div>
      ) : null}

      {layer === 1 && gpsEnabled ? (
        <div>
          <p className="mb-3 flex items-center gap-2 text-sm text-slate-600">
            <IconMapPin size={16} />
            GPS-Koordinaten für diese Stadt / dieses Event
          </p>
          <GpsWaypointPicker
            value={gpsDraft ?? currentGps}
            defaultCenter={mapDefault}
            disabled={pending || saving}
            onChange={(pin) => setGpsDraft(pin)}
          />
          {currentGps ? (
            <StudioButton
              type="button"
              variant="ghost"
              className="mt-3"
              onClick={() => saveConfig({ location: null })}
            >
              Wegpunkt entfernen
            </StudioButton>
          ) : null}
        </div>
      ) : null}

      {layer === 2 ? (
        <div className="space-y-3 text-sm text-slate-600">
          <p>
            Die Reihenfolge in der Mission-Spalte bestimmt, wann diese Aufgabe erscheint. Ziehe
            Aufgaben in der Spalte per Griff-Symbol.
          </p>
          <p>
            Position in der Mission: <strong>{index + 1}</strong>
            {index === 0 ? " (Start)" : null}
          </p>
        </div>
      ) : null}

      {layer === 3 ? (
        <div className="space-y-4">
          <div>
            <StudioLabel>Rolle</StudioLabel>
            <StudioSelect
              value={role}
              onChange={(e) => setRole(e.target.value as RoleAssignment)}
            >
              {ROLE_ASSIGNMENTS.filter((r) => r !== "none").map((r) => (
                <option key={r} value={r}>
                  {roleAssignmentLabel(r)}
                </option>
              ))}
            </StudioSelect>
          </div>
          <div>
            <StudioLabel>Wann erscheint die Aufgabe?</StudioLabel>
            <StudioSelect
              value={triggerType}
              onChange={(e) => setTriggerType(e.target.value as BonusTriggerType)}
            >
              {BONUS_TRIGGER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.labelDe}
                </option>
              ))}
            </StudioSelect>
          </div>
          {triggerType === "team_points_at_least" ? (
            <div>
              <StudioLabel>Punkte</StudioLabel>
              <StudioInput
                type="number"
                min={1}
                value={triggerPoints}
                onChange={(e) => setTriggerPoints(Number(e.target.value))}
              />
            </div>
          ) : null}
          {triggerType === "elapsed_minutes" ? (
            <div>
              <StudioLabel>Minuten seit Spielstart</StudioLabel>
              <StudioInput
                type="number"
                min={1}
                value={triggerMinutes}
                onChange={(e) => setTriggerMinutes(Number(e.target.value))}
              />
            </div>
          ) : null}
          {triggerType === "after_task_solved" ? (
            <>
              <div>
                <StudioLabel>Nach welcher Aufgabe?</StudioLabel>
                <StudioSelect
                  value={triggerSourceTaskId}
                  onChange={(e) => setTriggerSourceTaskId(e.target.value)}
                >
                  <option value="">— wählen —</option>
                  {triggerSourceOptions.map((l) => (
                    <option key={l.task_id} value={l.task_id}>
                      {l.task.title}
                    </option>
                  ))}
                </StudioSelect>
              </div>
              <div>
                <StudioLabel hint="Optional — Verzögerung in Sekunden">Verzögerung (Sek.)</StudioLabel>
                <StudioInput
                  type="number"
                  min={0}
                  value={triggerDelaySeconds}
                  onChange={(e) => setTriggerDelaySeconds(Number(e.target.value))}
                />
              </div>
            </>
          ) : null}
        </div>
      ) : null}
    </StudioModal>
  );
}
