# GRID - Enterprise Experience OS (Architecture & Roadmap)

## 0. Meta-Rules für Cursor (KI-Instruktionen)
Als KI-Assistent (Cursor) bist du der Lead-Architekt dieses Projekts. Der Nutzer wird iterativ Features anfordern. Deine Aufgabe ist es, diese Features strikt nach den folgenden architektonischen Leitplanken zu implementieren. 
*   **Baue niemals isolierten Code:** Jeder Feature-Code muss die Multi-Tenancy- und API-First-Prinzipien respektieren.
*   **Phasen-Disziplin:** Weist der Nutzer dich an, ein Feature aus Phase 3 zu bauen, während Phase 1 nicht stabil ist, warne ihn und schlage vor, zuerst das Fundament zu beenden.
*   **Zero-Ops UX:** Jeder Flow muss ohne Support verständlich sein. Kein JSON für Event-Leiter. Identity-Bar auf allen Spieler-Screens.

---

## 1. Core Architecture (Non-Negotiables)

### 1.1 Mandantenfähigkeit (Multi-Tenancy)
*   **Regel:** Jede Tabelle in Supabase (außer globalen Wörterbüchern) MUSS eine `organization_id` haben.
*   **Sicherheit:** Row Level Security (RLS) in Supabase muss so konfiguriert sein, dass `organization_id` A niemals Daten von `organization_id` B lesen/schreiben kann.

### 1.2 API-First & Content Decoupling (Die JSON-Engine)
*   **Regel:** GRID ist die Engine, nicht das Spiel. Ein Spiel-Level wird als strukturiertes JSON-Objekt geladen.
*   Das Frontend fungiert als "Player" (wie ein Videoplayer), der die JSON-Befehle interpretiert.
*   **`events.content_revision`:** Wird bei Operator-Overrides erhöht; Game-Clients pollen und laden Content hot nach.

### 1.3 UI-Theming (White-Label)
*   Die UI/UX muss über globale CSS-Variablen/Tailwind-Config pro `organization_id` umschaltbar sein.

---

## 2. URL-Modell (Kahoot-Logik)

| Rolle | URL | Zweck |
|---|---|---|
| Spieler | `/e/{inviteCode}` | Event-Landing: Team erstellen / beitreten |
| Teammate | `/e/{inviteCode}/team/{joinCode}` | Name eingeben → Lobby/Spiel |
| Captain Setup | `/e/{inviteCode}/captain` | Erstes Team |
| Lobby | `/e/{inviteCode}/lobby/{joinCode}` | QR, Start, Rollen |
| Spiel | `/e/{inviteCode}/play/{joinCode}` | Game-Player |
| Operator | `/cockpit/{inviteCode}` | GPS, Ranking, Eingriffe |
| Beamer | `/cockpit/{inviteCode}/show` | Live-Highscore Vollbild |
| Dev (intern) | `/admin/dev` | Events anlegen, JSON-Overrides |

Legacy `/join/*` und `/play/*` leiten auf `/e/*` um.

---

## 3. Onboarding & Identity (Phase 1 — Produktkern)

### Spieler-Flow
1. Link öffnen → `/e/{code}`
2. Team-Code oder „Erstes Team starten"
3. Name (2–32 Zeichen) → sofort in Lobby/Spiel
4. **Identity-Bar:** „Du bist Max · Captain" + „Das bin nicht ich" + „Team verwalten"
5. **Self-Healing:** `player_id` in localStorage; Refresh/Crash → automatisch wieder drin
6. **Takeover:** Gleicher Name, anderes Gerät → ein Dialog

### Rollen (menschenlesbar)
| Badge | Technisch | Bedeutung |
|---|---|---|
| Captain | `is_captain` | Start, Einladen, Team verwalten |
| GPS | `teams.navigator_player_id` | Ein Gerät bestätigt Orte |
| Mitspieler | default | Rätsel/Quiz auf jedem Gerät |

Default: Captain = GPS. Übertragbar in Lobby oder Operator-Cockpit.

### Operator (Zero-Ops)
* Cockpit ohne Spieler-Session
* GPS pro Level: An / Aus / Reset (Antwort `skip` wenn aus)
* Team Lead setzen per Klick
* Live-Ranking + Beamer-Modus
* Booking-API liefert `join_url`, `cockpit_url`, `show_url`

---

## 4. Feature-Roadmap

### Phase 1: B2B Booking, Zero-Auth & Team Setup — 🟢 Kern live
* Booking-API, Team-Codes, Self-Healing Sessions, Captain/GPS-Transfer, Cockpit v1

### Phase 2: Game-Engine & Multi-Device Sync — 🟡 Basis
* Realtime Sync, GPS via Team Lead, Punkte/Tipps — Medien-Player & Event-Highscore-UI offen

### Phase 3: Content & CMS — 🟢 Schema
* `global_levels` + `local_waypoints`, Trigger-Engine offen

### Phase 4: Analytics & Remote Control — 🟡 Basis
* `audit_logs`, Cockpit-Eingriffe — Deep Dashboard offen

**Architektur-Mandat (Omnichannel & Blaupausen):** Siehe [`GRID_ARCHITECTURE.md`](./GRID_ARCHITECTURE.md) — Mandat vs. Ist-Stand, Tabbrain/Exitmania-Integration, Ziel-Tracker-Pflege.

### Vertriebsmodell (Kurz)
- **Tabbrain:** Enterprise-Plattform (Landing Page, Buchung 3.000+ MA, **GRID-Token-Generierung**)
- **GRID:** Live-Engine, Sessions, Telemetrie — **kein** Enterprise-Shop
- **Exitmania:** Mechanik-Referenz = Archetyp 01 (`ASYMMETRIC_INFORMANT`), Content als JSON

---

## 5. Implementierungsstand

| Bereich | Status |
|---|---|
| Event-Landing `/e/[code]` | ✅ |
| Identity-Bar + „Das bin nicht ich" | ✅ |
| Operator-Cockpit + Beamer `/show` | ✅ |
| Content hot-reload (`content_revision`) | ✅ |
| GPS pro Level (Operator) | ✅ |
| Legacy URL Redirects | ✅ |
| Medien-Player | ⬜ |
| Trigger-Engine | ⬜ |
| Cockpit Realtime (WebSocket) | ⬜ (Poll 3–5s) |

### Migrationen
```bash
supabase db push
```
Neu: `20260615160000_event_content_revision.sql`

### Booking-API
```bash
curl -X POST https://gridos.vercel.app/api/v1/bookings \
  -H "Content-Type: application/json" \
  -H "x-grid-api-key: $GRID_BOOKING_API_KEY" \
  -d '{"title":"Acme Teambuilding","team_count":5,"players_per_team":8}'
```
Response: `join_url`, `cockpit_url`, `show_url`

---

**Nächster Schritt:** Medien-Player (Phase 2) + Cockpit Realtime-Channel + Trigger-Engine (Phase 3).
