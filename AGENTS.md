# Tells

Public brand and engine: **Tells** (tells.team). Conversation “Tells” = this repo. “Exitmania” = `../Developer/exitmania`. Engine code lives in `lib/tells/`. The git folder may still be named `grid`. See `.cursor/rules/tells-vs-exitmania.mdc`.

Next.js engine repo. Read `node_modules/next/dist/docs/` for Next.js 16 conventions.

## Ecosystem (read first for integration)

**[`docs/EXITMANIA_GRID_INTEGRATION.md`](docs/EXITMANIA_GRID_INTEGRATION.md)** — Exitmania + GRID boundaries, Loquiz replacement, API contract. Tabbrain is discarded.

**[`docs/ACCESS_SCOPE_AND_PARTNER_API.md`](docs/ACCESS_SCOPE_AND_PARTNER_API.md)** — Loquiz scope/tickets analysis → GRID access batches, publish rules, partner API (Exitmania/Tabbrain).

**[`docs/GRID_LAYER_MODEL.md`](docs/GRID_LAYER_MODEL.md)** — Layer-first content architecture (mandatory before Studio CMS work).

Rules: `.cursor/rules/product-direction.mdc`, `.cursor/rules/ecosystem-exitmania-tabbrain.mdc`, `.cursor/rules/grid-layer-model.mdc`

## This repo owns

- Multiplayer runtime (`/e/{code}/…`), roles Alpha/Beta/Gamma
- Content loader: `global_levels`, `local_waypoints`, `route_override`, blueprints
- **Layer model:** Layer 1 (geo), Layer 2 (mission), Layer 3 (roles/bonus) — composable game profiles
- GRID Studio: layer profile, task layer assignment, publish snapshots with `layer_profile`
- `POST /api/v1/bookings` — session provisioning for Exitmania (later also GRID customer Studio)
- Operator cockpit `/cockpit/{code}`

## This repo does NOT own

- Checkout, Paddle, city SEO pages, impulse teamevents (Exitmania)
- Loquiz-style multi-partner game builder (customer Studio = template overwrites only)

## Key paths

| Area | Path |
|------|------|
| **Layer model (read first for Studio)** | `docs/GRID_LAYER_MODEL.md`, `lib/cms/layer-model.ts` |
| Play surfaces & phases | `lib/tells/play-surface.ts`, `frontend_idee/` |
| Indoor stations | `lib/tells/stations.ts`, `local_stations` |
| Layer profile UI | `components/cms/games/game-layer-profile-panel.tsx` |
| Blueprints | `lib/tells/blueprints.ts` |
| Roles | `lib/tells/archetype-roles.ts` |
| Pulse / Telemetry envelope | `lib/tells/telemetry-envelope.ts`, `lib/tells/domain-telemetry.ts`, `lib/tells/telemetry-bridge.ts` |
| Pulse REST API | `lib/tells/pulse-api.ts`, `app/api/v1/pulse/` |
| Content load | `lib/tells/content-loader.ts` |
| Booking API | `app/api/v1/bookings/route.ts`, `lib/tells/booking-api.ts` |
| Architecture | `GRID_ARCHITECTURE.md` |
