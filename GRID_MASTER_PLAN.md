# GRID - Enterprise Experience OS (Architecture & Roadmap)

## 0. Meta-Rules für Cursor (KI-Instruktionen)
Als KI-Assistent (Cursor) bist du der Lead-Architekt dieses Projekts. Der Nutzer wird iterativ Features anfordern. Deine Aufgabe ist es, diese Features strikt nach den folgenden architektonischen Leitplanken zu implementieren. 
*   **Baue niemals isolierten Code:** Jeder Feature-Code muss die Multi-Tenancy- und API-First-Prinzipien respektieren.
*   **Phasen-Disziplin:** Weist der Nutzer dich an, ein Feature aus Phase 3 zu bauen, während Phase 1 nicht stabil ist, warne ihn und schlage vor, zuerst das Fundament zu beenden.

---

## 1. Core Architecture (Non-Negotiables)

### 1.1 Mandantenfähigkeit (Multi-Tenancy)
*   **Regel:** Jede Tabelle in Supabase (außer globalen Wörterbüchern) MUSS eine `organization_id` haben.
*   **Sicherheit:** Row Level Security (RLS) in Supabase muss so konfiguriert sein, dass `organization_id` A niemals Daten von `organization_id` B lesen/schreiben kann (strikte Trennung zwischen Exitmania und zukünftigen B2B-Kunden).

### 1.2 API-First & Content Decoupling (Die JSON-Engine)
*   **Regel:** GRID ist die Engine, nicht das Spiel. Ein Spiel-Level wird als strukturiertes JSON-Objekt geladen.
*   Das Frontend fungiert als "Player" (wie ein Videoplayer), der die JSON-Befehle interpretiert (z.B. zeige Video X von Cloudflare, zeige Iframe Y, fordere GPS-Check Z). 
*   **Ziel:** Die Dokumentation muss später öffentlich machbar sein, damit Third-Party-Entwickler Content für GRID bauen können.

### 1.3 UI-Theming (White-Label)
*   Die UI/UX muss über globale CSS-Variablen/Tailwind-Config pro `organization_id` (oder Event) umschaltbar sein (Exitmania-UI vs. Corporate-Kunden-UI).

---

## 2. Die Feature-Roadmap & Logik-Anforderungen

### Phase 1: B2B Booking, Zero-Auth & Team Setup
*   **Booking-Webhook:** Wenn ein externes System (z.B. Exitmania.com) ein Spiel bucht (z.B. "20 Personen, 5 Teams"), generiert GRID per API das Event und 5 eindeutige Team-Codes (oder Magic Links).
*   **Frictionless Onboarding (Klick & Play):** 
    *   Spieler klicken auf den Link -> vergeben Usernamen -> sind im Spiel. KEIN zwingender Supabase-Auth (Passwort/Email) für Endkunden.
    *   **Resilience:** Session-State wird im `localStorage` gespeichert. Wenn der Browser schließt, ist der Spieler beim erneuten Öffnen sofort wieder im Spiel.
    *   **Account-Handover:** Option implementieren: "Gerät übergeben/Spieler wechseln" (Session-Token wird invalidiert, Platz im Team wird frei für neuen User).
*   **Rollen-System & Captain:**
    *   Der Captain (Team-Leader) verwaltet das Team und weist Rollen zu (einige Aufgaben im JSON-Content können `role_specific` sein).
    *   Der Captain-Status kann jederzeit an ein anderes Teammitglied übertragen werden.

### Phase 2: Die Game-Engine & Multi-Device Sync
*   **Realtime-Sync:** Nutze Supabase Realtime (WebSockets). Wenn Spieler A "Lösen" drückt, erscheint bei Spieler B-E sofort ein Modal (Erfolg/Fehler/Tipp gekauft).
*   **Device & GPS Logik (Der Workaround):**
    *   Desktop-Geräte dürfen teilnehmen, haben aber kein GPS (Rolle: Rätsel-Löser).
    *   Für die GPS-Validierung einer Station (Geofencing) reicht es, wenn **nur das Gerät des Captains** am Ort ist. Dies löst das Problem fehlender Browser-Berechtigungen bei 80% der Teammitglieder.
*   **Game Mechanics:**
    *   **Medien:** Integration von Videos/Audios/Bildern via Cloudflare, HTML/Iframes.
    *   **Points & Economy:** Dynamisches Punktesystem (Abzüge bei Fehlern/Tipps).
    *   **Time-Decay:** Countdown-basierte Punktevergabe (schneller lösen = mehr Punkte).
    *   **Hints:** Bis zu 5 Tipps kaufbar pro Aufgabe (kostet Punkte).
