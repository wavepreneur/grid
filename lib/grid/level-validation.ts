import {
  getLevelDefinition,
  normalizeAnswer,
  requiresGps,
} from "@/lib/grid/content-engine";
import { isWithinGeofence } from "@/lib/grid/geofence";
import type {
  LevelDefinition,
  PlayerRole,
  SolveLevelPayload,
} from "@/lib/grid/level-types";

export type LevelValidationContext = {
  isCaptain: boolean;
  isNavigator: boolean;
  canUnlockGps?: boolean;
  effectiveBeta?: boolean;
  archetypeRole?: "alpha" | "beta" | "gamma";
  playerRole: PlayerRole;
  gpsEnabled?: boolean;
};

function normalizeRequiredRole(role: PlayerRole): "alpha" | "beta" | "gamma" | "captain" | "navigator" | "solver" {
  if (role === "captain" || role === "navigator") return "alpha";
  if (role === "solver") return "gamma";
  return role;
}

function playerEffectiveArchetypeRole(context: LevelValidationContext): "alpha" | "beta" | "gamma" {
  if (context.archetypeRole) return context.archetypeRole;
  if (context.isCaptain) return "alpha";
  if (context.playerRole === "beta") return "beta";
  return "gamma";
}

export function validateLevelSolution(
  level: LevelDefinition,
  payload: SolveLevelPayload,
  context?: LevelValidationContext,
): { ok: true } | { ok: false; error: string } {
  if (level.role_required && context) {
    const required = normalizeRequiredRole(level.role_required);
    const playerRole = playerEffectiveArchetypeRole(context);
    if (required !== playerRole && !(required === "beta" && context.effectiveBeta)) {
      const label =
        required === "alpha" ? "Alpha" : required === "beta" ? "Beta" : "Gamma";
      return {
        ok: false,
        error: `Diese Aufgabe ist für die Rolle „${label}" reserviert.`,
      };
    }
  }

  if (level.type === "gps") {
    if (context?.gpsEnabled === false) {
      return { ok: false, error: "GPS ist für dieses Event deaktiviert." };
    }
    if (!level.location) {
      return { ok: false, error: "GPS-Level ohne Koordinaten konfiguriert." };
    }
    const canUnlockGps = context?.canUnlockGps ?? context?.isNavigator ?? false;
    if (!canUnlockGps) {
      return {
        ok: false,
        error: "GPS-Checkpoints kann nur Alpha am Zielort freischalten.",
      };
    }
    if (!payload.geolocation) {
      return { ok: false, error: "GPS-Position erforderlich. Bitte Standort freigeben." };
    }
    if (!isWithinGeofence(payload.geolocation, level.location)) {
      return {
        ok: false,
        error: `Ihr seid noch nicht am Checkpoint (Radius: ${level.location.radius_meters} m).`,
      };
    }
    return { ok: true };
  }

  if (level.type === "digital") {
    if (!payload.answer?.trim()) {
      return { ok: false, error: "Bitte eine Antwort eingeben." };
    }
    if (!level.answer) {
      return { ok: false, error: "Level ohne Lösung konfiguriert." };
    }
    if (normalizeAnswer(payload.answer) !== normalizeAnswer(level.answer)) {
      return { ok: false, error: "Falsche Antwort. Versucht es erneut." };
    }
    return { ok: true };
  }

  if (level.type === "quiz") {
    if (level.correct_option_ids?.length) {
      const selected = new Set(payload.selectedOptionIds ?? []);
      const required = new Set(level.correct_option_ids);
      if (selected.size !== required.size) {
        return { ok: false, error: "Bitte alle richtigen Antworten auswählen." };
      }
      for (const id of required) {
        if (!selected.has(id)) {
          return { ok: false, error: "Nicht alle richtigen Antworten gewählt." };
        }
      }
      return { ok: true };
    }

    if (!payload.selectedOptionId) {
      return { ok: false, error: "Bitte eine Antwort auswählen." };
    }
    if (payload.selectedOptionId !== level.correct_option_id) {
      return { ok: false, error: "Falsche Antwort. Versucht es erneut." };
    }
    return { ok: true };
  }

  return { ok: false, error: "Unbekannter Level-Typ." };
}

export { getLevelDefinition, requiresGps };
