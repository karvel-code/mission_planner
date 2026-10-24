import { z } from 'zod'

// Zod schemas mirroring the Rails API's JSON (api/app/serializers). Every
// response is parsed with these, so a changed API fails loudly at the edge
// instead of deep inside a component. Units: km, km/h, hours, °C, m/s², mSv.

export const planetSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  body_type: z.string(),
  destination: z.boolean(),
  radius_km: z.number(),
  distance_from_sun_km: z.number(),
  average_temperature_c: z.number(),
  gravity_m_per_s2: z.number(),
  radiation_levels_msv: z.number(),
  potentially_habitable: z.boolean().nullable(),
  weather_patterns: z.string().nullable(),
  moons: z.array(z.string()),
  extra_attributes: z.record(z.string(), z.unknown()),
})

export const spacecraftSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  size: z.string().nullable(),
  mass_kg: z.number().nullable(),
  capacity: z.number(),
  range_km: z.number(),
  speed_kmh: z.number(),
  gravity_generator: z.boolean(),
  min_operating_temp_c: z.number(),
  max_operating_temp_c: z.number(),
  extra_attributes: z.record(z.string(), z.unknown()),
  landable_planet_ids: z.array(z.number()),
})

const pointSchema = z.object({ x: z.number(), y: z.number() })

// Coordinates are km in the orbital plane with the Sun at (0, 0); angles are
// radians counter-clockwise from +x, and an arc's sweep is signed the same way.
export const segmentSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('line'), from: pointSchema, to: pointSchema, length_km: z.number() }),
  z.object({
    type: z.literal('arc'),
    centre: pointSchema,
    radius_km: z.number(),
    from: pointSchema,
    to: pointSchema,
    start_angle: z.number(),
    sweep: z.number(),
    length_km: z.number(),
  }),
])

export const legSchema = z.object({
  from_planet_id: z.number(),
  to_planet_id: z.number(),
  distance_km: z.number(),
  range_used_km: z.number(),
  duration_hours: z.number(),
  departure_wrap_km: z.number(),
  bypassed_planet_ids: z.array(z.number()),
  arrival: pointSchema,
  segments: z.array(segmentSchema),
})

// A violation (blocking) or advisory (warning). Issues about one stop carry
// its position in the route as details.stop_index.
export const issueSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.string(), z.unknown()),
})

export const missionResultSchema = z.object({
  feasible: z.boolean(),
  spacecraft_id: z.number(),
  passenger_count: z.number(),
  totals: z.object({
    distance_km: z.number(),
    range_used_km: z.number(),
    range_available_km: z.number(),
    duration_hours: z.number(),
  }),
  legs: z.array(legSchema),
  violations: z.array(issueSchema),
  advisories: z.array(issueSchema),
})

// Cached on save; null only for plans saved outside MissionPlans::Save.
const cachedTotals = {
  total_distance_km: z.number().nullable(),
  range_used_km: z.number().nullable(),
  duration_hours: z.number().nullable(),
  feasible: z.boolean().nullable(),
}

export const missionPlanSummarySchema = z.object({
  id: z.number(),
  name: z.string(),
  customer_name: z.string().nullable(),
  passenger_count: z.number(),
  ...cachedTotals,
  created_at: z.string(),
  updated_at: z.string(),
  spacecraft: z.object({ id: z.number(), name: z.string() }),
  stops: z.array(z.object({ planet_id: z.number(), name: z.string() })),
})

export const missionPlanSchema = z.object({
  id: z.number(),
  name: z.string(),
  customer_name: z.string().nullable(),
  spacecraft_id: z.number(),
  passenger_count: z.number(),
  notes: z.string().nullable(),
  ...cachedTotals,
  created_at: z.string(),
  updated_at: z.string(),
  planet_ids: z.array(z.number()),
  mission: missionResultSchema,
})

export const apiErrorsSchema = z.object({
  errors: z.array(z.object({ field: z.string().nullable(), message: z.string() })),
})

export type Planet = z.infer<typeof planetSchema>
export type Spacecraft = z.infer<typeof spacecraftSchema>
export type Segment = z.infer<typeof segmentSchema>
export type Leg = z.infer<typeof legSchema>
export type Issue = z.infer<typeof issueSchema>
export type MissionResult = z.infer<typeof missionResultSchema>
export type MissionPlanSummary = z.infer<typeof missionPlanSummarySchema>
export type MissionPlan = z.infer<typeof missionPlanSchema>
export type FieldError = z.infer<typeof apiErrorsSchema>['errors'][number]

/** Body for POST /api/mission_calculations. */
export interface MissionCalculationInput {
  spacecraft_id: number
  passenger_count: number
  planet_ids: number[]
}

/** Body for creating or updating a mission plan. On update every field is optional. */
export interface MissionPlanInput {
  name: string
  customer_name?: string | null
  spacecraft_id: number
  passenger_count: number
  notes?: string | null
  planet_ids: number[]
}
