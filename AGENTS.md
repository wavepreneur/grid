# GRID — Agent Guide

Next.js engine repo. Read `node_modules/next/dist/docs/` for Next.js 16 conventions.

## Ecosystem (read first for integration)

**[`docs/EXITMANIA_GRID_INTEGRATION.md`](docs/EXITMANIA_GRID_INTEGRATION.md)** — Exitmania + Tabbrain + GRID boundaries, Loquiz replacement, API contract.

Rule: `.cursor/rules/ecosystem-exitmania-tabbrain.mdc`

## This repo owns

- Multiplayer runtime (`/e/{code}/…`), roles Alpha/Beta/Gamma
- Content loader: `global_levels`, `route_override`, blueprints
- `POST /api/v1/bookings` — session provisioning for Exitmania/Tabbrain
- Operator cockpit `/cockpit/{code}`

## This repo does NOT own

- Checkout, Paddle, city SEO pages (Exitmania)
- Enterprise org billing (Tabbrain, future)

## Key paths

| Area | Path |
|------|------|
| Blueprints | `lib/grid/blueprints.ts` |
| Roles | `lib/grid/archetype-roles.ts` |
| Content load | `lib/grid/content-loader.ts` |
| Booking API | `app/api/v1/bookings/route.ts`, `lib/grid/booking-api.ts` |
| Architecture | `GRID_ARCHITECTURE.md` |
