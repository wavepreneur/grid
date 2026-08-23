"use client";

import { useEffect, useState, useTransition } from "react";
import { updateGameLayerProfile } from "@/app/actions/cms/games";
import { StudioPanel } from "@/components/cms/admin-shell";
import { useStudioCache } from "@/lib/platform/studio-cache";
import {
  contentModeLabel,
  detectPresetFromLayers,
  isLayerActive,
  LAYER_DEFINITIONS,
  LAYER_GAME_PRESETS,
  parseActiveLayers,
  parseRuntimeProfiles,
  type ContentMode,
  type RuntimeProfiles,
  type StudioLayer,
} from "@/lib/cms/layer-model";
import {
  StudioButton,
  StudioError,
  StudioHint,
  StudioSectionTitle,
  StudioSuccess,
} from "@/components/cms/studio-ui";
import type { StudioGame } from "@/lib/cms/types";

type Props = {
  game: StudioGame;
};

const ALL_LAYERS: StudioLayer[] = [1, 2, 3];
const FALLBACK_OPTIONS: ContentMode[] = ["indoor", "online"];

export function GameLayerProfilePanel({ game }: Props) {
  const cache = useStudioCache();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [activeLayers, setActiveLayers] = useState<StudioLayer[]>(() =>
    parseActiveLayers(game.active_layers),
  );
  const [runtimeProfiles, setRuntimeProfiles] = useState<RuntimeProfiles>(() =>
    parseRuntimeProfiles(game.runtime_profiles),
  );
  const [selectedPreset, setSelectedPreset] = useState(() =>
    detectPresetFromLayers(parseActiveLayers(game.active_layers)),
  );

  useEffect(() => {
    setActiveLayers(parseActiveLayers(game.active_layers));
    setRuntimeProfiles(parseRuntimeProfiles(game.runtime_profiles));
    setSelectedPreset(detectPresetFromLayers(parseActiveLayers(game.active_layers)));
  }, [game.id, game.active_layers, game.runtime_profiles, game.updated_at]);

  function applyPreset(presetId: (typeof LAYER_GAME_PRESETS)[number]["id"]) {
    const preset = LAYER_GAME_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setSelectedPreset(presetId);
    setActiveLayers([...preset.activeLayers]);
    setRuntimeProfiles((prev) => ({
      ...prev,
      default_mode: preset.defaultMode,
      allowed_fallbacks: [...preset.allowedFallbacks],
      indoor_one_click: preset.allowedFallbacks.includes("indoor"),
    }));
  }

  function toggleLayer(layer: StudioLayer) {
    setSelectedPreset("custom");
    setActiveLayers((prev) => {
      if (prev.includes(layer)) {
        const next = prev.filter((l) => l !== layer);
        return next.length > 0 ? next : prev;
      }
      return [...prev, layer].sort();
    });
  }

  function toggleFallback(mode: ContentMode) {
    if (mode === runtimeProfiles.default_mode) return;
    setRuntimeProfiles((prev) => {
      const has = prev.allowed_fallbacks.includes(mode);
      const allowed_fallbacks = has
        ? prev.allowed_fallbacks.filter((m) => m !== mode)
        : [...prev.allowed_fallbacks, mode];
      return {
        ...prev,
        allowed_fallbacks,
        indoor_one_click: allowed_fallbacks.includes("indoor"),
      };
    });
  }

  function setDefaultMode(mode: ContentMode) {
    setRuntimeProfiles((prev) => ({
      ...prev,
      default_mode: mode,
      allowed_fallbacks: prev.allowed_fallbacks.filter((m) => m !== mode),
    }));
  }

  function handleSave() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await updateGameLayerProfile({
        id: game.id,
        active_layers: activeLayers,
        runtime_profiles: runtimeProfiles,
        gps_enabled:
          activeLayers.includes(1) && runtimeProfiles.default_mode === "outdoor",
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      cache.setGame(result.data!);
      setMessage("Layer-Profil gespeichert.");
    });
  }

  return (
    <StudioPanel>
      <StudioSectionTitle
        title="Layer-Profil"
        description="Content-Layer und Play-Surfaces — Outdoor, Indoor-Stationen oder Online (Tabbrain). Spieler-Flow: Hub → Quiz → Level → Bonus."
      />

      <div className="space-y-6">
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Spieltyp
          </p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {LAYER_GAME_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                disabled={pending}
                onClick={() => applyPreset(preset.id)}
                className={`rounded-xl border px-4 py-3 text-left transition ${
                  selectedPreset === preset.id
                    ? "border-teal-400 bg-teal-50/60 ring-1 ring-teal-200"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <p className="text-sm font-semibold text-slate-900">{preset.labelDe}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">{preset.descriptionDe}</p>
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Aktive Layer
          </p>
          <div className="grid gap-3 md:grid-cols-3">
            {ALL_LAYERS.map((layer) => {
              const def = LAYER_DEFINITIONS[layer];
              const active = isLayerActive(layer, activeLayers);
              return (
                <label
                  key={layer}
                  className={`flex cursor-pointer gap-3 rounded-xl border p-4 transition ${
                    active
                      ? "border-teal-300 bg-teal-50/30"
                      : "border-slate-200 bg-slate-50/50 opacity-70"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={active}
                    disabled={pending}
                    onChange={() => toggleLayer(layer)}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-teal-600"
                  />
                  <span>
                    <span className="text-sm font-semibold text-slate-900">{def.shortDe}</span>
                    <span className="mt-1 block text-xs leading-5 text-slate-500">
                      {def.descriptionDe}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-4">
          <div>
            <p className="text-sm font-semibold text-slate-800">Primary Surface</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Standard-Hub beim Start. Layer 2 (Mission) bleibt immer derselbe Content.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(["outdoor", "indoor", "online"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  disabled={pending}
                  onClick={() => setDefaultMode(mode)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    runtimeProfiles.default_mode === mode
                      ? "bg-teal-600 text-white"
                      : "bg-white border border-slate-200 text-slate-700 hover:border-slate-300"
                  }`}
                >
                  {contentModeLabel(mode)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-800">Fallback-Optionen</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Kunde/Operator kann zur Laufzeit umschalten: Indoor (Codes im Gebäude) und/oder
              Online (am Tisch / remote, Tabbrain-Shell).
            </p>
            <div className="mt-3 space-y-2">
              {FALLBACK_OPTIONS.filter((m) => m !== runtimeProfiles.default_mode).map(
                (mode) => (
                  <label
                    key={mode}
                    className="flex items-center gap-3 text-sm text-slate-700"
                  >
                    <input
                      type="checkbox"
                      checked={runtimeProfiles.allowed_fallbacks.includes(mode)}
                      disabled={pending}
                      onChange={() => toggleFallback(mode)}
                      className="h-4 w-4 rounded border-slate-300 text-teal-600"
                    />
                    {contentModeLabel(mode)} erlauben
                  </label>
                ),
              )}
            </div>
          </div>

          <StudioHint tone="info">
            Default: {contentModeLabel(runtimeProfiles.default_mode)}
            {runtimeProfiles.allowed_fallbacks.length > 0
              ? ` · Fallback: ${runtimeProfiles.allowed_fallbacks.map(contentModeLabel).join(", ")}`
              : " · keine Fallbacks"}
            {" · "}
            Outdoor: Waypoints · Indoor: Stationen+Codes · Online: Missions-Deck
          </StudioHint>
        </div>

        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Rollen-Namen im Spiel
          </p>
          <p className="mb-3 text-sm text-slate-500">
            Alpha / Beta / Gamma bleiben technische Schlüssel. Im Spiel sehen Teams nur diese Namen.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            {(
              [
                ["alpha", "Alpha"],
                ["beta", "Beta"],
                ["gamma", "Gamma"],
              ] as const
            ).map(([key, tech]) => (
              <label key={key} className="block space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {tech}
                </span>
                <input
                  type="text"
                  value={runtimeProfiles.role_labels[key]}
                  disabled={pending}
                  onChange={(e) =>
                    setRuntimeProfiles((prev) => ({
                      ...prev,
                      role_labels: { ...prev.role_labels, [key]: e.target.value },
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                  placeholder={tech}
                />
              </label>
            ))}
          </div>
        </div>

        {error ? <StudioError message={error} /> : null}
        {message ? <StudioSuccess message={message} /> : null}

        <StudioButton type="button" disabled={pending} onClick={handleSave}>
          {pending ? "Speichern…" : "Layer-Profil speichern"}
        </StudioButton>
      </div>
    </StudioPanel>
  );
}
