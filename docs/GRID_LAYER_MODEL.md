# GRID Layer-Modell — Single Source of Truth

> **Für Agenten und Entwickler:** Diese Datei ist der Kompass für GRID Studio und Content-Architektur.
> Vor jedem Studio-Feature lesen. Bei Abweichungen: Feature stoppen oder hier dokumentieren warum.

Verwandt: [`GRID_ARCHITECTURE.md`](../GRID_ARCHITECTURE.md), [`docs/EXITMANIA_GRID_INTEGRATION.md`](./EXITMANIA_GRID_INTEGRATION.md)  
Spieler-Ziel-UI (Prototyp): [`frontend_idee/`](../frontend_idee/) — Outdoor / Indoor / Online.

---

## 1. GRID ist nicht Loquiz

| | Loquiz | GRID |
|---|--------|------|
| Modell | Viele Partner erstellen viele Spiele | **Wenige Spiele**, maximale Skalierung |
| Skalierung | Horizontal (mehr Creator) | Vertikal (mehr Städte, Events, Sprachen, Teams) |
| Content | Monolith pro Spiel | **Modulare Layer** mit Verknüpfungen |
| Studio-Ziel | Beliebige Spiele bauen | Layer pflegen, Runtime-Surfaces schalten |

**Leitfrage vor jedem Feature:**

1. Hilft es, **Layer 1** (standortbezogen) pro Stadt schnell anzupassen?
2. Hilft es, **Layer 2** (global/Mission) konsistent zu halten?
3. Hilft es, **Layer 3** (Rollen, Bonus, Trigger) abzubilden?
4. Hilft es, **Runtime-Surfaces** (Outdoor / Indoor / Online, Pulse)?
5. Nutzt es **Alpha/Beta/Gamma**-Asymmetrie?

Wenn **nein** → wahrscheinlich Loquiz-Noise, **nicht** bauen.

---

## 2. Die drei Content-Layer

Layer sind **Bausteine**, kein festes 3-Stufen-Rezept. Spiele kombinieren sie frei.

### Layer 1 — Geo / Umgebung (standortbezogen)

**Was der Spieler erlebt:** Hub (Karte oder Stationen) → Ankunft → Umgebungs-Quiz (Multiple Choice).

| Eigenschaft | Wert |
|-------------|------|
| Skalierung | Pro **Stadt** / Venue unterschiedlich |
| Outdoor | GPS-Wegpunkte (`local_waypoints`) |
| Indoor | Stationen + Stationscodes (`local_stations`) — laufen im Gebäude, ohne GPS |
| Online | Kein Layer-1-Hub; Einstiegsquiz optional an der Mission |
| Studio-Feld | `studio_tasks.layer = 1`, `city_slug`, GPS/`station` in overrides |

**Typische Spiele:** Nur Layer 1 (+ optional Layer-3-Bonus) = Stadt-Entdecker.

### Layer 2 — Mission (global identisch)

**Was der Spieler erlebt:** Quiz gelöst → Mission-Level (Hero, Kacheln/Tiles, Antwort).

| Eigenschaft | Wert |
|-------------|------|
| Skalierung | **Global gleich** in allen Städten / Surfaces |
| GPS | Nein |
| DB (Runtime) | `global_levels` + Studio-Tasks Layer 2 |
| Studio-Feld | `studio_tasks.layer = 2` |

**Wichtig:** Layer 2 wird **einmal** gepflegt und auf Outdoor, Indoor und Online gerendert. Keine drei Mission-Kopien.

### Layer 3 — Asymmetrie / Bonus (Rollen & Trigger)

**Was der Spieler erlebt:** Bonusaufgaben nur für eine Rolle (Alpha/Beta/Gamma) oder Team.

| Eigenschaft | Wert |
|-------------|------|
| Skalierung | Eigene Schicht, verknüpft mit Slot 1/2 |
| Rollen | Alpha, Beta, Gamma oder ganzes Team |
| Trigger | Aufgabe gelöst, Punkte, Spielzeit, GPS/Code erreicht |
| Kontext | `content_context`: outdoor \| indoor \| online \| any |
| DB (Runtime) | `logic_rules` + Studio-Tasks Layer 3 |

**Typische Spiele:** Nur Layer 3 = **Micro-Pulse** (Slack, ~10 Min, REST).

---

## 3. Play-Surfaces (Outdoor / Indoor / Online)

Surfaces sind **Darstellung + Einstieg**, nicht drei getrennte Spiele.

| Surface | Produkt | Hub | Ankunft | Shell |
|---------|---------|-----|---------|-------|
| **outdoor** | Exitmania | GPS-Karte / Wegpunkte | Geofence | Phone |
| **indoor** | Exitmania | Stationsliste | Stationscode (oder Antippen) | Phone |
| **online** | Tabbrain | Missions-Deck | gemeinsamer Start (Ready später) | Stage |

Code: `lib/grid/play-surface.ts`, `lib/cms/layer-model.ts` → `CONTENT_MODES`.

