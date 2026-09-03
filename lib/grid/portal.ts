import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_GPS_RADIUS_METERS } from "@/lib/cms/gps-defaults";
import { parseContentConfig, parseRouteOverride } from "@/lib/grid/content-engine";
import { bumpEventContentRevision } from "@/lib/grid/content-revision";
import { loadResolvedEventContent } from "@/lib/grid/content-loader";
import { ensureTeamAccessCodesForEvent } from "@/lib/grid/access";
import { generatePortalToken } from "@/lib/grid/codes";
import type { ArrivalQuiz, EventContentConfig, EventRouteOverride } from "@/lib/grid/level-types";
import type { GridEventStatus } from "@/lib/grid/types";

export const PORTAL_DURATION_OPTIONS = [60, 90, 120, 150, 180] as const;
export const PORTAL_MIN_DURATION = 15;
export const PORTAL_MAX_DURATION = 300;

const QUIZ_OPTION_IDS = ["a", "b", "c", "d"] as const;

export type PortalWaypoint = {
  level: number;
  title: string;
  lat: number;
  lng: number;
  radius_meters: number;
};

export type PortalQuiz = {
  level: number;
  title: string;
  question: string;
  answers: [string, string, string, string];
  correct_index: 0 | 1 | 2 | 3;
};

export type PortalAccess = {
  team_name: string;
  access_code: string;
  play_url: string;
};

export type PortalSnapshot = {
  token: string;
  title: string;
  status: GridEventStatus;
  team_count: number;
  player_seats: number;
  duration_minutes: number;
  content_mode: string;
  show_waypoints: boolean;
  waypoints: PortalWaypoint[];
  quizzes: PortalQuiz[];
  accesses: PortalAccess[];
  locked: boolean;
};

export type PortalSaveInput = {
  duration_minutes: number;
  waypoints: Array<{ level: number; lat: number; lng: number }>;
  quizzes: Array<{
    level: number;
    question: string;
    answers: [string, string, string, string];
    correct_index: 0 | 1 | 2 | 3;
  }>;
};

type PortalEventRow = {
  id: string;
  title: string;
  status: GridEventStatus;
  organization_id: string;
  city_id: string | null;
  content_config: unknown;
  route_override: unknown;
  studio_game_version_id: string | null;
  max_teams: number | null;
  max_players_per_team: number;
  portal_token: string;
};

export { generatePortalToken, buildEventPortalUrl } from "@/lib/grid/codes";

export async function ensureEventPortalToken(
  eventId: string,
  current?: string | null,
): Promise<string> {
  if (current?.trim()) return current.trim();

  const supabase = createAdminClient();
  const token = generatePortalToken();
  const { error } = await supabase
    .from("events")
    .update({ portal_token: token })
    .eq("id", eventId)
    .is("portal_token", null);

  if (error) throw new Error(error.message);

  const { data, error: readError } = await supabase
    .from("events")
    .select("portal_token")
    .eq("id", eventId)
    .single();

  if (readError || !data?.portal_token) {
    throw new Error(readError?.message ?? "Portal-Token konnte nicht erzeugt werden.");
  }

  return data.portal_token as string;
}

export function validatePortalSave(input: PortalSaveInput): string | null {
  if (
    !Number.isInteger(input.duration_minutes) ||
    input.duration_minutes < PORTAL_MIN_DURATION ||
    input.duration_minutes > PORTAL_MAX_DURATION
  ) {
    return `Spieldauer muss zwischen ${PORTAL_MIN_DURATION} und ${PORTAL_MAX_DURATION} Minuten liegen.`;
  }

  for (const waypoint of input.waypoints) {
    if (!Number.isInteger(waypoint.level) || waypoint.level < 1) {
      return "Ungültiger Wegpunkt.";
    }
    if (!Number.isFinite(waypoint.lat) || waypoint.lat < -90 || waypoint.lat > 90) {
      return `Latitude für Aufgabe ${waypoint.level} ist ungültig.`;
    }
    if (!Number.isFinite(waypoint.lng) || waypoint.lng < -180 || waypoint.lng > 180) {
      return `Longitude für Aufgabe ${waypoint.level} ist ungültig.`;
    }
  }

  for (const quiz of input.quizzes) {
    if (!Number.isInteger(quiz.level) || quiz.level < 1) {
      return "Ungültiges Quiz.";
    }
    const question = quiz.question.trim();
    if (question.length < 3) {
      return `Frage für Aufgabe ${quiz.level} ist zu kurz.`;
    }
    if (quiz.answers.some((answer) => !answer.trim())) {
      return `Alle vier Antworten für Aufgabe ${quiz.level} müssen ausgefüllt sein.`;
    }
    if (quiz.correct_index < 0 || quiz.correct_index > 3) {
      return `Bitte markiere die richtige Antwort für Aufgabe ${quiz.level}.`;
    }
  }

  return null;
}

export async function loadPortalEventByToken(token: string): Promise<PortalEventRow | null> {
  const trimmed = token.trim();
  if (!trimmed) return null;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("events")
    .select(
      "id, title, status, organization_id, city_id, content_config, route_override, studio_game_version_id, max_teams, max_players_per_team, portal_token",
    )
    .eq("portal_token", trimmed)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as PortalEventRow | null) ?? null;
}

function padQuizAnswers(quiz: ArrivalQuiz | undefined): PortalQuiz["answers"] {
  const labels = (quiz?.options ?? []).map((option) => option.label);
  return [
    labels[0] ?? "",
    labels[1] ?? "",
    labels[2] ?? "",
    labels[3] ?? "",
  ];
}

function quizCorrectIndex(quiz: ArrivalQuiz | undefined): 0 | 1 | 2 | 3 {
  if (!quiz) return 0;
  const index = quiz.options.findIndex((option) => option.id === quiz.correct_option_id);
  if (index >= 0 && index <= 3) return index as 0 | 1 | 2 | 3;
  return 0;
}

export async function loadPortalSnapshot(token: string): Promise<PortalSnapshot | null> {
  const event = await loadPortalEventByToken(token);
  if (!event) return null;

  const content = await loadResolvedEventContent({
    eventId: event.id,
    organizationId: event.organization_id,
    cityId: event.city_id,
    contentConfig: event.content_config,
    routeOverride: event.route_override,
    studioGameVersionId: event.studio_game_version_id,
  });

  const waypoints: PortalWaypoint[] = content.levels
    .filter((level) => level.location)
    .map((level) => ({
      level: level.level,
      title: level.title,
      lat: level.location!.lat,
      lng: level.location!.lng,
      radius_meters: level.location!.radius_meters,
    }));

  const quizzes: PortalQuiz[] = content.levels
    .filter((level) => level.arrival_quiz || level.location || level.station)
    .map((level) => ({
      level: level.level,
      title: level.title,
      question: level.arrival_quiz?.question ?? "",
      answers: padQuizAnswers(level.arrival_quiz),
      correct_index: quizCorrectIndex(level.arrival_quiz),
    }));

  const supabase = createAdminClient();
  const { data: teams, error: teamsError } = await supabase
    .from("teams")
    .select("id, name, max_size")
    .eq("event_id", event.id)
    .order("join_code", { ascending: true });

  if (teamsError) throw new Error(teamsError.message);

  const codeByTeam = await ensureTeamAccessCodesForEvent({
    organizationId: event.organization_id,
    eventId: event.id,
    eventTitle: event.title,
  });

  const accesses: PortalAccess[] = (teams ?? [])
    .map((team) => {
      const accessCode = codeByTeam.get(team.id);
      if (!accessCode) return null;
      return {
        team_name: team.name,
        access_code: accessCode,
        play_url: `/go/${accessCode}`,
      };
    })
    .filter((item): item is PortalAccess => item !== null);

  const playerSeats =
    (teams ?? []).reduce((sum, team) => sum + (team.max_size ?? 0), 0) ||
    (event.max_teams ?? 0) * event.max_players_per_team;

  const locked = event.status === "completed" || event.status === "archived";

  return {
    token: event.portal_token,
    title: event.title,
    status: event.status,
    team_count: teams?.length ?? event.max_teams ?? 0,
    player_seats: playerSeats,
    duration_minutes: content.missionDurationMinutes,
    content_mode: content.contentMode,
    show_waypoints: waypoints.length > 0 && content.capabilities.gps,
    waypoints,
    quizzes,
    accesses,
    locked,
  };
}

