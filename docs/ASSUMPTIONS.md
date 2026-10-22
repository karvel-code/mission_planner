# Assumptions

Every assumption made while building Mission Planner, with a one-line rationale.
**Pending** means it still needs confirmation from TEC; **Ours** means it is a design decision we made.

The world rules in the assignment (straight-line planets, constant speed, `R = Rb + Rp × np`, etc.) are requirements, not assumptions, and are not repeated here.

## Mission rules

| # | Assumption | Status | Rationale |
|---|---|---|---|
| 1 | All planets lie on the same side of the sun along the positive x-axis; the sun is not an obstacle. | Pending | The brief gives only distances from the sun, not directions, and a same-side line is the simplest reading. |
| 2 | Range is a single budget for the whole mission; there is no refuelling at stops. | Pending | The brief mentions no refuelling, so the conservative reading is one budget. |
| 3 | Passenger count is fixed for the whole mission. | Pending | The brief has one passenger count per mission, with no pick-ups or drop-offs. |
| 4 | A mission is feasible only if it completes within the 42-year window. | Pending | Planets are frozen for 42 years; after that the geometry no longer holds. |
| 5 | A mission does not have to return to Earth; the agent adds Earth as a final stop if wanted. | Ours | Keeps one-way trips possible and makes a return leg an explicit choice. |
| 6 | The agent defines the stop order; the app optimises each leg's trajectory, not the order (except in the optional suggestions feature, Phase 13). | Ours | Agents plan around customer wishes; reordering stops silently would override them. |
| 7 | The same planet cannot appear twice in a row. | Ours | A zero-length leg has no meaning once the ship is already on that planet. |
| 8 | Capacity refers to passengers only (crew excluded). | Pending | The range formula counts passengers only, so capacity is read the same way. |
| 9 | "Maximum efficiency" means shortest path length, which also minimises range use and time. | Ours | At constant speed and per-km range use, the shortest path minimises all three at once. |
| 10 | Infeasible plans can still be saved as drafts; violations are shown, not blocked. | Ours | Agents need to save work in progress and adjust it later with the customer. |

## Data

| # | Assumption | Status | Rationale |
|---|---|---|---|
| 11 | Until TEC's YAML arrives, `data/placeholder-data.yml` is used: real NASA planet figures plus invented spacecraft. Its units (km, km/h, km of range) are assumed. | Pending | Lets development proceed; the single loader (Phase 4) makes the real file a drop-in swap. |
| 12 | Each planet and spacecraft is identified by a `slug` generated from its `name` (e.g. `Nyx Grand Tour` → `nyx-grand-tour`). | Ours | The placeholder file has no IDs, and re-seeding needs a stable key; renaming an entry in the YAML will create a new record. |
