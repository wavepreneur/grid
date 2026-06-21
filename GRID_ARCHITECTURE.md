# GRID — Architektur-Mandat vs. Implementierungsstand

Dieses Dokument ist der **Kompass für Entwicklung und Marketing**. Bei jedem Feature prüfen: Entspricht es dem Mandat? Wenn ja — Ziel-Tracker auf der Landingpage (`#ziel-tracker`) und diese Datei aktualisieren.

Verwandt: [`GRID_MASTER_PLAN.md`](./GRID_MASTER_PLAN.md) (Roadmap, URLs, Phasen).

---

## Mandat (Non-Negotiables)

GRID ist **keine Content-Plattform** (kein Canva, kein B2B-Kahoot). GRID ist eine **zustandsbasierte Engine (Finite State Machine)** mit **Zero-Ops Multiplayer-Infrastruktur** (Next.js App Router + Supabase).

- **Variable:** Content als JSON (`global_levels`, `route_override`, Blueprint-Slugs)
- **Fix:** Verhaltens-Engine, asymmetrische Sync-Schicht, ephemeral Team-Tokens — **keine persistenten User-Accounts**
- **Landing Page = System of Record (Engine):** [`gridos.vercel.app`](https://gridos.vercel.app/) — Architektur-Verfassung, **nicht** Enterprise-Kauf-Funnel (das ist **Tabbrain**)

---

## 0. Vertriebs- & Integrationsmodell (Tabbrain → GRID)

GRID ist die **Live-Engine** — keine Enterprise-Landingpage, kein Shop. **Tabbrain** ist die **Enterprise-Plattform** für Kund:innen, die z. B. ein Erlebnis für 3.000 Mitarbeitende buchen. **Exitmania** liefert die **validierten Spielmechaniken** (Archetyp 01) als JSON-Referenz.

### Drei Ebenen

| Ebene | Produkt | Zielgruppe | Rolle |
|---|---|---|---|
| **Enterprise GTM** | **Tabbrain** (`tabbrain.com`) | HR, L&D, Event-Leiter (500–3.000+ MA) | Landing Page, Buchung, Content-Konfiguration, **Token-Generierung für GRID** |
| **Live-Engine** | **GRID** (`gridos.app` / `engine.gridos.app`) | Spieler + Operator | FSM, Realtime-Sync, Cockpit, **Analytics-Hoheit** (`audit_logs`) |
| **Mechanik-Referenz** | **Exitmania** | Content-Quelle / Field-Proof | Archetyp 01 `ASYMMETRIC_INFORMANT` — JSON, nicht separates Engine-Produkt |

**GRID-Landingpage** ([gridos.vercel.app](https://gridos.vercel.app/)) = Verfassung für Engine, Architektur und Investoren — **nicht** der Enterprise-Kauf-Funnel. Enterprise-Kund:innen starten auf **Tabbrain**.

### Rollentrennung

| Partei | Wo | Account |
|---|---|---|
| **Enterprise-Käufer (HR)** | Tabbrain Landing → Buchung | Tabbrain-Account; danach Magic Link → GRID-Dashboard (Tabbrain-Branding) |
| **Spieler (3.000 MA)** | Redirect auf GRID Play-URL | **Kein Account** — ephemeral Team-Token (`player_id` + Resume-JWT) |
| **Tabbrain** | Commerce, Story/JSON, Token-Ausstellung | Generiert bei Buchung GRID-Session via Booking-API |
| **GRID** | Live-Infrastruktur + Telemetrie | `organizations`-Tenant, Sessions, `audit_logs` |
| **Exitmania** | Content-Mechanik (JSON) | Kein Enterprise-Shop — liefert Blueprint-Inhalt an Tabbrain/GRID |

### Buchung → Token → Spiel (Enterprise-Flow)

```text
1. Enterprise-Kunde auf tabbrain.com
   → Landing Page, Paket wählen (z. B. 3.000 Spieler, Compliance-Onboarding)
   → Tabbrain speichert Content (Story, Texte, Szenario-JSON)

2. Tabbrain generiert GRID-Session (Server-to-Server)
   POST /api/v1/bookings  (x-grid-api-key)
   organization_slug: "tabbrain"
   → GRID erzeugt Event, Teams, invite_code / signierte Play-Tokens
   → Response: play_url, cockpit_url, buyer_dashboard_url

3. Fliegender Wechsel (Spieler merken Tabbrain nicht)
   play.tabbrain.com/…  →  engine.gridos.app/e/{inviteCode}
   Zero-Auth: Name tippen, sofort im Team

4. HR-Manager
   Magic Link (von Tabbrain ausgelöst) → GRID Mission Control
   Tabbrain-Branding (`organizations.theme_config`), Daten nativ in GRID
```

**Token-Hoheit:** Tabbrain **stellt aus** (Buchungsmoment), GRID **validiert & betreibt** (Session-Laufzeit). Analytics bleiben in GRID.

### Archetyp ↔ Exitmania

**Archetyp 01 `ASYMMETRIC_INFORMANT` = Exitmania-Mechanik als Referenz-Implementierung.**

- Fragmentierte Informationsströme (GPS-Navigator vs. Mitspieler)
- Ein Team, mehrere isolierte Geräte-Rollen
- Lösbar nur durch Echtzeit-Synchronisation

Tabbrain bucht das Erlebnis; Exitmania-JSON (oder kundenspezifisches JSON im selben Blueprint-Format) wird injiziert. Technischer Pfad: `blueprint_slug: "exitmania"` → Archetyp-Registry — **Refactor, kein Rewrite**.

### Ist-Stand Integration

| Anforderung | Status | Code / Gap |
|---|---|---|
| GRID Booking-API (Session provisionieren) | ✅ Live | `POST /api/v1/bookings` — Tabbrain muss Caller sein |
| Tabbrain als `organization` | 🟡 Basis | Migration `20260620100000_tabbrain_blueprint.sql` |
| Tabbrain → Token bei Buchung | 🟡 Basis | Booking-API `blueprint_slug: tabbrain`, Org-Default |
| Enterprise-Landing auf Tabbrain | ⬜ Extern | Nicht in diesem Repo — Tabbrain-eigenes Produkt |
| Content-JSON von Tabbrain an GRID | 🟡 Basis | `global_levels` / `route_override`; Booking-API: `content_pack_slug`, `route_override`, idempotent `booking_reference` |
| Exitmania → GRID Session (Loquiz-Ersatz) | 🟡 Phase 0 | `POST/GET /api/v1/bookings`, `GET /api/v1/events/{code}/status`; Exitmania `create-grid-session` |
| Spieler: Zero-Auth + ephemeral Session | ✅ Live | `/e/{code}`, Resume-Tokens |
| HR: Magic-Link-Dashboard (Tabbrain-Branding) | ⬜ Vision | Heute: Operator-Cockpit `/cockpit/{code}` ohne Buyer-Login |
| Analytics-Hoheit bei GRID | 🟡 Basis | `audit_logs` in GRID |
| Exitmania = Archetyp 01 Referenz | ✅ Live | `blueprint_slug: exitmania`, GPS an |

**Nächster Integrations-Schritt:** Exitmania-Pilot (1 Spiel, `games.grid_enabled`) → Loquiz parallel; Tabbrain nutzt dieselbe Booking-API mit `organization_slug: tabbrain`.

---

## 1. Geräte- & Standort-Agnostik (Die Matrix)

### Mandat

- Ein Team darf gleichzeitig enthalten: Spieler A (GPS/Smartphone), Spieler B (Desktop), Spieler C (Beamer/Arena).
- Das Frontend fragt **nicht** „Welches Spiel?“, sondern: **Welche Rolle habe ich?** und **Welche Hardware braucht mein Blueprint-Step?** (z. B. Geolocation).

### Ist-Stand

| Anforderung | Status | Code / Schema |
|---|---|---|
| GPS nur auf Alpha-Gerät | ✅ Live | `teams.navigator_player_id` (= Alpha), `canUnlockGps`, `level-validation.ts` |
| Desktop + Mobile im selben Team | ✅ Live | Browser-UI, `level.type` digital/quiz/gps |
| Rollen Alpha / Beta / Gamma | ✅ Live | `grid_player_role`, `teams.beta_player_id`, `lib/grid/archetype-roles.ts`, Lobby-Transfer |
| Legacy Captain / Navigator | ✅ Kompatibel | `is_captain` = Alpha, `navigator_player_id` folgt Alpha |
| Beamer-Ansicht | ✅ Live (Operator) | `/cockpit/{code}/show` — **kein Team-Spieler**, sondern Operator-Display |
| Blueprint-Step steuert Hardware | ⬜ Vision | Heute: `level.type` + `canUnlockGps`, nicht `blueprint_step` |
| `device_type` (mobile/desktop) | ⬜ Schema only | Spalte existiert, wird im Code **nicht gesetzt** |
| Alpha/Beta/Gamma Views | ✅ Beta (Exitmania) | Alpha: GPS-Map · Beta: Rätselblatt/Tiles · Gamma: Aufgaben-Panel |

**Nächster Schritt:** `device_type` beim Join setzen; Blueprint-Step-Resolver (`resolveStepCapabilities(role, step)`) vor `ui_layout`-Switch.

---

## 2. Blaupausen-Engine

### Mandat

UI-Logik **strikt getrennt vom Inhalt**, archetyp-basiert:

| Archetyp | Kern |
|---|---|
| `ASYMMETRIC_INFORMANT` | 3 Rollen-Views: Alpha (Map/Target), Beta (zeitgesteuerte Matrix), Gamma (Code-Input only) |
| `TIME_DECAY_SPRINT` | Server-synchroner Timer, Punkte/sec Abzug, Joker (Freeze vs. Fixpunkte) |
| `COOPERATIVE_COLLECTIVE` | Echtzeit-Polling, Fraktionen, Mehrheitsentscheid → Session-State |

### Ist-Stand

| Anforderung | Status | Code / Schema |
|---|---|---|
| JSON-Content-Engine | 🟡 Basis | `global_levels`, `route_override`, `content-loader.ts` |
| `ui_layout` Module | 🟡 Basis | `exitmania` live; `quiz` / `training` nur Typen |
| Exitmania (konkretes Spiel) | ✅ Live | Kacheln, Tipps, GPS-Karte, 10 Levels — **= Referenz für ASYMMETRIC_INFORMANT** |
| `blueprint_slug` / Archetyp-Routing | ✅ Live | `lib/grid/blueprints.ts`, `content_config.blueprint_slug` |
| ASYMMETRIC_INFORMANT | 🟡 Referenz live | Exitmania + Tabbrain (no GPS) share mission shell |
| TIME_DECAY_SPRINT | ⬜ Vision | Kein Server-Decay, keine Joker in `game_state` |
| COOPERATIVE_COLLECTIVE | ⬜ Vision | Kein Voting, keine Fraktionen |

**Wichtig:** Exitmania ist die **live Referenz** für Archetyp 01 — kein separates Produkt. Marketing-Archetypen 02/03 = Zielbild.

**Nächster Schritt:** `content_config.blueprint_slug: "exitmania"` + Archetyp-Registry; Tabbrain liefert JSON, Engine parst.

---

## 2b. Pulse-Sprint-Protokoll (Macro vs. Micro)

### Mandat

Zwei Deployment-Säulen unter **einer Engine**:

| Säule | Dauer | Transport | Produkt |
|---|---|---|---|
| **Macro-Events** | ~90 Min | WebSocket FSM (`sync_live`) | Exitmania · Tabbrain |
| **Micro-Pulses** | ~10 Min | REST POST (`async_pulse`) | Slack · MS Teams · wöchentliche Streaks |

Micro-Pulses dürfen **keine permanenten WebSockets** nutzen. Fortschritt = stateless `pulse_player_states`.

**Global Team Intelligence Score** = `stress_index` (sync) − `collaboration_streak` (async) — beide in `domain_telemetry_metrics`.

### Ist-Stand

| Anforderung | Status | Code / Schema |
|---|---|---|
| `events.play_mode = sync_live` | ✅ Schema | Migration `20260623100000_pulse_sprint_telemetry.sql` |
| `pulse_sessions` / `pulse_player_states` | ✅ Schema | REST-only async rooms |
| `pulse_programs` (B2B ARR / Jahres-Landing) | ✅ Schema | Org container + streak interval |
| `domain_telemetry_metrics` | ✅ Schema | Unified `telemetry_envelope` JSON |
| Envelope builder | ✅ Code | `lib/grid/telemetry-envelope.ts`, `domain-telemetry.ts` |
| REST API (pulse POST) | ⬜ Vision | Nächster Implementierungsschritt |
| Slack/Teams Bot | ⬜ Vision | Tabbrain / Integration layer |

**Unified envelope:** `lib/grid/telemetry-envelope.ts` — `schema_version: 1`, `play_mode`, `content_config`, `performance`.

---

## 3. Live-Daten & Filtering

### Mandat

- Tabelle **`activity_logs`** mit Metadaten: `department_id`, `team_id`, `location`.
- Admin-Dashboard: Highscores und Live-Aktivität **filterbar** nach Abteilung und Team (Echtzeit).

### Ist-Stand

| Anforderung | Status | Code / Schema |
|---|---|---|
| `activity_logs` | ⬜ Vision | **Nicht vorhanden** — heute: `audit_logs` + `domain_telemetry_metrics` |
| `audit_logs` (Ops-Rohlog) | 🟡 Basis | `lib/grid/audit-log.ts` |
| `domain_telemetry_metrics` (Master-Analytik) | 🟡 Schema | sync_live + async_pulse unified envelope |
| `teams.department` / `teams.region` | ✅ Live | Captain-Setup, `team_lobby_snapshot` |
| Metadaten in Logs denormalisiert | ⬜ Vision | Logs haben `team_id`, Abteilung nur via Join |
| Cockpit Live-Ranking | 🟡 Basis | `getEventCockpitSnapshot`, Poll 3s, **ohne Filter** |
| Beamer `/show` | ✅ Live | Sortiert alle Teams nach Score |
| Filter nach Abteilung/Standort | ⬜ Vision | Keine Queries, kein Admin-Dashboard |
| Post-Event Team-DNA Analyse | ⬜ Vision | — |

**Nächster Schritt:** Migration `activity_logs` (oder `audit_logs` erweitern) + Cockpit-Filter-UI + denormalisierte Metadaten bei `writeAuditLog`.

---

## 4. Ziel-Tracker ↔ Code (Pflege-Regel)

| Badge | Bedeutung | Wann setzen |
|---|---|---|
| **Live** | Produktiv nutzbar, im Code nachweisbar | Feature shipped + manuell getestet |
| **In Arbeit** | Teilweise / Pilot / Schema ohne UI | Basis existiert, Mandat noch nicht erfüllt |
| **Vision** | Noch nicht gebaut | Nur Spezifikation oder Marketing-Ziel |

Quelle der Wahrheit für Marketing: `components/marketing/grid-landing-page.tsx` → `goalTracker`.

Bei jedem Release prüfen:

1. Stimmt der Badge noch?
2. Stimmt der Copy-Text in Hero / Blaupausen / Mission Control?
3. Dieses Dokument aktualisieren (Abschnitt „Ist-Stand“).

---

## 5. Empfohlene Build-Reihenfolge

1. **Blueprint-Routing** — `blueprint_slug`; Exitmania → `ASYMMETRIC_INFORMANT` formal registrieren
2. **Tabbrain Booking-Contract** — API: `content_payload` + Redirect-URLs; Org `tabbrain` anlegen
3. **activity_logs + Cockpit-Filter** — Analytics-Hoheit in GRID; Käufer-Dashboard v0 (Magic Link)
4. **TIME_DECAY_SPRINT** — zweiter Archetyp (Compliance-Stress)
5. **COOPERATIVE_COLLECTIVE** — Voting / 1.000+ (skalierungskritisch)

**Nicht in GRID bauen:** Content-Shop, Zahlungsabwicklung, Story-Editor — das bleibt Tabbrain/Exitmania.

---

## 6. Schnellreferenz (Dateien)

| Bereich | Pfade |
|---|---|
| Rollen & GPS | `lib/grid/level-validation.ts`, `lib/grid/team-session.ts`, `components/game/exitmania-level-view.tsx` |
| Sync | `lib/hooks/use-team-sync.ts`, `supabase/migrations/20260614200000_phase2_realtime_sync.sql` |
| Content | `lib/grid/content-loader.ts`, `lib/grid/level-types.ts` |
| Operator | `app/actions/cockpit.ts`, `components/cockpit/event-cockpit-show.tsx` |
| Telemetrie | `lib/grid/audit-log.ts`, `supabase/migrations/20260615120000_architecture_foundation.sql` |
| Booking / Tabbrain-Integration | `app/api/v1/bookings/route.ts`, `lib/grid/organizations.ts` |
| Marketing-Kompass | `components/marketing/grid-landing-page.tsx` |

---

*Zuletzt abgeglichen mit Codebase: Juni 2026.*
