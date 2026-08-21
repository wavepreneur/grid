# Access, Scope & Partner-API — Loquiz-Analyse → GRID-Zielmodell

> **Status:** Design-Notiz (keine Implementierung).  
> **Quellen:** Exitmania-Loquiz-Integration (nur gelesen), GRID Booking-/Ticket-Stand.  
> **Ziel:** Exitmania + Tabbrain können GRID so ansteuern wie heute Loquiz — browserbasiert, multiplayer-fähig.

Verwandt: [`EXITMANIA_GRID_INTEGRATION.md`](./EXITMANIA_GRID_INTEGRATION.md), [`GRID_LAYER_MODEL.md`](./GRID_LAYER_MODEL.md)

---

## 1. Was Loquiz bei Exitmania tatsächlich macht

### 1.1 Kernobjekte

| Loquiz | Bedeutung | Exitmania-Speicher |
|--------|-----------|--------------------|
| `gameId` | Spielvorlage (Content) | `bookings.loquiz_game_id` / `games.loquiz_id_*` |
| `scope` | Ergebnis-/Event-Isolation | `bookings.loquiz_scope`, oft = Booking-ID oder Stripe-Session |
| Ticket (`username` + `password`) | Zugang zum Spiel | `team_credentials` |
| Results | Highscore pro Spiel±Scope | `https://results.loquiz.com/{gameId}:{scope}` |

**Scope = Isolationseinheit für Scores/Fortschritt.** Gleiches Spiel + gleicher Scope → gemeinsame Result-Page. Anderer Scope → anderes „Event“, keine Vermischung.

### 1.2 API (wie Exitmania sie nutzt)

```http
POST https://api.loquiz.com/v3/tickets
Authorization: ApiKey-v1 …
Content-Type: application/json

{
  "gameId": "<loquiz-game-id>",
  "email": "…",
  "username": "<5-stelliger code>",
  "validFrom": 0,
  "validUntil": 0,
  "scope": "<booking-id oder session-id>"
}
```

Referenz-Implementierung:

- Shared Helper: `exitmania/supabase/functions/_shared/loquizTicketHelpers.ts`
- Checkout: `create-loquiz-ticket`
- Teamevents: `create-teamevent-loquiz-tickets` (Scope = `teamevent_booking_id`)
- Results-UI: `AccessCredentials.tsx` → `results.loquiz.com/{gameId}:{scope}`
- Live/Webhook: `/api/webhooks/loquiz` keyed by `gameId` + `scope`

`validFrom` / `validUntil` = `0` bedeutet in der Praxis „kein Verfall“ (Exitmania setzt das so). Die Loquiz-Admin-UI erlaubt optionale Gültigkeit — Exitmania-Checkout nutzt das aktuell kaum.

### 1.3 Scope-Strategien (Loquiz-Admin vs. Exitmania-Checkout)

| Modus | Verhalten | Exitmania heute |
|-------|-----------|-----------------|
| **Shared scope** | Viele Tickets, ein Scope → eine Result-Page | B2C: alle Teams einer Buchung teilen Scope (`booking.id` / Stripe-Session). Teamevent: Scope = `teamevent_bookings.id`. |
| **Separate scope pro Ticket** | Jedes Ticket eigener Scope → isolierte Datensätze | In Checkout **nicht** der Default; Loquiz-UI-Checkbox „Separate scope for each generated ticket“. |
| **Kein / Public-Scope** | Teams erscheinen in öffentlicher Highscore des Spiels | Loquiz-UI: Scope leer → System vergibt oder Public. Exitmania erzwingt meist expliziten Scope. |
| **Nachträglich Teams** | Weitere Tickets mit **gleichem** Scope | Teamevent/Repair-Flows; fehlende Teams werden nachgezogen. |

Username oft einmal gesetzt (manuell) oder generiert (5 alphanumerisch); Passwort vom System (4-stellig). Zugang in der App: QR/`loquiz://` oder User/Pass.

### 1.4 Was Exitmania **nicht** von Loquiz erwartet

- Kein Browser-Multiplayer (Alpha/Beta/Gamma)
- Kein gemeinsames Lobby-/Realtime-Modell
- Kein CMS-Layer-Publish in Loquiz aus Exitmania heraus — nur `gameId` + Tickets

