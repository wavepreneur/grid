# GRID — Architektur-Mandat vs. Implementierungsstand

Dieses Dokument ist der **Kompass für Entwicklung und Marketing**. Bei jedem Feature prüfen: Entspricht es dem Mandat? Wenn ja — Ziel-Tracker auf der Landingpage (`#ziel-tracker`) und diese Datei aktualisieren.

Verwandt: [`GRID_MASTER_PLAN.md`](./GRID_MASTER_PLAN.md) (Roadmap, URLs, Phasen).

---

## Mandat (Non-Negotiables)

GRID ist **keine isolierte App**, sondern eine **Zero-Ops-Plattform** (Next.js App Router + Supabase). Kund:innen erstellen Erlebnisse; GRID liefert Engine, Sync und Daten.

---

## 1. Geräte- & Standort-Agnostik (Die Matrix)

### Mandat

- Ein Team darf gleichzeitig enthalten: Spieler A (GPS/Smartphone), Spieler B (Desktop), Spieler C (Beamer/Arena).
- Das Frontend fragt **nicht** „Welches Spiel?“, sondern: **Welche Rolle habe ich?** und **Welche Hardware braucht mein Blueprint-Step?** (z. B. Geolocation).

### Ist-Stand

| Anforderung | Status | Code / Schema |
|---|---|---|
| GPS nur auf Team-Lead-Gerät | ✅ Live | `teams.navigator_player_id`, `useGeolocation(gpsEnabled)`, `level-validation.ts` |
| Desktop + Mobile im selben Team | ✅ Live | Browser-UI, `level.type` digital/quiz/gps |
| Rollen Captain / GPS / Mitspieler | ✅ Live | `grid_player_role`, Lobby + Cockpit-Transfer |
| Beamer-Ansicht | ✅ Live (Operator) | `/cockpit/{code}/show` — **kein Team-Spieler**, sondern Operator-Display |
| Blueprint-Step steuert Hardware | ⬜ Vision | Heute: `level.type` + `isNavigator`, nicht `blueprint_step` |
| `device_type` (mobile/desktop) | ⬜ Schema only | Spalte existiert, wird im Code **nicht gesetzt** |
| Alpha/Beta/Gamma Views | ⬜ Vision | Nicht implementiert |

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
| Exitmania (konkretes Spiel) | ✅ Live | Kacheln, Tipps, GPS-Karte, 10 Levels |
| `blueprint_slug` / Archetyp-Routing | ⬜ Vision | Fehlt in Schema und Frontend |
| ASYMMETRIC_INFORMANT | ⬜ Vision | Keine Alpha/Beta/Gamma-Komponenten |
| TIME_DECAY_SPRINT | ⬜ Vision | Kein Server-Decay, keine Joker in `game_state` |
| COOPERATIVE_COLLECTIVE | ⬜ Vision | Kein Voting, keine Fraktionen |

**Wichtig:** Exitmania ist ein **Referenz-Modul**, noch **keine** generische Blaupausen-Engine. Marketing-Blaupausen = Zielbild.

**Nächster Schritt:** `content_config.blueprint_slug` + `components/blueprints/` mit je eigenem Step-Renderer; Server-Actions pro Archetyp.

---

## 3. Live-Daten & Filtering

### Mandat

- Tabelle **`activity_logs`** mit Metadaten: `department_id`, `team_id`, `location`.
- Admin-Dashboard: Highscores und Live-Aktivität **filterbar** nach Abteilung und Team (Echtzeit).

### Ist-Stand

| Anforderung | Status | Code / Schema |
|---|---|---|
| `activity_logs` | ⬜ Vision | **Nicht vorhanden** — heute: `audit_logs` |
| `audit_logs` (Basis-Telemetrie) | 🟡 Basis | `lib/grid/audit-log.ts`, Events in `game.ts`, `lobby.ts`, `cockpit.ts` |
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

1. **Blueprint-Routing** — `blueprint_slug` + Step-Capabilities (entblockt Matrix-Mandat)
2. **ASYMMETRIC_INFORMANT** — erstes archetyp-eigenes UI (Referenz für Engine)
3. **activity_logs + Cockpit-Filter** — schließt Analytics-Lücke ohne Großgruppen
4. **TIME_DECAY_SPRINT** — Server-Timer + Joker
5. **Canva/CMS + KI-Import** — Creator-Flow für Nicht-Devs
6. **COOPERATIVE_COLLECTIVE** — Voting / 1.000+ (skalierungskritisch)

---

## 6. Schnellreferenz (Dateien)

| Bereich | Pfade |
|---|---|
| Rollen & GPS | `lib/grid/level-validation.ts`, `lib/grid/team-session.ts`, `components/game/exitmania-level-view.tsx` |
| Sync | `lib/hooks/use-team-sync.ts`, `supabase/migrations/20260614200000_phase2_realtime_sync.sql` |
| Content | `lib/grid/content-loader.ts`, `lib/grid/level-types.ts` |
| Operator | `app/actions/cockpit.ts`, `components/cockpit/event-cockpit-show.tsx` |
| Telemetrie | `lib/grid/audit-log.ts`, `supabase/migrations/20260615120000_architecture_foundation.sql` |
| Marketing-Kompass | `components/marketing/grid-landing-page.tsx` |

---

*Zuletzt abgeglichen mit Codebase: Juni 2026.*