*   **Live Highscore:** Einblendbar über das UI, zieht Echtzeit-Rankings innerhalb des aktuellen Events (durch Admin deaktivierbar).

### Phase 3: Die skalierbare Content- & CMS-Architektur (1900+ Städte)
*   **Die Datenbank-Trennung (EXTREM WICHTIG):**
    Um Spiele für 5000 Städte zu skalieren, OHNE Daten zu duplizieren, muss Cursor folgendes relationale Schema bauen:
    *   Table `global_levels`: Enthält die universelle Story, das Rätsel, das Video (Einmal gespeichert, gilt für alle Städte).
    *   Table `local_waypoints`: Enthält nur Stadt, GPS-Koordinate, Radius und den lokalen Einleitungstext ("Sucht die rote Tür am Alex").
    *   Das CMS fügt diese beim Spielstart als Joined-View zusammen. Ändert der Admin einen Tipp im `global_level`, ist er sofort für alle 5000 Städte live.
*   **Trigger-System (Event-basiert):**
    Aufgaben öffnen sich nicht nur sequenziell, sondern basierend auf Triggern:
    *   `time_trigger`: "10 Minuten nach Event-Start".
    *   `distance_trigger`: "100 Meter nach Abschluss von Level 3".
    *   `logic_trigger`: "Nachdem Level 1 gelöst wurde".

### Phase 4: Admin Control & Deep Analytics
*   **Remote Admin Actions (Echtzeit-Eingriffe):**
    *   Admin kann per Dashboard live in ein laufendes Event eingreifen via WebSockets.
    *   Funktionen: GPS-Zwang global oder für einzelne Teams deaktivieren, Geofence-Radius temporär vergrößern, GPS-Koordinaten eines Events im Notfall überschreiben.
*   **Deep Tracking (Data Engine):**
    *   Alle Aktionen werden als Stream in eine `audit_logs` Tabelle geschrieben (JSONB-Payload).
    *   Zu tracken sind: Dauer pro Aufgabe, Klick-Raten, genutzte Rollen, GPS-Bewegungen, Tipp-Nutzung, Account-Wechsel.
    *   Ziel: Spätere ONA (Organizational Network Analysis) für HR-Dashboards.

---

## 3. Implementierungsstand (Codebase)

| Bereich | Status | Hinweise |
|---|---|---|
| Multi-Tenancy | ✅ Basis | `organizations`, `organization_id` auf `events`/`teams`, Default-Tenant `exitmania` |
| Phase 1 Booking | ✅ API | `POST /api/v1/bookings` mit Header `x-grid-api-key` → Env `GRID_BOOKING_API_KEY` |
| Phase 1 Handover | ✅ | `handoverSession` in Lobby, Captain muss vorher Rolle übertragen |
| Phase 1 Captain-Transfer | ✅ | `transferCaptain`, Rollen via `assignPlayerRole` |
| Phase 2 Realtime | ✅ | `team_sync_events`, `useTeamSync` |
| Phase 2 Captain-GPS | ✅ | GPS-Check nur auf Captain-Gerät |
| Phase 2 Punkte/Tipps | 🟡 Basis | `score` + `hints_used` in `game_state`, `purchaseHint` Server Action |
| Phase 2 Medien/Highscore | ⬜ Offen | Schema-Felder vorhanden, UI/Player fehlt |
| Phase 3 Content | ✅ Schema | `global_levels` + `local_waypoints`, Legacy-Fallback `route_templates` |
| Phase 4 Audit | 🟡 Basis | `audit_logs` + `writeAuditLog`, kein Admin-Dashboard |
| White-Label | 🟡 Basis | `organizations.theme_config`, CSS-Injection noch minimal |

### Migration ausführen

```bash
# Supabase SQL Editor oder CLI
supabase db push
```

Neue Migration: `supabase/migrations/20260615120000_architecture_foundation.sql`

### Booking-API Beispiel

```bash
curl -X POST https://gridos.vercel.app/api/v1/bookings \
  -H "Content-Type: application/json" \
  -H "x-grid-api-key: $GRID_BOOKING_API_KEY" \
  -d '{
    "title": "Acme Corp Teambuilding",
    "team_count": 5,
    "players_per_team": 4,
    "city_slug": "berlin",
    "booking_reference": "exitmania-order-12345"
  }'
```

Captain-Flow für vorgebuchte Teams: `/join/{inviteCode}/captain?team={joinCode}`

---

**Nächster empfohlener Schritt:** Remote-Admin-Dashboard (Phase 4) + Medien-Player im Level-UI (Phase 2) + Trigger-Engine (Phase 3).