---

## 2. GRID heute (Gap zur Wunsch-UX)

| Bedarf | GRID-Stand |
|--------|------------|
| Session provisionieren | `POST /api/v1/bookings` → ein **Event** + N **Teams** (Invite + Join-Links) |
| Idempotenz | `booking_reference` + Org |
| Status | `GET /api/v1/events/{inviteCode}/status` |
| Ticket-Pools (Studio) | `studio_ticket_pools` / `activations` — Kapazität, noch **kein** Bulk-Access+CSV+Scope+Expiry wie Loquiz |
| Publish-Gate | Ticket-Pool darf Entwurf wählen; Booking-API prüft Publish noch nicht strikt genug für Partner-Flows |
| Scope-Begriff | Entspricht praktisch **`events.id` / `invite_code`**, aber nicht als Partner-API-Feld benannt |
| Verfall | nicht als Access-Property modelliert |
| CSV Bulk | fehlt |
| Expand Teams in bestehendes Event | Booking liefert feste `team_count`; Expand-API fehlt |

Browser-Zugang heute: **URL** `/e/{invite}/team/{join}` (kein User/Pass). Das ist die richtige Browser-Best-Practice — Links statt App-Credentials.

---

## 3. Zielmodell (GRID-Begriffe)

Drei klar getrennte Ebenen:

```text
Studio Game (published version)
        ↓ bindet
Access Batch  (Partner-Vorrat: Codes, CSV, Expiry, Status unused|redeemed|revoked|expired)
        ↓ redeem / provision
Event (≈ Loquiz Scope)  ← Isolation für Scores, Cockpit, Results
        ↓ enthält
Teams (≈ Loquiz Tickets in einem Scope)  ← je Team: join_code + play_url
        ↓
Players (Browser-Geräte / Rollen)
```

### 3.1 Mapping Loquiz → GRID

| Loquiz | GRID |
|--------|------|
| `gameId` | `studio_games` + **published** `studio_game_versions` / `content_pack_slug` |
| `scope` | **`event`** (`invite_code`, optional `scope_key` / `booking_reference`) |
| Ticket user/pass | **Access Code** oder direkter **Team-Join-Link** |
| `results.loquiz.com/game:scope` | `…/results/{invite}` oder `…/results/{gameSlug}:{scopeKey}` |
| QR App-Scan | QR auf **Play-URL** (Browser) |
| Unused/Used | Access: `unused` → `redeemed` (Event+Team gebunden) |
| validFrom/Until | Access `valid_from` / `valid_until` (optional) |

### 3.2 Scope-Modi (Partner-API + Studio)

| Modus | API-Flag (Vorschlag) | Effekt |
|-------|----------------------|--------|
| **Shared event** | `scope_mode: "shared"` + `scope_key` | Alle Accesses landen im **gleichen Event**. Highscore/Cockpit = dieses Event. Weitere Tickets später mit gleichem `scope_key` → Teams **hinzufügen**. |
| **Per-access event** | `scope_mode: "per_access"` | Jeder Access erzeugt/claimed **eigenes** Event (isoliert). |
| **Public ladder** | `scope_mode: "public"` | Event(s) melden Scores an eine **spielweite** Leaderboard-Sicht (optional); Events bleiben runtime-isoliert, Leaderboard aggregiert. |

Klarstellung zur Loquiz-UI-Checkbox:

- „Separate scope for each ticket“ = GRID `per_access`
- Ein gemeinsamer Scope-String = GRID `shared` + `scope_key`
- Scope leer + Public-Highscore = GRID `public` (bewusst, nicht Default für B2B)

### 3.3 Publish- & Offline-Regeln (Produkt)

1. **Nicht veröffentlicht** → Spiel darf **nicht** in Ticket-/Booking-Auswahl und API lehnt Provisionierung ab (`409 game_not_published`).
2. **Veröffentlicht → wieder Entwurf/Offline** → betrifft nur **neue** Buchungen/Access-Redeems. Bereits ausgegebene Accesses / laufende Events bleiben spielbar (frozen version am Event).
3. **Zugang unbrauchbar machen** → nur durch **Revoke/Delete** des Accesses (oder Event schließen), nicht durch Unpublish allein.
4. **Expiry** → wenn `valid_until` gesetzt und überschritten → Status `expired`, Redeem verweigert. Ohne Datum → kein Auto-Verfall.