### Player-Phasen (verbindlich)

Pro Stop / Slot, wie in `frontend_idee/`:

```text
Hub → Quiz → Level → Bonus (optional)
```

| Phase | Inhalt | Layer |
|-------|--------|-------|
| **Hub** | Karte / Stationen / Missionen | Surface-Chrome |
| **Quiz** | Multiple-Choice als Schlüssel | Layer 1 (Outdoor/Indoor) oder Intro an Layer 2 (Online) |
| **Level** | Tiles, Tipps, Antwort | Layer 2 |
| **Bonus** | rollenspezifisch | Layer 3 |

Runtime und Studio müssen Content so speichern, dass diese Phasen gefüttert werden — **kein** Monolith-Screen, der alles vermischt.

### Ein Content-Stand, drei Renderings

```text
Slot N  (global_level_id)
├── Layer 1 outdoor → waypoint N (lat/lng) + arrival quiz
├── Layer 1 indoor  → station N (code, place) + station quiz
├── Layer 2         → mission N (tiles, answer)  ← einmal
└── Layer 3         → bonus nach Solve (optional, context-filter)
```

- **Exitmania Outdoor:** Hub = Waypoints, Fallback wählbar
- **Exitmania Indoor (primär oder Fallback):** Hub = Stationen
- **Tabbrain Online:** Hub = Missionen (= Layer-2-Liste), kein GPS/Code

---

## 4. Dual-Fallback (Kunde wählt)

Gebucht oft als Outdoor. Bei Regen / Planänderung entscheidet der Kunde (oder Operator):

| Fallback | Spieler-Erlebnis |
|----------|------------------|
| **indoor** | Im Gebäude laufen, Stationscodes finden |
| **online** | Am Tisch / remote, jeder am eigenen Gerät (Tabbrain-Shell) |

Studio-Definition:

```json
{
  "default_mode": "outdoor",
  "allowed_fallbacks": ["indoor", "online"],
  "profiles": { "outdoor": {…}, "indoor": {…}, "online": {…} }
}
```

Live: `events.content_config.content_mode` = `"outdoor"` \| `"indoor"` \| `"online"`.

Content-Loader filtert Layer 1/3 nach Mode — **Loader-Filter: Roadmap**, Typen vorhanden.

---

## 5. Indoor-Stationen & Codes

Indoor = GPS-Game **ohne GPS**: Teilnehmer laufen zu Objekten, Codes ersetzen den Geofence.

| Feld | Bedeutung |
|------|-----------|
| `name` | Stationsname |
| `place` | Raumhinweis („Saal A · Tisch 1“) |
| `code` | Default-Code (z. B. `A1`) — auf Schild am Ort |
| `kind` | puzzle \| search \| logic \| team \| finale |
| `global_level_id` | Slot → dieselbe Layer-2-Mission |

**Defaults:** Codes werden beim Content-Pack / Publish vergeben.  
**Kunden-Override:** wie GPS — Deltas in `events.route_override.stations` (Code, Place), kein neues Spiel.

DB: `local_stations` (parallel zu `local_waypoints`), Unique `(city_id, global_level_id)` und `(city_id, code)`.

---

## 6. Spiel-Profile (Layer-Kombinationen)

| Profil | Layer | Surface-Default | Use Case |
|--------|-------|-----------------|----------|
| **Vollständig** | 1 + 2 + 3 | outdoor (+ Fallback indoor/online) | Exitmania Standard |
| **Stadt-Entdecker** | 1 (+ 3) | outdoor | Orte entdecken |
| **Indoor-Escape** | 1 + 2 + 3 | indoor | Museum/Venue mit Codes |
| **Mission / Online** | 2 + 3 | online | Tabbrain remote |
| **Micro-Pulse** | 3 | — | Slack/Teams, REST |

Im Studio: `studio_games.active_layers` + `runtime_profiles`.

Code: `lib/cms/layer-model.ts` → `LAYER_GAME_PRESETS`.

---

## 7. Weitere Skalierungs-Dimensionen

| Dimension | Mechanismus |
|-----------|-------------|
| **Städte** | Layer 1 Waypoints/Stations pro `city_slug`; Layer 2 global |
| **Surfaces** | `content_mode` + Dual-Fallback |
| **Sprache** | Pro Team (`teams.language` — Roadmap) |
| **Rollen** | Layer 3 + Alpha/Beta/Gamma |
| **Multiplayer** | Viele Teams, ein Snapshot, WebSocket FSM |
| **Online-Extras** | Ready-Check, Team-Board, Draft — **später** (nicht MVP) |

---

## 8. Datenbank-Mapping

### Runtime

```text
Layer 2  →  global_levels.content
Layer 1 outdoor →  local_waypoints (GPS + intro) ⨝ global_level_id
Layer 1 indoor  →  local_stations (code + place) ⨝ global_level_id
Layer 3  →  logic_rules / Studio Layer-3-Tasks

events.content_config     → blueprint, city_slug, content_pack_slug, content_mode
events.route_override     → Deltas: levels (GPS/Quiz), stations (codes)
events.studio_game_version_id  → eingefrorener Snapshot
```

### Studio

```text
studio_tasks.layer              → 1 | 2 | 3
studio_tasks.content_context    → outdoor | indoor | online | any
studio_tasks.role_assignment    → alpha | beta | gamma | team | none

studio_games.active_layers      → [1, 2, 3]
studio_games.runtime_profiles   → Surfaces + allowed_fallbacks
```

---

## 9. Kunden-Override (Layer 1)

Vor dem Spiel (Formular / Booking-API):

| Surface | Override |
|---------|----------|
| Outdoor | GPS-Koordinaten, Umgebungs-Quiz |
| Indoor | Stationscodes, Place-Texte |
| Online | typischerweise keine Layer-1-Overrides |

Technisch: `events.route_override` — nur Deltas.

---

## 10. Deployment-Formen (Macro vs. Micro)

| Form | Layer | Transport | Dauer |
|------|-------|-----------|-------|
| **Macro-Event** | 1+2+3 (beliebig) | WebSocket FSM | ~90 Min |
| **Micro-Pulse** | meist nur 3 | REST (`pulse_sessions`) | ~10 Min |

Gleiche Engine, unterschiedliches Layer-Profil und Transport — kein separates Produkt.

---

## 11. Studio-UI-Struktur (Soll-Zustand)

```text
Spiel-Editor
├── Einstellungen (Name, Sprache, Primary Surface)
├── Layer-Profil          ← Layer + erlaubte Fallbacks (Indoor / Online)
├── Layer 1 — Geo         ← Outdoor-Waypoints + Indoor-Stationen (gleicher Slot)
├── Layer 2 — Mission     ← Globale Level (einmal)
└── Layer 3 — Bonus       ← Rollen-Aufgaben, Trigger, content_context
```

**Nicht priorisieren:** Loquiz-Flow-Modi als Haupt-UX; Online Ready/Board/Feed vor Phasen-Runtime.

---

## 12. Ist-Stand vs. Roadmap

| Feature | Status | Hinweis |
|---------|--------|---------|
| Alpha/Beta/Gamma Runtime | ✅ Live | `lib/grid/archetype-roles.ts` |
| global_levels + local_waypoints | ✅ Live | Layer 1/2 Outdoor |
| Surfaces-Typen (outdoor/indoor/online) | ✅ Typen | `play-surface.ts`, `layer-model` |
| Player-Phasen Hub→Quiz→Level→Bonus | ✅ Basis | inkl. Bonus-Phase + City-UI (`frontend_idee`) |
| local_stations + Code-Override | 🟡 Schema + Loader | Migration; Defaults wenn keine Rows |
| Studio Layer-UI | 🟡 Basis | Dual-Fallback + Create-Surface + Spielablauf-Slots |
| Logic Rules zur Laufzeit | ⬜ Roadmap | Heute: linear `current_level + 1` |
| content_mode im Loader | ✅ Basis | Surface-Filter + Stationen |
| Player-UI wie frontend_idee | 🟡 Basis | `PlayPhaseFlow` unter `/e/…` |
| Online Ready/Board/Feed | ⬜ Später | bewusst nach MVP |
| Micro-Pulse REST | ⬜ Roadmap | Schema vorhanden |

---

## 13. Build-Reihenfolge (priorisiert)

1. **Surfaces + Phasen im Modell** — Typen, Docs, Studio-Fallback-Flags ✅ Basis
2. **local_stations + route_override.stations** — Indoor Layer 1
3. **Runtime content_mode** — Loader filtert nach Surface
4. **Player-Phasen-UI** — Hub → Quiz → Level → Bonus (frontend_idee → `/e/…`)
5. **Logic-Engine zur Laufzeit** — Layer-3-Trigger
6. **Kunden-Override UI** — GPS + Stationscodes
7. **Online-Extras** — Ready / Board / Feed
8. **Micro-Pulse API** — Layer-3-only Sessions

**Nicht bauen (ohne Layer-Bezug):**

- Generische Loquiz-Klon-Features ohne Layer-Bezug
- Partner-Self-Service CMS für beliebige Spiele
- Checkout/Commerce in GRID

---

## 14. Code-Referenzen

| Bereich | Pfad |
|---------|------|
| Surfaces & Phasen | `lib/grid/play-surface.ts` |
| Layer-Typen & Presets | `lib/cms/layer-model.ts` |
| Level / Config / Stations | `lib/grid/level-types.ts` |
| UI-Prototyp | `frontend_idee/` |
| Studio Layer-Profil | `components/cms/games/game-layer-profile-panel.tsx` |
| Content Loader | `lib/grid/content-loader.ts` |
| Rollen | `lib/grid/archetype-roles.ts` |

---

*Zuletzt aktualisiert: August 2026.*
