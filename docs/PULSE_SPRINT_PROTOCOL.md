# Pulse-Sprint-Protokoll — REST + Unified Telemetry

> **Für Agenten:** Micro-Pulses nutzen **keine permanenten WebSockets**. Macro-Events (Exitmania/Tabbrain 90 Min) bleiben auf `sync_live` + Realtime FSM.

## Zwei Säulen, eine Engine

| Säule | `play_mode` | Transport | Tabellen |
|-------|-------------|-----------|----------|
| Macro-Events (~90 Min) | `sync_live` | WebSocket FSM | `events`, `teams`, `players` |
| Micro-Pulses (~10 Min) | `async_pulse` | HTTP POST | `pulse_sessions`, `pulse_player_states` |

Master-Analytik für beide Modi: **`domain_telemetry_metrics`** mit einheitlichem `telemetry_envelope` JSON (`schema_version: 1`).

## Global Team Intelligence Score

```text
intelligence_score_delta = stress_index − collaboration_streak
```

| Metrik | Quelle | Normalisierung |
|--------|--------|----------------|
| `stress_index` | `level_completed`, `game_finished` (sync) | `score / 1000`, clamp 0–1 |
| `collaboration_streak` | `pulse_progress_logged` (async) | `streak_count / 12`, clamp 0–1 |

Code: `lib/grid/telemetry-bridge.ts`, `lib/grid/telemetry-envelope.ts`

## Datenbank (Migration `20260623100000_pulse_sprint_telemetry.sql`)

- `pulse_programs` — B2B-ARR-Container (Org-Landing, wöchentlicher Streak)
- `pulse_sessions` — Micro-Pulse-Raum (`pulse_code`, REST-only)
- `pulse_player_states` — Stateless Fortschritt pro `player_ref` (Slack-User-ID, Teams-ID, …)
- `domain_telemetry_metrics` — Konsolidierte Metriken sync + async
- `events.play_mode` — Default `sync_live`

## REST API

Auth: Header `x-grid-api-key` (= `GRID_BOOKING_API_KEY`)

### Session anlegen

```http
POST /api/v1/pulse/sessions
Content-Type: application/json

{
  "organization_slug": "tabbrain",
  "title": "Weekly Pulse — Engineering",
  "channel": "slack",
  "duration_minutes": 10,
  "booking_reference": "tb-pulse-2026-w24",
  "program_slug": "engineering-streak"
}
```

Antwort: `pulse_code`, `progress_url`, `status_url` (idempotent bei gleichem `booking_reference`).

### Fortschritt loggen (stateless POST)

```http
POST /api/v1/pulse/sessions/{PULSE_CODE}/progress

{
  "player_ref": "U01234567",
  "display_name": "Alex",
  "department": "Engineering",
  "region": "DACH",
  "progress_state": { "step": 3, "completed": true },
  "score": 850,
  "streak_count": 4,
  "complete_session": false
}
```

Schreibt: `pulse_player_states` (upsert), `audit_logs`, `domain_telemetry_metrics`.

### Status abfragen

```http
GET /api/v1/pulse/sessions/{PULSE_CODE}/status
GET /api/v1/pulse/sessions?pulse_code=ABCD1234&organization_slug=tabbrain
```

## Telemetry-Bridge

`writeAuditLog()` spiegelt automatisch:

- `level_completed` → `domain_telemetry_metrics` (`level_stress_index`, `sync_live`)
- `game_finished` → `game_finished_stress_index`

Pulse-Progress schreibt direkt `pulse_collaboration_streak` (`async_pulse`).

## Architektur-Regeln

1. **Kein WebSocket** für `pulse_sessions` — nur REST.
2. **Gleiches Envelope** für Content + Performance in beiden Modi.
3. **Exitmania unberührt** — Pulse ist Tabbrain/Slack-Pfad; Macro bleibt Booking-API.
4. Slack/Teams-Bots sind **Integration Layer** — rufen nur REST, nicht GRID-FSM.

## Nächste Schritte (Produkt)

- [ ] Org-Dashboard: Intelligence Score aus `domain_telemetry_metrics` aggregieren
- [ ] Slack App / Teams Bot → `POST .../progress`
- [ ] `pulse_programs` Admin-UI (Jahres-Landing)