### 3.4 Browser-Multiplayer Best Practice (vs. Loquiz App)

| Thema | Loquiz | GRID |
|-------|--------|------|
| Gerät | Native App | Browser / PWA |
| Login | User + Pass (+ QR deep link) | **Kurzer Invite + Team-Link** (oder Access-Code → Redirect auf Link) |
| Mehrere Teams, ein Event | Gleicher Scope, viele Tickets | Ein Event, viele Teams (`join_code`) |
| Mitspieler im Team | App-seitig | Lobby + Rollen Alpha/Beta/Gamma |
| Operator | Results-URL | Cockpit `/cockpit/{invite}` + Results |
| Partner-Vorrat | Bulk Tickets + CSV | Bulk **Access Codes** + CSV (Code, URL, Scope, Status, Expiry) |

Empfehlung: Für Partner-CSV **Access Codes** (kurz, teilbar) speichern; beim ersten Redeem entsteht/attached Team im Event und der Spieler erhält die Play-URL. Checkout (Exitmania) kann weiter **sofort fertige Play-URLs** bekommen (kein Extra-Schritt für Endkunden).

---

## 4. Partner-API (Exitmania / Tabbrain) — Soll-Vertrag

Auth wie heute: `x-grid-api-key` (Org-scoped). Idempotenz über `booking_reference` bzw. `idempotency_key`.

### 4.1 Spiele auflisten (nur published)

```http
GET /api/v1/games?status=published
```

Antwort: `id`, `slug`, `name`, `published_version`, Surfaces, Packs — **keine Entwürfe**.

### 4.2 Session / Event provisionieren (Checkout — existiert, erweitern)

```http
POST /api/v1/bookings
```

Erweitern um:

- `game_id` oder `content_pack_slug` (Pflicht published)
- `scope_key` (optional; Default = `booking_reference`)
- `scope_mode`: `shared` | `per_access` | `public`
- `valid_from` / `valid_until` (optional, auf erzeugte Accesses/Teams)
- `team_count` wie heute

Verhalten:

- `shared` + bekannter `scope_key` → bestehendes Event, **Teams appenden** (Expand)
- neu → Event + Teams anlegen
- Game nicht published → Fehler

### 4.3 Bulk-Access (Partner-Vorrat / Teamevent / White-Label)

```http
POST /api/v1/access-batches
{
  "organization_slug": "exitmania",
  "game_id": "…",
  "quantity": 1000,
  "scope_mode": "shared",
  "scope_key": "partner:acme:sommer-2026",
  "label": "ACME Sommer",
  "valid_from": null,
  "valid_until": "2026-12-31T23:59:59Z",
  "idempotency_key": "exitmania:batch:…"
}
```

Antwort: `batch_id`, `event` (bei shared sofort oder lazy), `accesses[]` mit `code`, `redeem_url`, `status`, CSV-Download-URL.

```http
GET /api/v1/access-batches/{id}/export.csv
GET /api/v1/access-batches/{id}          # Status unused/redeemed/expired/revoked counts
POST /api/v1/accesses/{code}/revoke
POST /api/v1/events/{invite}/teams       # Expand: weitere Teams in gleiches Event
```

### 4.4 Redeem (Browser)

```http
POST /api/v1/accesses/{code}/redeem
→ { invite_code, join_code, play_url, event_id }
```

Prüft: published binding am Event (frozen version), Expiry, Revoke, Kapazität.

### 4.5 Status / Results (Loquiz-Webhook-Ersatz)

```http
GET /api/v1/events/{inviteCode}/status     # existiert
GET /api/v1/events/{inviteCode}/results    # Highscore-Payload für Exitmania-Portale
# optional outbound webhook später
```

Results-URL für Organizer (öffentlich):

`{GRID_ORIGIN}/results/{inviteCode}`  
äquivalent Loquiz: `results…/{game}:{scope}` → bei uns `invite` **ist** der Scope-Handle.

### 4.6 Exitmania-Call-Sites (Migration)

