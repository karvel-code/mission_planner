# Assumptions

Every assumption made while building Mission Planner, with a one-line rationale.
**Pending** means it still needs confirmation from TEC; **Ours** means it is a design decision we made.

The world rules in the assignment (straight-line planets, constant speed, `R = Rb + Rp × np`, etc.) are requirements, not assumptions, and are not repeated here.

## Mission rules

| # | Assumption | Status | Rationale |
|---|---|---|---|
| 1 | All planets lie on the same side of the Sun along the positive x-axis. The Sun is an obstacle like any other body but is never a destination. | Pending | The data puts the Sun at distance 0 and every planet at a positive distance; treating the Sun as an obstacle keeps paths valid for any layout. |
| 2 | Range is a single budget for the whole mission; there is no refuelling at stops. | Pending | The brief mentions no refuelling, so the conservative reading is one budget. |
| 3 | Passenger count is fixed for the whole mission. | Pending | The brief has one passenger count per mission, with no pick-ups or drop-offs. |
| 4 | A mission is feasible only if it completes within the 42-year window. | Pending | Planets are frozen for 42 years; after that the geometry no longer holds. |
| 5 | A mission does not have to return to Earth; the agent adds Earth as a final stop if wanted. | Ours | Keeps one-way trips possible and makes a return leg an explicit choice. |
| 6 | The agent defines the stop order; the app optimises each leg's trajectory, not the order (except in the optional suggestions feature, Phase 13). | Ours | Agents plan around customer wishes; reordering stops silently would override them. |
| 7 | The same planet cannot appear twice in a row. | Ours | A zero-length leg has no meaning once the ship is already on that planet. |
| 8 | Capacity refers to passengers only (crew excluded). | Pending | The range formula counts passengers only, so capacity is read the same way. |
| 9 | "Maximum efficiency" means shortest path length, which also minimises range use and time. | Ours | At constant speed and per-km range use, the shortest path minimises all three at once. |
| 10 | Infeasible plans can still be saved as drafts; violations are shown, not blocked. | Ours | Agents need to save work in progress and adjust it later with the customer. |
| 16 | A spacecraft may only land on a planet whose `average_temperature_c` is within its operating range (inclusive). Flybys are exempt; landing outside the range is a blocking violation. | Pending | The data gives both temperatures without saying how they relate; landing is when the ship is exposed to the surface, while a flyby only grazes it. |
| 17 | Bodies with `type: Star` are not destinations. | Ours | A ship cannot land on the Sun. |
| 18 | Advisories (non-blocking, thresholds in `config/advisories.yml`): surface gravity above 15 m/s² (≈ 1.5 g), radiation of 500 mSv or more, and a mission longer than 30 days on a spacecraft without a gravity generator. | Ours | These are comfort and safety warnings for the agent, not physical limits, so they should not make a mission infeasible. |
| 19 | The radiation period behind `radiation_levels_msv` is unknown, so the value is shown as given. | Pending | The data gives no unit of time, and inventing one would mislead agents. |
| 21 | Earth is identified by its name, `Earth`. | Ours | The data has no IDs or flags marking the home planet, and the name is stable. |
| 22 | Route problems don't stop the legs being calculated: a repeated stop is skipped, and a route that doesn't start at Earth leaves its first stop from the surface point facing the next one. | Ours | Drafts can be saved (#10), so agents should still see distances and range while they fix the route. |
| 23 | The starting planet is not a landing: it gets no temperature check and no advisories. | Ours | The ship begins the mission there rather than arriving. |
| 24 | Gravity is shown as a multiple of Earth's using standard gravity, 9.80665 m/s². | Ours | It is only for messages, and standard gravity is the usual reference for "g". |
| 28 | A malformed route (not starting at Earth, no destination, the same planet twice in a row) blocks saving. Every other violation, including a star stop or an incompatible landing temperature, is saved with the draft. | Ours | Follows PLAN.md Phase 5; a malformed route has no meaningful mission, while the other problems are things the agent fixes with the customer (#10). |
| 29 | A plan needs a spacecraft to be saved. | Ours | Every cached total (range, duration, feasibility) depends on the spacecraft. |
| 30 | A planet that appears on any saved route cannot be deleted. | Ours | Keeps saved plans intact; goes with #25. |
| 31 | `POST /api/mission_calculations` rejects only input it cannot calculate with (unknown spacecraft or planet, bad passenger count). Route problems come back as violations with a 200, even though saving such a route is a 422. | Ours | The planner recalculates as the agent builds the route, so a half-built route must still preview. |
| 32 | A duplicated plan is named "<original name> (copy)" and keeps every other field and the route. | Ours | Agents duplicate a plan to try a variation; the suffix keeps the two apart in the list. |
| 33 | The planner's suggestions ("reduce to N passengers", "choose another spacecraft", "fits route") are worked out in the browser from the API's route distance, which doesn't depend on the spacecraft. The suggested spacecraft is the one that fits with the smallest range. Every result shown as a number comes from the API. | Ours | Gives instant hints without one API call per spacecraft; the smallest sufficient spacecraft is usually the cheapest to offer. |
| 34 | A new plan starts with one passenger on the first spacecraft in the catalog. | Ours | A mission is for at least one customer; the agent changes both in steps 02–03. |

## Data

| # | Assumption | Status | Rationale |
|---|---|---|---|
| 11 | TEC's `data/data.yml` uses km, km/h, and km of range; a body's radius is `diameter_km ÷ 2`. | Pending | The field names give the units; the trajectory model needs radii. |
| 12 | Each planet and spacecraft is identified by a `slug` generated from its `name` (e.g. `Nyx Odyssey` → `nyx-odyssey`). | Ours | The data file has no IDs, and re-seeding needs a stable key; renaming an entry in the YAML will create a new record. |
| 20 | Moons, weather patterns, and habitability are for display only and do not affect trajectories or feasibility. | Ours | The world rules say moons are ignored for flight, and the brief sets no rules for the other fields. |
| 25 | Seeding never deletes a planet or spacecraft that has disappeared from the YAML. | Ours | Saved mission plans may refer to it; removing records is a deliberate admin step, not a side effect of a data update. |
| 26 | Only the fields the calculations need are required. The info fields (`potentially_habitable`, `weather_patterns`, `moons`, `size`, `mass_kg`) may be left out of the YAML; moons then default to none. | Ours | A gap in descriptive data shouldn't stop the whole catalog loading. |
| 27 | Top-level keys other than `planets` and `spacecrafts` are ignored. Unknown fields *inside* a record are kept in `extra_attributes`. | Ours | The plan asks that no record data be lost; there is nowhere sensible to store an unknown top-level section. |

## Trajectories

| # | Assumption | Status | Rationale |
|---|---|---|---|
| 13 | Bodies (the Sun included) do not overlap or touch, so an arc along one body's surface never passes through another. | Ours | True for every body in the data; the loader (Phase 4) can reject data that breaks it. |
| 14 | A planet counts as bypassed when the path touches its surface (within tolerance), even at a single point; the departure and target planets are never listed. | Ours | "Go around any planet in its path" includes skimming past it, and agents should see every planet the ship passes. |
| 15 | When the path above the axis and its mirror image below tie, the one above is shown. | Ours | Both are equally short; picking one side consistently keeps legs and drawings predictable. |
