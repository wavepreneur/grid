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
  playerRole: PlayerRole;
};

export function validateLevelSolution(
  level: LevelDefinition,
  payload: SolveLevelPayload,
  context?: LevelValidationContext,
): { ok: true } | { ok: false; error: string } {
  if (level.role_required && context) {
    const effectiveRole = context.isCaptain ? "captain" : context.playerRole;
    if (level.role_required !== effectiveRole && level.role_required !== "captain") {
      return {
        ok: false,
        error: `Diese Aufgabe ist für die Rolle „${level.role_required}" reserviert.`,
      };
    }
  }

  if (level.type === "gps") {
    if (!level.location) {
      return { ok: false, error: "GPS-Level ohne Koordinaten konfiguriert." };
    }
    if (context && !context.isNavigator) {
      return {
        ok: false,
        error: "GPS-Checkpoints können nur vom Team-Lead-Gerät (GPS) bestätigt werden.",
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