| Heute | Morgen |
|-------|--------|
| `create-loquiz-ticket` | `create-grid-session` → erweiterte `POST /bookings` |
| `create-teamevent-loquiz-tickets` | `POST /access-batches` oder `/bookings` + Expand |
| Admin Bulk wie Loquiz-UI | GRID Studio Tickets **oder** Exitmania Admin → GRID API |
| `results.loquiz.com/…` | GRID Results / Exitmania Proxy auf GRID Status |
| `team_credentials` user/pass | `grid_invite_code`, `grid_join_code`, `grid_play_url`, optional `access_code` |

Tabbrain: gleiche Endpunkte, `organization_slug: "tabbrain"`, oft `shared` Scope für Org-Events + Bulk für Partner.

---

## 5. Studio-UX (GRID Admin)

Ticket-Erstellung soll Loquiz-Felder abbilden, aber GRID-Sprache nutzen:

1. **Spiel** — nur `status=published` (Entwurf ausgegraut / nicht wählbar)
2. **Anzahl** Zugänge
3. **Scope-Modus** — Shared (Key eingeben/auto) | Pro Zugang isoliert | Public Ladder
4. **Gültig von / bis** — optional
5. **Erzeugen** → Liste + CSV
6. Status-Spalte: Unbenutzt / Eingelöst / Abgelaufen / Widerrufen
7. Löschen/Widerrufen macht Zugang tot — Unpublish des Spiels nicht

Pools (`studio_ticket_pools`) können später Access-Batches unterlegen (Kapazität vs. vorab generierte Codes).

---

## 6. Typische Szenarien

### A — Exitmania B2C Checkout (1–n Teams, ein Scope)

Kunde kauft 3 Teams → `POST /bookings` mit `team_count: 3`, `scope_key = exitmania:booking:{uuid}` → ein Event, drei Play-URLs in der Ticket-Mail.

### B — Partner 1000 Codes, gemeinsames Event

`POST /access-batches` quantity 1000, `scope_mode: shared`, `scope_key: partner:x` → CSV an Partner. Alle Redeems → gleiches Event / gleiche Results. Kunde will +100 → gleicher `scope_key` (Expand).

### C — 1000 isolierte Einzelspiele (kein gemeinsames Ranking)

`scope_mode: per_access` → jedes Redeem eigenes Event.

### D — Öffentliche Stadt-Highscore

`scope_mode: public` + Spiel published → Scores fließen in spielweite Ladder; Runtime bleibt event-isoliert.

### E — Spiel offline nach Verkauf

Neue API-Calls failen; bestehende Accesses/Events laufen weiter bis Expiry/Revoke.

---

## 7. Bewusst anders als Loquiz (nicht kopieren)

1. **Kein User/Pass als Primärlogin** — Browser: Link/Code.
2. **Event = Multiplayer-Container** — Teams + Players + Rollen, nicht nur Score-Bucket.
3. **Frozen published version** am Event — Content-Stabilität trotz späterem Entwurf.
4. **Commerce bleibt außerhalb** — Exitmania/Tabbrain Checkout; GRID nur Engine + Access-API.
5. **Realtime/Cockpit** sind First-Class; Loquiz Results sind nachgelagert.

Lernenswert von Loquiz:

- Scope als klare Isolation
- Bulk + CSV + Used-Tracking
- Optionale Gültigkeit
- Idempotente Ticket-Erzeugung
- Results-URL aus `game + scope`
- Expand in denselben Scope

---

## 8. Implementierungs-Reihenfolge (Vorschlag)

1. Publish-Gate in Studio Ticket-UI + `POST /bookings` / Pools  
2. `scope_key` + Expand-Teams API  
3. Access-Batch + CSV + Status + Expiry + Revoke  
4. Results-Endpoint + öffentliche Results-Page  
5. Exitmania: Teamevent + Admin auf GRID-Batches umstellen  
6. Outbound-Webhooks (optional, Loquiz-Webhook-Parität)

---

## 9. Agent-Regeln

- Exitmania/Tabbrain **ändern** Access nur über GRID-API — keine parallele Ticket-Engine.
- Keine Loquiz-User/Pass-Semantik in GRID-Player-UI einführen.
- Unpublish ≠ revoke.
- Shared Scope = ein Event; nie Scores über Events „heimlich“ mergen außer Modus `public`.
- Diese Datei bei Access-/Booking-API-Arbeit zuerst lesen; Code erst nach explizitem Auftrag.
