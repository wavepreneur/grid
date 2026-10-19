/** Internal status page (/status). Sections render in the order of STATUS_SECTIONS. */

export type StatusLevel = "live" | "pilot" | "legacy" | "roadmap" | "parked";

export type StatusSectionId = "migration" | "revenue" | "tells" | "cockpit" | "parked";

export type StatusEntry = {
  section: StatusSectionId;
  label: string;
  status: StatusLevel;
  note?: string;
};

export const STATUS_LEVELS: { status: StatusLevel; label: string; meaning: string }[] = [
  { status: "live", label: "Live", meaning: "In production" },
  { status: "pilot", label: "Pilot", meaning: "Works, partial or in test" },
  { status: "legacy", label: "Legacy", meaning: "Ships, not the direction" },
  { status: "roadmap", label: "Roadmap", meaning: "In the current plan, not started" },
  { status: "parked", label: "Parked", meaning: "On hold until Exitmania ≥ €20k / month" },
];

export const STATUS_SECTIONS: { id: StatusSectionId; letter: string; title: string; note: string }[] = [
  { id: "migration", letter: "A", title: "Exitmania migration", note: "Priority 1" },
  { id: "revenue", letter: "B", title: "Exitmania revenue levers", note: "Priority 2" },
  { id: "tells", letter: "C", title: "Tells v1", note: "Priority 3 · goes live with the migration" },
  { id: "cockpit", letter: "D", title: "Cockpit", note: "Operator tools" },
  { id: "parked", letter: "E", title: "Parked", note: "Until Exitmania ≥ €20k / month" },
];

export const STATUS_ENTRIES: StatusEntry[] = [
  // A · Exitmania migration
  { section: "migration", label: "Zero-auth join: link + name, ephemeral team token", status: "live" },
  { section: "migration", label: "Real-time FSM sync: state, roles, sessions", status: "live" },
  { section: "migration", label: "Self-healing sessions & device handoff", status: "live" },
  { section: "migration", label: "Asymmetric roles: Captain, GPS, teammates (Exitmania = Archetype 01)", status: "live" },
  { section: "migration", label: "GPS lead-device broadcast + Hub → Quiz → Level play", status: "live" },
  { section: "migration", label: "Studio publish: immutable snapshot bound to live events", status: "live" },
  { section: "migration", label: "Blueprint routing: exitmania | tells", status: "pilot" },
  { section: "migration", label: "Studio workspace: tasks, games, tickets", status: "pilot" },
  { section: "migration", label: "Studio templates: internal only (Exitmania games)", status: "pilot" },
  { section: "migration", label: "Task library: tile preview, full-image tiles, media upload", status: "pilot" },
  { section: "migration", label: "Game editor: settings, game flow (drag order, linear)", status: "pilot" },
  { section: "migration", label: "GPS waypoints per task (map, lat/lng, radius) → publish snapshot", status: "pilot" },
  { section: "migration", label: "Publish → studio_game_versions immutable snapshot + compiled levels", status: "pilot" },
  { section: "migration", label: "Live event binds studio_game_version_id", status: "pilot" },
  { section: "migration", label: "Runtime loads CMS snapshot", status: "pilot" },
  { section: "migration", label: "GPS auto-checkpoint in radius (Team Lead / Alpha)", status: "pilot" },
  { section: "migration", label: "Lobby auto-start when roster full", status: "pilot" },
  { section: "migration", label: "Edit task in context from game editor", status: "pilot" },
  { section: "migration", label: "Push-to-live: update running event from new publish (manual confirm)", status: "pilot" },
  { section: "migration", label: "Lead-device GPS radius fallback + in-app nudge", status: "pilot" },
  { section: "migration", label: "Runtime logic: points, buy hints with points, end_game rules", status: "roadmap" },
  { section: "migration", label: "Migration: 1,900 cities from global_levels JSON to Studio snapshots", status: "roadmap" },
  { section: "migration", label: "global_levels JSON path without Studio snapshot", status: "legacy", note: "Remove after migration" },
  { section: "migration", label: "Loquiz decommissioned (after 2 weeks stable)", status: "roadmap" },

  // B · Exitmania revenue levers
  { section: "revenue", label: "Per-person pricing + multiplayer checkout (B2C €9.90, B2B €14.90)", status: "roadmap" },
  { section: "revenue", label: "Booking API: Exitmania / Tells provision sessions (Paddle)", status: "pilot" },
  { section: "revenue", label: "Content language: Spanish, all cities", status: "roadmap" },
  { section: "revenue", label: "Content language: Italian, all cities", status: "roadmap" },
  { section: "revenue", label: "Content language: Portuguese, all cities", status: "roadmap" },
  { section: "revenue", label: "Licensee access: restricted Studio (own content + waypoints only)", status: "roadmap" },
  { section: "revenue", label: "Licensee geofence + Tells features locked", status: "roadmap" },

  // C · Tells v1
  { section: "tells", label: "One-off events as entry product (Exitmania events, Tells one-off)", status: "live" },
  { section: "tells", label: "Format: Quiz Battle", status: "roadmap" },
  { section: "tells", label: "Format: Escape", status: "roadmap" },
  { section: "tells", label: "Format: League", status: "roadmap" },
  { section: "tells", label: "Slot form for customer content (no Studio access for Tells customers)", status: "roadmap" },
  { section: "tells", label: "AI distractors: 3 wrong answers per question", status: "roadmap" },
  { section: "tells", label: "Telemetry envelope: audit_logs + domain_telemetry_metrics", status: "pilot" },
  { section: "tells", label: "Data: post-game indices from solve / fail / hint events (/data)", status: "pilot" },
  { section: "tells", label: "Report: Understanding, Bottlenecks, Role dynamics, Over time, Leaderboards", status: "roadmap" },
  { section: "tells", label: "Report: Benchmarks (locked until first sessions)", status: "roadmap" },
  { section: "tells", label: "Team-level only, min. group size 5, no role → person mapping", status: "roadmap" },
  { section: "tells", label: "Paddle: €490 setup, Exitmania credit code, yearly plans, credits", status: "roadmap" },
  { section: "tells", label: "Entry from Exitmania: ?from=exitmania", status: "roadmap" },
  { section: "tells", label: "UI, report and emails in EN, DE, FR, ES, IT", status: "roadmap" },
  { section: "tells", label: "Load test: 5,000 people in one session", status: "roadmap" },

  // D · Cockpit
  { section: "cockpit", label: "Live overview, arena show, team ranking", status: "live" },
  { section: "cockpit", label: "Session / device handoff self-heal", status: "live" },
  { section: "cockpit", label: "Lead-device radius fallback + in-app nudge", status: "pilot" },
  { section: "cockpit", label: "Manual GPS overrides, radius, set navigator (emergency levers)", status: "legacy" },

  // E · Parked
  { section: "parked", label: "Pulse-Sprint schema: pulse_sessions + pulse_player_states (privacy check: per-player state)", status: "parked" },
  { section: "parked", label: "Studio → Pulse coupling / follow-up trigger", status: "parked" },
  { section: "parked", label: "Follow-up pulse / recurring architecture", status: "parked" },
  { section: "parked", label: "Archetype routing: TIME_DECAY_SPRINT, COOPERATIVE_COLLECTIVE (only if identical to a format)", status: "parked" },
  { section: "parked", label: "Rogain / Open game modes", status: "parked" },
  { section: "parked", label: "Cockpit as autonomous health engine (nudges, radius fallback, 0% support)", status: "parked" },
  { section: "parked", label: "Autonomous healing loops", status: "parked" },
  { section: "parked", label: "Data: industry-cut benchmark across companies", status: "parked" },
];
