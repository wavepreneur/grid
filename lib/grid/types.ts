export type GridEventStatus =
  | "draft"
  | "lobby"
  | "active"
  | "completed"
  | "archived";

export type GridTeamStatus =
  | "setup"
  | "lobby"
  | "playing"
  | "finished"
  | "disbanded";

export type PlayerRole = "captain" | "solver" | "navigator";

export type GridEvent = {
  id: string;
  title: string;
  organization_id: string;
  organization_name: string | null;
  city_id: string | null;
  invite_code: string;
  status: GridEventStatus;
  max_teams: number | null;
  max_players_per_team: number;
  lobby_auto_start_seconds: number;
  content_config?: Record<string, unknown> | null;
  route_override?: Record<string, unknown> | null;
  booking_reference?: string | null;
};

export type GridTeam = {
  id: string;
  event_id: string;
  join_code: string;
  name: string;
  max_size: number;
  department: string | null;
  region: string | null;
  status: GridTeamStatus;
  lobby_opened_at: string | null;
  lobby_auto_start_at: string | null;
  started_at: string | null;
  captain_player_id: string | null;
  navigator_player_id: string | null;
};

export type GridPlayer = {
  id: string;
  team_id: string;
  session_id: string;
  display_name: string;
  is_captain: boolean;
  role: PlayerRole;
  joined_at: string;
};

export type LobbyPlayer = {
  id: string;
  display_name: string;
  is_captain: boolean;
  is_navigator?: boolean;
  role?: PlayerRole;
  joined_at: string;
  last_seen_at?: string;
};

export type LobbySnapshot = {
  team_id: string;
  event_id: string;
  join_code: string;
  team_name: string;
  max_size: number;
  department: string | null;
  region: string | null;
  team_status: GridTeamStatus;
  lobby_opened_at: string | null;
  lobby_auto_start_at: string | null;
  captain_player_id: string | null;
  navigator_player_id: string | null;
  active_player_count: number;
  players: LobbyPlayer[];
};

export type PlayerSession = {
  playerId: string;
  sessionId: string;
  displayName: string;
  teamId: string;
  joinCode: string;
  inviteCode: string;
  isCaptain: boolean;
  isNavigator: boolean;
  teamStatus?: GridTeamStatus;
};

export type ActionResult<T> =
  | { success: true; data: T }
  | {
      success: false;
      error: string;
      code?: string;
      meta?: Record<string, unknown>;
    };
