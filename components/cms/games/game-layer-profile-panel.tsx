"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateGameLayerProfile } from "@/app/actions/cms/games";
import { StudioPanel } from "@/components/cms/admin-shell";
import {
  detectPresetFromLayers,
  isLayerActive,
  LAYER_DEFINITIONS,
  LAYER_GAME_PRESETS,
  parseActiveLayers,
  parseRuntimeProfiles,
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

export function GameLayerProfilePanel({ game }: Props) {
  const router = useRouter();
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

  function applyPreset(presetId: typeof LAYER_GAME_PRESETS[number]["id"]) {
    const preset = LAYER_GAME_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setSelectedPreset(presetId);
    setActiveLayers([...preset.activeLayers]);
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

  function handleSave() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await updateGameLayerProfile({
        id: game.id,
        active_layers: activeLayers,
        runtime_profiles: runtimeProfiles,
        gps_enabled: activeLayers.includes(1),
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setMessage("Layer-Profil gespeichert.");
      router.refresh();
    });
  }

  return (
    <StudioPanel>
      <StudioSectionTitle
        title="Layer-Profil"
        description="Welche Content-Layer dieses Spiel nutzt — Grundlage für Skalierung über Städte, Indoor/Outdoor und Micro-Pulse."
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

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-800">Indoor-Fallback (1 Klick)</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Bei Regen: Layer 1 GPS wird durch Indoor-Defaults ersetzt, Layer-3-Bonus wechselt auf
            Indoor-Kontext. Runtime-Umschaltung über <code className="text-teal-700">content_mode</code>.
          </p>
          <label className="mt-3 flex items-center gap-3 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={runtimeProfiles.indoor_one_click}
              disabled={pending}
              onChange={(e) =>
                setRuntimeProfiles((prev) => ({
                  ...prev,
                  indoor_one_click: e.target.checked,
                }))
              }
              className="h-4 w-4 rounded border-slate-300 text-teal-600"
            />
            Indoor-Umschaltung erlauben
          </label>
          {runtimeProfiles.indoor_one_click ? (
            <div className="mt-3">
              <StudioHint tone="info">
                Outdoor: Layer {runtimeProfiles.profiles.outdoor.active_layers.join(", ")} · Indoor: Layer{" "}
                {runtimeProfiles.profiles.indoor.active_layers.join(", ")}
                {runtimeProfiles.profiles.indoor.layer_1_fallback
                  ? ` · L1-Fallback: ${runtimeProfiles.profiles.indoor.layer_1_fallback}`
                  : null}
              </StudioHint>
            </div>
          ) : null}
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