function buildArrivalQuizPatch(
  existing: ArrivalQuiz | undefined,
  input: PortalSaveInput["quizzes"][number],
): ArrivalQuiz {
  const options = QUIZ_OPTION_IDS.map((id, index) => ({
    id: existing?.options[index]?.id ?? id,
    label: input.answers[index].trim(),
  }));

  return {
    ...existing,
    question: input.question.trim(),
    options,
    correct_option_id: options[input.correct_index]?.id ?? options[0].id,
  };
}

export async function savePortalOverrides(
  token: string,
  input: PortalSaveInput,
): Promise<PortalSnapshot> {
  const validationError = validatePortalSave(input);
  if (validationError) {
    throw new Error(validationError);
  }

  const event = await loadPortalEventByToken(token);
  if (!event) {
    throw new Error("Event-Portal nicht gefunden.");
  }
  if (event.status === "completed" || event.status === "archived") {
    throw new Error("Dieses Event ist abgeschlossen und kann nicht mehr geändert werden.");
  }

  const content = await loadResolvedEventContent({
    eventId: event.id,
    organizationId: event.organization_id,
    cityId: event.city_id,
    contentConfig: event.content_config,
    routeOverride: event.route_override,
    studioGameVersionId: event.studio_game_version_id,
  });

  const allowedWaypointLevels = new Set(
    content.levels.filter((level) => level.location).map((level) => level.level),
  );
  const allowedQuizLevels = new Set(
    content.levels
      .filter((level) => level.arrival_quiz || level.location || level.station)
      .map((level) => level.level),
  );

  for (const waypoint of input.waypoints) {
    if (!allowedWaypointLevels.has(waypoint.level)) {
      throw new Error(`Aufgabe ${waypoint.level} hat keine überschreibbaren Koordinaten.`);
    }
  }
  for (const quiz of input.quizzes) {
    if (!allowedQuizLevels.has(quiz.level)) {
      throw new Error(`Aufgabe ${quiz.level} hat kein überschreibbares Einstiegsquiz.`);
    }
  }

  const currentConfig = parseContentConfig(event.content_config);
  const nextConfig: EventContentConfig = {
    ...currentConfig,
    mission_duration_minutes: input.duration_minutes,
  };

  const currentOverride = parseRouteOverride(event.route_override);
  const nextLevels: NonNullable<EventRouteOverride["levels"]> = {
    ...(currentOverride.levels ?? {}),
  };

  for (const waypoint of input.waypoints) {
    const level = content.levels.find((item) => item.level === waypoint.level);
    const key = String(waypoint.level);
    const previous = nextLevels[key] ?? {};
    nextLevels[key] = {
      ...previous,
      location: {
        lat: waypoint.lat,
        lng: waypoint.lng,
        radius_meters: level?.location?.radius_meters ?? DEFAULT_GPS_RADIUS_METERS,
      },
    };
  }

  for (const quiz of input.quizzes) {
    const level = content.levels.find((item) => item.level === quiz.level);
    const key = String(quiz.level);
    const previous = nextLevels[key] ?? {};
    nextLevels[key] = {
      ...previous,
      arrival_quiz: buildArrivalQuizPatch(level?.arrival_quiz, quiz),
    };
  }

  const nextOverride: EventRouteOverride = {
    ...currentOverride,
    levels: nextLevels,
  };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("events")
    .update({
      content_config: nextConfig,
      route_override: nextOverride,
    })
    .eq("id", event.id);

  if (error) throw new Error(error.message);

  await bumpEventContentRevision(event.id);

  const snapshot = await loadPortalSnapshot(token);
  if (!snapshot) {
    throw new Error("Event-Portal konnte nach dem Speichern nicht geladen werden.");
  }
  return snapshot;
}
