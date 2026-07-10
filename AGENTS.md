# GRID — Agent Guide

Next.js engine repo. Read `node_modules/next/dist/docs/` for Next.js 16 conventions.

## Ecosystem (read first for integration)

**[`docs/EXITMANIA_GRID_INTEGRATION.md`](docs/EXITMANIA_GRID_INTEGRATION.md)** — Exitmania + Tabbrain + GRID boundaries, Loquiz replacement, API contract.

**[`docs/GRID_LAYER_MODEL.md`](docs/GRID_LAYER_MODEL.md)** — Layer-first content architecture (mandatory before Studio CMS work).

Rules: `.cursor/rules/ecosystem-exitmania-tabbrain.mdc`, `.cursor/rules/grid-layer-model.mdc`

## This repo owns

- Multiplayer runtime (`/e/{code}/…`), roles Alpha/Beta/Gamma
- Content loader: `global_levels`, `local_waypoints`, `route_override`, blueprints
- **Layer model:** Layer 1 (geo), Layer 2 (mission), Layer 3 (roles/bonus) — composable game profiles
- GRID Studio: layer profile, task layer assignment, publish snapshots with `layer_profile`
- `POST /api/v1/bookings` — session provisioning for Exitmania/Tabbrain
- Operator cockpit `/cockpit/{code}`

## This repo does NOT own

- Checkout, Paddle, city SEO pages (Exitmania)
- Enterprise org billing (Tabbrain, future)
- Loquiz-style multi-partner game builder platform

## Key paths

| Area | Path |
|------|------|
| **Layer model (read first for Studio)** | `docs/GRID_LAYER_MODEL.md`, `lib/cms/layer-model.ts` |
| Layer profile UI | `components/cms/games/game-layer-profile-panel.tsx` |
| Blueprints | `lib/grid/blueprints.ts` |
| Roles | `lib/grid/archetype-roles.ts` |
| Pulse / Telemetry envelope | `lib/grid/telemetry-envelope.ts`, `lib/grid/domain-telemetry.ts`, `lib/grid/telemetry-bridge.ts` |
| Pulse REST API | `lib/grid/pulse-api.ts`, `app/api/v1/pulse/` |
| Content load | `lib/grid/content-loader.ts` |
| Booking API | `app/api/v1/bookings/route.ts`, `lib/grid/booking-api.ts` |
| Architecture | `GRID_ARCHITECTURE.md` |
