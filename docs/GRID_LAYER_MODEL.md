# GRID Layer-Modell — Single Source of Truth

> **Für Agenten und Entwickler:** Diese Datei ist der Kompass für GRID Studio und Content-Architektur.
> Vor jedem Studio-Feature lesen. Bei Abweichungen: Feature stoppen oder hier dokumentieren warum.

Verwandt: [`GRID_ARCHITECTURE.md`](../GRID_ARCHITECTURE.md), [`docs/EXITMANIA_GRID_INTEGRATION.md`](./EXITMANIA_GRID_INTEGRATION.md)

---

## 1. GRID ist nicht Loquiz

| | Loquiz | GRID |
|---|--------|------|
| Modell | Viele Partner erstellen viele Spiele | **Wenige Spiele**, maximale Skalierung |
| Skalierung | Horizontal (mehr Creator) | Vertikal (mehr Städte, Events, Sprachen, Teams) |
| Content | Monolith pro Spiel | **Modulare Layer** mit Verknüpfungen |
| Studio-Ziel | Beliebige Spiele bauen | Layer pflegen, Runtime-Profile schalten |

**Leitfrage vor jedem Feature:**

1. Hilft es, **Layer 1** (standortbezogen) pro Stadt schnell anzupassen?
2. Hilft es, **Layer 2** (global/Mission) konsistent zu halten?
3. Hilft es, **Layer 3** (Rollen, Bonus, Trigger) abzubilden?
4. Hilft es, **Runtime-Switches** (Indoor, Sprache, Event vs. Pulse)?
5. Nutzt es **Alpha/Beta/Gamma**-Asymmetrie?

Wenn **nein** → wahrscheinlich Loquiz-Noise, **nicht** bauen.

---

## 2. Die drei Content-Layer

Layer sind **Bausteine**, kein festes 3-Stufen-Rezept. Spiele kombinieren sie frei.

### Layer 1 — Geo / Umgebung (standortbezogen)

**Was der Spieler erlebt:** Karte → Wegpunkt → Umgebungs-Quiz (Multiple Choice).

| Eigenschaft | Wert |
|-------------|------|
| Skalierung | Pro **Stadt** / Standort unterschiedlich |
| GPS | Ja (Outdoor); Indoor-Fallback ohne GPS |
| DB (Runtime) | `local_waypoints` + stadt-spezifische Studio-Tasks |
| Studio-Feld | `studio_tasks.layer = 1`, `city_slug`, GPS in `overrides` |

**Typische Spiele:** Nur Layer 1 (+ optional Layer-3-Bonus) = Stadt-Entdecker.

### Layer 2 — Mission (global identisch)

**Was der Spieler erlebt:** Quiz gelöst → Freischalt-Animation → Mission-Level (Rätselblatt, Tiles).

| Eigenschaft | Wert |
|-------------|------|
| Skalierung | **Global gleich** in allen Städten |
| GPS | Nein (digital/indoor) |
| DB (Runtime) | `global_levels` + Studio-Tasks Layer 2 |
| Studio-Feld | `studio_tasks.layer = 2` |

**Typische Spiele:** Layer 2 + 3 = Story/Mission ohne GPS.

### Layer 3 — Asymmetrie / Bonus (Rollen & Trigger)

**Was der Spieler erlebt:** Bonusaufgaben, unterschiedliche Views pro Rolle, erzwungene Kommunikation.

| Eigenschaft | Wert |
|-------------|------|
| Skalierung | Eigene Schicht, verknüpft mit 1/2 |
| Rollen | Alpha, Beta, Gamma oder ganzes Team |
| Trigger | Aufgabe gelöst, Punkte, Spielzeit, GPS erreicht |
| DB (Runtime) | `logic_rules` + Studio-Tasks Layer 3 |
| Studio-Feld | `studio_tasks.layer = 3`, `role_assignment` |

**Typische Spiele:** Nur Layer 3 = **Micro-Pulse** (Slack, ~10 Min, REST).

---

## 3. Spiel-Profile (Layer-Kombinationen)

| Profil | Layer | Use Case |
|--------|-------|----------|
| **Vollständig** | 1 + 2 + 3 | Exitmania Standard (GPS → Mission → Bonus) |
| **Stadt-Entdecker** | 1 (+ 3 optional) | Orte entdecken, zwischendrin Bonus |
| **Mission** | 2 + 3 | Indoor/Story ohne GPS |
| **Micro-Pulse** | 3 | Slack/Teams, asymmetrische Kurzaufgaben |
| **Minimal** | 1 oder 3 | Spezialfälle |

Im Studio: `studio_games.active_layers` (Array `[1,2,3]`).

Code: `lib/cms/layer-model.ts` → `LAYER_GAME_PRESETS`.

---

## 4. Runtime-Profile (Outdoor ↔ Indoor)

Gebucht: 3 Layer Outdoor. Es regnet → **ein Klick** auf Indoor.

| Modus | Layer 1 | Layer 2 | Layer 3 |
|-------|---------|---------|---------|
| **Outdoor** | GPS-Wegpunkte + Outdoor-Quiz | Unverändert | Outdoor-Bonus (wenn `context=outdoor`) |
| **Indoor** | Ersetzt durch **Indoor-Default-Tasks** (ohne GPS) | Unverändert | Indoor-Bonus (wenn `context=indoor`) |

Speicherort:

- **Studio (Definition):** `studio_games.runtime_profiles` (JSON)
- **Live (Laufzeit):** `events.content_config.content_mode` = `"outdoor"` | `"indoor"`

Content-Loader (`lib/grid/content-loader.ts`) muss Tasks nach `content_mode` filtern — **Runtime-Implementierung: Roadmap**.

---

## 5. Weitere Skalierungs-Dimensionen

Ein Game-Template skaliert über:

| Dimension | Mechanismus |
|-----------|-------------|
| **Städte** | Layer 1 pro `city_slug`; Layer 2 global |
| **Indoor/Outdoor** | Runtime-Profile + `content_mode` |
| **Sprache** | Pro Team andere Sprache im selben Event (`teams.language` — Roadmap) |
| **Rollen** | Layer 3 + Alpha/Beta/Gamma Engine |
| **Multiplayer** | Viele Teams, ein Snapshot, WebSocket FSM |
| **Telemetrie** | Qualitative Daten (Rollen-Handoffs, Latenz) — nicht nur Quiz-Scores |

---

## 6. Datenbank-Mapping

### Runtime (bestehend)

```text
Layer 2  →  global_levels.content
Layer 1  →  local_waypoints (GPS + intro_text) ⨝ global_level_id
Layer 3  →  logic_rules (Studio) / triggers in level definitions

events.content_config     → blueprint, city_slug, content_pack_slug, content_mode
events.route_override     → Buchungs-Deltas (Kunden-Override Layer 1)
events.studio_game_version_id  → eingefrorener Snapshot
```

### Studio (neu / erweitert)

```text
studio_tasks.layer              → 1 | 2 | 3
studio_tasks.content_context    → outdoor | indoor | any
studio_tasks.role_assignment    → alpha | beta | gamma | team | none

studio_games.active_layers      → [1, 2, 3]
studio_games.runtime_profiles   → outdoor/indoor Profile JSON
```

### Getrennte Daten, intelligente Verknüpfung

- Layer-2-Daten: einmal pflegen, überall gleich
- Layer-1-Daten: eigene Schicht pro Stadt (eigene Tasks / Waypoints)
- Layer-3-Daten: eigene Schicht mit Triggern und Rollen
- **Verknüpfung** über Game-Snapshot + Logic Rules, nicht über Voll-Duplikate

---

## 7. Kunden-Override (Layer 1)

Kunden, die ein Spiel gekauft haben, können **vor dem Spiel** per Formular:

- GPS-Koordinaten überschreiben
- Umgebungs-Quizzes anpassen

Technisch: `events.route_override` (nur Deltas, kein neues Spiel).

Exitmania/Tabbrain ruft Booking-API mit `route_override` auf — siehe Integrations-Doku.

---

## 8. Deployment-Formen (Macro vs. Micro)

| Form | Layer | Transport | Dauer |
|------|-------|-----------|-------|
| **Macro-Event** | 1+2+3 (beliebig) | WebSocket FSM | ~90 Min |
| **Micro-Pulse** | meist nur 3 | REST (`pulse_sessions`) | ~10 Min |

Gleiche Engine, unterschiedliches Layer-Profil und Transport — kein separates Produkt.

---

## 9. Studio-UI-Struktur (Soll-Zustand)

```text
Spiel-Editor
├── Einstellungen (Name, Sprache, GPS-Flag)
├── Layer-Profil          ← Welche Layer aktiv? Indoor-Fallback?
├── Layer 1 — Geo         ← Karte, Wegpunkte, Stadt-Tasks
├── Layer 2 — Mission     ← Globale Level-Reihenfolge
└── Layer 3 — Bonus       ← Rollen-Aufgaben, Trigger (Logic Rules)

Aufgaben-Bibliothek
└── Neutrale Aufgaben (kein Layer) — gelten für alle Spiele

Spiel-Editor
├── Layer-Profil
├── Drei Spalten: Geo | Mission | Bonus (Drag & Drop aus Bibliothek)
│   └── Layer-Config am Spiel-Link (studio_game_tasks), nicht an der Aufgabe
└── Logik-Vorschau (Modal)
```

**Nicht priorisieren:** Loquiz-Flow-Modi (Rogain/Open) als Haupt-UX — nur wenn Layer-2-Sequenzierung sie braucht **und** Runtime-Engine sie unterstützt.

---

## 10. Ist-Stand vs. Roadmap

| Feature | Status | Hinweis |
|---------|--------|---------|
| Alpha/Beta/Gamma Runtime | ✅ Live | `lib/grid/archetype-roles.ts` |
| global_levels + local_waypoints | ✅ Live | Layer 1/2 Trennung in Runtime |
| Studio Layer-Felder (DB) | ✅ Schema | Migration `20260710140000_studio_layers.sql` |
| Studio Layer-UI | 🟡 Basis | Layer-Profil + gefilterte Panels |
| Logic Rules kompilieren | ✅ Live | Publish-Snapshot |
| Logic Rules **zur Laufzeit** | ⬜ Roadmap | Heute: linear `current_level + 1` |
| content_mode Indoor-Switch | 🟡 Schema | `runtime_profiles` + `content_config` |
| content_mode im Loader | ⬜ Roadmap | Filter Layer 1/3 nach Kontext |
| Sprache pro Team | ⬜ Roadmap | — |
| Kunden-Override Formular | ⬜ Roadmap | `route_override` API existiert |
| Micro-Pulse REST API | ⬜ Roadmap | Schema vorhanden |

---

## 11. Build-Reihenfolge (priorisiert)

1. **Layer-Modell im Studio** — Profil, Task-Layer, Publish-Snapshot mit Metadaten
2. **Runtime content_mode** — Content-Loader filtert nach Outdoor/Indoor
3. **Logic-Engine zur Laufzeit** — Layer-3-Trigger + Layer-2-Freischaltung
4. **Kunden-Override UI** — Formular → `route_override`
5. **Micro-Pulse API** — Layer-3-only Sessions
6. **Sprache pro Team**

**Nicht bauen (ohne Layer-Bezug):**

- Generische Loquiz-Klon-Features (Match, Tour-Galerie als Hauptprodukt)
- Partner-Self-Service CMS für beliebige Spiele
- Checkout/Commerce in GRID

---

## 12. Code-Referenzen

| Bereich | Pfad |
|---------|------|
| Layer-Typen & Presets | `lib/cms/layer-model.ts` |
| Studio-Typen | `lib/cms/types.ts` |
| Logic Rules / Layer 3 | `lib/cms/logic-rules.ts` |
| Layer-Profil UI | `components/cms/games/game-layer-profile-panel.tsx` |
| Layer-Panels | `components/cms/games/game-logic-panel.tsx` |
| Content Loader | `lib/grid/content-loader.ts` |
| Rollen | `lib/grid/archetype-roles.ts` |
| Migration | `supabase/migrations/20260710140000_studio_layers.sql` |

---

*Zuletzt aktualisiert: Juli 2026.*
