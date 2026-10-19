/** Internal status page (/status). Sections render in the order of STATUS_SECTIONS. */

export type StatusLevel = "live" | "pilot" | "legacy" | "roadmap" | "parked";

export type StatusSectionId =
  | "golive"
  | "copy"
  | "flywheel"
  | "tellsEvent"
  | "plans"
  | "migration"
  | "revenue"
  | "tells"
  | "cockpit"
  | "parked";

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
  { id: "golive", letter: "P0", title: "Go-live: Exitmania bookings play on Tells", note: "Go-live plan" },
  { id: "copy", letter: "P0", title: "Exitmania copy, staged", note: "Deploy with the switch to Tells" },
  { id: "flywheel", letter: "P1", title: "Flywheel inside Exitmania", note: "After go-live" },
  { id: "tellsEvent", letter: "P2", title: "From team event to a Tells event", note: "Once Exitmania runs on Tells without issues" },
  { id: "plans", letter: "P3", title: "Yearly plans", note: "After P2" },
  { id: "migration", letter: "A", title: "Exitmania migration", note: "Priority 1" },
  { id: "revenue", letter: "B", title: "Exitmania revenue levers", note: "Priority 2" },
  { id: "tells", letter: "C", title: "Tells v1", note: "Priority 3 · goes live with the migration" },
  { id: "cockpit", letter: "D", title: "Cockpit", note: "Operator tools" },
  { id: "parked", letter: "E", title: "Parked", note: "Until Exitmania ≥ €20k / month" },
];

export const STATUS_ENTRIES: StatusEntry[] = [
  // P0 · Go-live
  { section: "golive", label: "Remaining Loquiz games rebuilt in Tells and published", status: "pilot", note: "In progress" },
  { section: "golive", label: "Content pack slug on every Exitmania game (games.grid_content_pack_slug)", status: "pilot", note: "1,910 games set" },
  { section: "golive", label: "Route points per city set and played once on site per game type", status: "roadmap" },
  { section: "golive", label: "Decide: cities on global_levels at launch, or migrated to Studio snapshots first", status: "roadmap" },
  { section: "golive", label: "Rename grid → tells in the Exitmania integration (tables, routes, env, mails)", status: "roadmap", note: "Before any city switches" },
  { section: "golive", label: "One paid test booking per product: B2C, Click & Play, Teambuilding Pro", status: "roadmap" },
  { section: "golive", label: "Alert email when provisioning to Tells fails", status: "roadmap", note: "Today only a log line" },
  { section: "golive", label: "City switch via city runtime table + force_loquiz kill switch tested", status: "pilot" },
  { section: "golive", label: "Players-per-team cap (10) checked against the largest team events", status: "roadmap" },

  // P0 · Exitmania copy
  { section: "copy", label: "Ticket email + ticket page: plays in the browser, no app download", status: "roadmap" },
  { section: "copy", label: "City, game and FAQ pages: no app wording", status: "roadmap" },
  { section: "copy", label: "Per-person prices: B2C €9.90, Click & Play €12.90, Teambuilding Pro €14.90 (min. 5), upgrades €99 net", status: "roadmap" },
  { section: "copy", label: "Tells visible in ticket email, at game end and on /try-tells", status: "roadmap" },

  // P1 · Flywheel
  { section: "flywheel", label: "Family & friends bookers get a 20% team event code by email", status: "roadmap" },
  { section: "flywheel", label: "Team event code redeemable in the team event checkout", status: "roadmap" },
  { section: "flywheel", label: "Team event bookers get statistics + Tells offer with setup credit", status: "roadmap" },
  { section: "flywheel", label: "Recap email content per booking type", status: "pilot" },

  // P2 · Tells event
  { section: "tellsEvent", label: "tells.team landing page + contact form live", status: "pilot", note: "Built, behind password gate" },
  { section: "tellsEvent", label: "Real report per event from session data", status: "roadmap" },
  { section: "tellsEvent", label: "Setup credit code per team event booking: booking amount, max. €245, 90 days, once per company", status: "roadmap" },
  { section: "tellsEvent", label: "Paddle checkout on Tells; packages bookable only once the product runs cleanly", status: "roadmap" },
  { section: "tellsEvent", label: "Tells v1 items in section C complete", status: "roadmap" },

  // P3 · Yearly plans
  { section: "plans", label: "Yearly plans and credits billed on Tells", status: "roadmap" },
  { section: "plans", label: "Direct entry from Exitmania to a yearly plan", status: "pilot", note: "Contact form today" },

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
  { section: "revenue", label: "Per-person pricing at the switch: B2C €9.90, Click & Play €12.90, Teambuilding Pro €14.90 (min. 5), upgrades €99 net", status: "roadmap" },
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
