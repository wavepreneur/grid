import {
  getLevelDefinition,
  normalizeAnswer,
  requiresGps,
} from "@/lib/grid/content-engine";
import { isWithinGeofenceForPlay, withHealthRadiusBonus } from "@/lib/grid/geofence";
import type {
  ArrivalQuiz,
  LevelDefinition,
  PlayerRole,
  SolveLevelPayload,
} from "@/lib/grid/level-types";
import { normalizeStationCode } from "@/lib/grid/stations";

export type LevelValidationContext = {
  isCaptain: boolean;
  isNavigator: boolean;
  canUnlockGps?: boolean;
  effectiveBeta?: boolean;
  archetypeRole?: "alpha" | "beta" | "gamma";
  playerRole: PlayerRole;
  gpsEnabled?: boolean;
  /** Alpha lead override when GPS fails — audited by caller. */
  forceUnlock?: "geofence" | "distance";
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

  if (payload.revealSolution) {
    if (!level.scoring?.allow_reveal_solution) {
      return { ok: false, error: "Lösung anzeigen ist für diese Aufgabe nicht erlaubt." };
    }
    return { ok: true };
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
    if (context?.forceUnlock === "geofence") {
      return { ok: true };
    }
    if (!payload.geolocation) {
      return { ok: false, error: "GPS-Position erforderlich. Bitte Standort freigeben." };
    }
    const healthTarget = withHealthRadiusBonus(
      level.location,
      payload.healthRadiusBonusMeters,
    );
    if (!isWithinGeofenceForPlay(payload.geolocation, healthTarget)) {
      return {
        ok: false,
        error: `Ihr seid noch nicht am Checkpoint (Radius: ${healthTarget.radius_meters} m).`,
      };
    }
    return { ok: true };
  }

  if (level.type === "digital" || (level.type === "station" && level.answer)) {
    if (level.input_mode === "confirm") {
      return { ok: true };
    }
    if (!payload.answer?.trim()) {
      return { ok: false, error: "Bitte eine Antwort eingeben." };
    }
    if (!level.answer) {
      return { ok: false, error: "Level ohne Lösung konfiguriert." };
    }
    const isBoxes = level.input_mode === "boxes" || level.input_mode === "number";
    const expected = isBoxes
      ? level.answer.trim().toLowerCase().replace(/[^a-z0-9]/g, "")
      : normalizeAnswer(level.answer);
    const given = isBoxes
      ? payload.answer.trim().toLowerCase().replace(/[^a-z0-9]/g, "")
      : normalizeAnswer(payload.answer);
    if (given !== expected) {
      return { ok: false, error: "Falsche Antwort. Versucht es erneut." };
    }
    return { ok: true };
  }

  if (level.type === "quiz" || level.type === "station") {
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

export function validateArrivalQuiz(
  quiz: ArrivalQuiz,
  selectedOptionId: string | undefined,
  selectedOptionIds?: string[],
): { ok: true } | { ok: false; error: string } {
  if (quiz.correct_option_ids?.length) {
    const selected = new Set(selectedOptionIds ?? (selectedOptionId ? [selectedOptionId] : []));
    const required = new Set(quiz.correct_option_ids);
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

  if (!selectedOptionId) {
    return { ok: false, error: "Bitte eine Antwort auswählen." };
  }
  if (selectedOptionId !== quiz.correct_option_id) {
    return { ok: false, error: "Falsche Antwort. Versucht es erneut." };
  }
  return { ok: true };
}

export function validateStationCode(
  level: LevelDefinition,
  code: string,
): { ok: true } | { ok: false; error: string } {
  if (!level.station?.code) {
    return { ok: false, error: "Diese Station hat keinen Code." };
  }
  if (normalizeStationCode(code) !== normalizeStationCode(level.station.code)) {
    return { ok: false, error: "Falscher Stationscode." };
  }
  return { ok: true };
}

export { getLevelDefinition, requiresGps };
