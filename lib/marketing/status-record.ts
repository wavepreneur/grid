import type { Maturity } from "@/components/marketing/maturity-badge";

export const maturityLegend: { status: Maturity; label: string }[] = [
  { status: "live", label: "Production-ready" },
  { status: "beta", label: "Pilot / partial" },
  { status: "legacy", label: "Ships, not the product direction" },
  { status: "vision", label: "On the roadmap" },
];

export const gridStudioTracker = [
  {
    claim: "GRID Studio admin (/admin): tasks, games, templates, tickets",
    status: "beta" as Maturity,
  },
  {
    claim: "Task library: tile preview, full-image tiles, media upload",
    status: "beta" as Maturity,
  },
  {
    claim: "Game editor: settings, Spielablauf (drag order, Linear/Rogain/Open)",
    status: "beta" as Maturity,
  },
  {
    claim: "GPS waypoints per task (map, lat/lng, radius) → publish snapshot",
    status: "beta" as Maturity,
  },
  {
    claim: "Publish → studio_game_versions immutable snapshot + compiled levels",
    status: "beta" as Maturity,
  },
  {
    claim: "Live-Event starten: event binds studio_game_version_id",
    status: "beta" as Maturity,
  },
  {
    claim: "Runtime loads CMS snapshot (replaces global_levels for studio events)",
    status: "beta" as Maturity,
  },
  {
    claim: "GPS auto-checkpoint in radius (Team Lead / Alpha)",
    status: "beta" as Maturity,
  },
  {
    claim: "Lobby auto-start when roster full (solo test ≈ 3s)",
    status: "beta" as Maturity,
  },
  {
    claim: "Edit task in-context from game editor (return to game)",
    status: "beta" as Maturity,
  },
  {
    claim: "Push-to-Live: update running event from new publish (manual confirm)",
    status: "vision" as Maturity,
  },
  {
    claim: "Runtime logic engine: Rogain hide, points gates, end_game rules",
    status: "vision" as Maturity,
  },
  {
    claim: "Ticket pool → bulk event provisioning (10k+ teams scale test)",
    status: "vision" as Maturity,
  },
  {
    claim: "Follow-up pulse / recurring architecture (not isolated one-off events)",
    status: "beta" as Maturity,
  },
  {
    claim: "Loquiz-style one-off events as the end product; Rogain/Open as primary UX",
    status: "legacy" as Maturity,
  },
  {
    claim: "Advanced logic UI (roles, delays, per-rule GPS) — power users only",
    status: "vision" as Maturity,
  },
];

export const cockpitTracker = [
  {
    claim: "Live overview, arena show, team ranking",
    status: "live" as Maturity,
  },
  {
    claim: "Session / device handoff self-heal (not live-play GPS)",
    status: "live" as Maturity,
  },
  {
    claim: "Lead-device radius fallback + in-app nudge when geofence hangs",
    status: "beta" as Maturity,
  },
  {
    claim: "Manual GPS overrides, radius, set navigator — test and emergency levers",
    status: "legacy" as Maturity,
  },
  {
    claim: "Autonomous healing loops: radius fallback, in-app nudges, 0% support",
    status: "vision" as Maturity,
  },
];

export const goalTracker = [
  { claim: "Zero-auth join: link + name, ephemeral team token", status: "live" as Maturity },
  { claim: "Real-time FSM sync: state, roles, sessions", status: "live" as Maturity },
  { claim: "Self-healing sessions & device handoff", status: "live" as Maturity },
  { claim: "Asymmetric roles: Captain, GPS, teammates (Exitmania = Archetype 01)", status: "live" as Maturity },
  { claim: "GPS lead-device broadcast + Hub → Quiz → Level play", status: "live" as Maturity },
  { claim: "Studio publish: immutable snapshot bound to live events", status: "live" as Maturity },
  { claim: "Formal blueprint_slug routing (exitmania | tabbrain)", status: "live" as Maturity },
  { claim: "GRID Studio authoring: tasks, games, GPS waypoints, tickets", status: "beta" as Maturity },
  { claim: "Booking API: Exitmania / Tabbrain provision sessions", status: "beta" as Maturity },
  { claim: "Telemetry envelope: audit_logs + domain_telemetry_metrics", status: "beta" as Maturity },
  { claim: "Pulse-Sprint schema: pulse_sessions + pulse_player_states (REST)", status: "beta" as Maturity },
  { claim: "Lead-device GPS radius fallback + in-app nudge when geofence hangs", status: "beta" as Maturity },
  { claim: "Operator cockpit as a manual control console (GPS overrides, navigator, arena show)", status: "legacy" as Maturity },
  { claim: "global_levels JSON path without a Studio snapshot", status: "legacy" as Maturity },
  { claim: "One-off events without a follow-up pulse / recurring architecture", status: "legacy" as Maturity },
  { claim: "Cockpit as autonomous health engine (nudges, radius fallback, 0% support)", status: "vision" as Maturity },
  { claim: "GRID Data: post-game indices from solve / fail / hint events (dashboard at /data)", status: "beta" as Maturity },
  { claim: "GRID Data: industry-cut benchmark (vs. GRID field baseline only today)", status: "vision" as Maturity },
  { claim: "Studio → Pulse coupling: follow-up trigger in the published snapshot", status: "beta" as Maturity },
  { claim: "Archetype routing: TIME_DECAY_SPRINT", status: "vision" as Maturity },
  { claim: "Archetype routing: COOPERATIVE_COLLECTIVE", status: "vision" as Maturity },
];
