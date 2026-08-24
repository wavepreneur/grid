# Layer 3 — Bonus-Modell (Surprise Queue)

> Single source of truth for how bonus tasks are authored and fired.
> Related: [`GRID_LAYER_MODEL.md`](./GRID_LAYER_MODEL.md), `frontend_idee/bonus.tsx`

## Principle

**Mission (Layer 2)** = linear progress (Hub → Quiz → Level).  
**Bonus (Layer 3)** = **interruptive surprise** — not the next mission step.

Bonuses do **not** block the mission path for players who are not the audience.
They appear with a **fanfare** (sound + animation) so the team clearly notices: extra points are available.

## Studio authoring (per Mission-Slot)

A mission may bind **0…N** bonuses. Each binding has:

| Field | Meaning |
|-------|---------|
| **Content** | Layer-3 pool task (MC) |
| **Who** | Alpha / Beta / Gamma / whole team |
| **When** | Fire condition relative to this mission (or game) |

### When (shared vocabulary — not a second rule engine)

| When | Behaviour |
|------|-----------|
| `immediate` | Right after this mission is solved |
| `delay_minutes` | N minutes **after this mission solved** |
| `delay_meters` | N meters walked **after this mission solved** |
| `game_minutes` | N minutes after **game start** (independent of this mission) |
| `interval_minutes` | Every N minutes (optional; starts after mission or game start) |

**Sequential surprises** (2–3 bonuses minutes apart): same mission, three bindings with `delay_minutes` 0 / 5 / 10 — no chain type needed.  
**Parallel role pack**: three bindings, same When, roles Alpha / Beta / Gamma.

Do **not** invent a separate Loquiz-style rule graph for bonuses. Mission unlock UI (Sofort / Meter / Minuten) and bonus When share the same mental model; only the **anchor** differs (mission start vs. mission solved / game clock).

## Runtime

### Compiled shape (on `LevelDefinition`)

```ts
bonuses: BonusDefinition[]  // full list
bonus?: BonusTask           // deprecated alias = bonuses[0] content (compat)
```

Each `BonusDefinition` = content (`BonusTask`) + `id` + `when` + `fanfare: true`.

### Game state: queue (not a single phase lock)

```ts
bonus_queue: Array<{
  bonus_id: string;
  from_level: number;
  for_role / for_team;
  armed_at: ISO;       // mission solved (or game start)
  ready_at?: ISO;      // set when delay/meters satisfied
  status: "armed" | "ready" | "active" | "done" | "skipped";
  fanfare_shown?: boolean;
}>
```

- **Solve mission** → arm all bindings for that level (`status: armed`).
- Client/server evaluates meters/time → `ready`.
- Present to matching audience → `active` + **fanfare once**.
- Multiple `active` items OK if audiences differ (Alpha/Beta/Gamma at once).
- Team-wide bonus may use `current_phase: "bonus"` briefly; role-only stays overlay (`active_bonus` / queue item) while others stay on hub.

### Fanfare

On first presentation of a ready bonus to a player: SFX + short gift/pop animation, then the bonus card. Copy: clear that these are **bonus points**, not the next mission.

## What not to build

- Compiling Layer-3 into dead `logic_rules` that unlock non-existent levels
- Treating bonus as mandatory Hub→Quiz→Level→Bonus for every player
- Fuzzy duplicate of MissionUnlock under another name without shared UX component
- One soft-locked `level.bonus` only (blocks multi / parallel / delay)

## Migration

1. Existing `bonus_task_id` + role → one binding with `when: immediate`
2. Layer-3 links with `after_task_solved` → bindings on that mission
3. Runtime still accepts legacy `level.bonus` as a single immediate item
