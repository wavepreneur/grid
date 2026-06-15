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

export type GridEvent = {
  id: string;
  title: string;
  organization_name: string | null;
  invite_code: string;
  status: GridEventStatus;
  max_teams: number | null;
  max_players_per_team: number;
  lobby_auto_start_seconds: number;
  content_config?: Record<string, unknown> | null;
  route_override?: Record<string, unknown> | null;
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
};

export type GridPlayer = {
  id: string;
  team_id: string;
  session_id: string;
  display_name: string;
  is_captain: boolean;
  joined_at: string;
};

export type LobbyPlayer = {
  id: string;
  display_name: string;
  is_captain: boolean;
  joined_at: string;
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
  active_player_count: number;
  players: LobbyPlayer[];
};

export type PlayerSession = {
  playerId: string;
  sessionId: string;
  teamId: string;
  joinCode: string;
  inviteCode: string;
  isCaptain: boolean;
};

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };
