# Exitmania ↔ GRID ↔ Tabbrain — Integrations-Kompass

> **Für Agenten:** Diese Datei ist die Single Source of Truth für Produktgrenzen, Content-Flow und Migrationspfad. Bei Integrationstasks zuerst lesen.

## Drei Produkte, eine Engine

| Produkt | Verkauft | Behält | Nutzt GRID für |
|---------|----------|--------|----------------|
| **Exitmania** | Kurzfristige Stadt-Escape-Games (B2C + B2B Teamevents) | Shop, SEO, Checkout (Paddle), Portale, Admin, E-Mails, Minigames `/m/*` | Live-Spiel statt Loquiz |
| **Tabbrain** | Org-/Team-Lead-Multiplayer (Standard + Enterprise-Jahres-Landing) — *noch nicht gebaut* | GTM, Org-Accounts, Billing, Branding | Dieselbe Engine, anderer Blueprint |
| **GRID** | nichts (Engine) | FSM, Rollen, Realtime, Cockpit, `audit_logs`, `domain_telemetry_metrics` | — |

**Exitmania verkauft genauso wie Tabbrain — unterschiedliche Produkte, gleiche Runtime.**

Loquiz wird **nur** durch GRID ersetzt — nicht Exitmanias Commerce-Schicht.

## Content — keine Duplikate

```text
global_levels + local_waypoints (GRID)     ← ein Wörterbuch, viele Events
         ↑
events.content_config                      ← blueprint, city_slug, content_pack_slug
events.route_override                      ← nur Deltas pro Buchung
         ↑
Exitmania games.* (Katalog)                ← Marketing, PDF-URLs, grid_pack_slug (Pointer)
```

- **Exitmania-DB:** Buchungen, Preise, Story-Texte, `games.riddle_sheet_pdf_url`
- **GRID-DB:** Level-Logik, GPS, Tiles, Tipps, Laufzeit-State
- **Nicht:** Level-JSON in Exitmania duplizieren

## Loquiz → GRID Ersetzungsmatrix

| Loquiz heute (Exitmania) | GRID-Ersatz |
|--------------------------|-------------|
| `create-loquiz-ticket` | `create-grid-session` → `POST /api/v1/bookings` |
| `team_credentials` (user/pass) | `grid_invite_code`, `grid_join_code`, `grid_play_url` |
| `loquiz://` QR | `/e/{invite}/team/{join}` |
| Webhook `/api/webhooks/loquiz` | `GET /api/v1/events/{inviteCode}/status` + später Outbound-Webhook |
| Loquiz Results API | `teams.game_state`, Cockpit-API |

## API-Vertrag (Phase 0 — live in GRID)

### Provisionieren

```http
POST /api/v1/bookings
x-grid-api-key: ...
Content-Type: application/json

{
  "organization_slug": "exitmania",
  "blueprint_slug": "exitmania",
  "title": "Berlin Escape – Buchung abc",
  "team_count": 1,
  "players_per_team": 5,
  "city_slug": "berlin",
  "content_pack_slug": "berlin-classic",
  "booking_reference": "exitmania:booking:{uuid}",
  "route_override": { "levels": { "2": { "location": { ... } } } }
}
```

**Idempotent:** Gleiche `booking_reference` + Org → bestehendes Event zurück.

### Nachschlagen

```http
GET /api/v1/bookings?booking_reference=exitmania:booking:{uuid}
x-grid-api-key: ...
```

### Live-Status (Loquiz-Webhook-Ersatz)

```http
GET /api/v1/events/{inviteCode}/status
x-grid-api-key: ...
```

## Exitmania-Implementierung

| Datei | Zweck |
|-------|--------|
| `next-app/lib/gridBookingClient.ts` | HTTP-Client zur GRID Booking-API |
| `supabase/functions/create-grid-session/` | Nach Paddle: GRID-Session statt Loquiz-Ticket |
| Migration `grid_*` auf `team_credentials` | Play-URLs speichern |
| Feature-Flag pro Spiel | `games.grid_enabled` / `grid_content_pack_slug` |

Pilot: **ein Spiel, eine Stadt**, Loquiz parallel für Rest.

## Tabbrain (greenfield)

- Gleiche GRID-API, `organization_slug: "tabbrain"`, `blueprint_slug: "tabbrain"`
- Kein Loquiz-Migration-Pfad nötig
- Enterprise: `route_override` / `content_payload` bei Buchung
- **Micro-Pulses:** REST-only via `POST /api/v1/pulse/sessions` — siehe [`docs/PULSE_SPRINT_PROTOCOL.md`](./PULSE_SPRINT_PROTOCOL.md)

## Agent-Regeln

1. **GRID:** Kein Checkout, kein SEO, kein Paddle — nur Engine + Operator-Cockpit
2. **Exitmania:** Kein GPS/Level-Runtime nachbauen — GRID aufrufen
3. **Content-Änderungen:** Master in `global_levels`; Event-Patches in `route_override`
4. **Neue Features:** Prüfen ob Commerce (Exitmania/Tabbrain) oder Runtime (GRID)

Verwandt: [`GRID_ARCHITECTURE.md`](../GRID_ARCHITECTURE.md), Exitmania `docs/ARCHITECTURE.md` + `docs/GRID_INTEGRATION.md`
