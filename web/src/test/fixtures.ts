import type { MissionPlan, MissionPlanSummary, Planet, Spacecraft } from '../api/schemas'

// Responses shaped like the Rails API's, with values from data/data.yml.

export const earth: Planet = {
  id: 4,
  name: 'Earth',
  slug: 'earth',
  body_type: 'Planet',
  destination: true,
  radius_km: 6371,
  distance_from_sun_km: 149_600_000,
  average_temperature_c: 15,
  gravity_m_per_s2: 9.8,
  radiation_levels_msv: 0.1,
  potentially_habitable: true,
  weather_patterns: 'Varied (storms, rain, snow)',
  moons: ['Moon'],
  extra_attributes: {},
}

export const serenity: Spacecraft = {
  id: 5,
  name: 'Serenity XL',
  slug: 'serenity-xl',
  size: 'Extra Large',
  mass_kg: 5_000_000,
  capacity: 30,
  range_km: 15_000_000_000,
  speed_kmh: 500_000,
  gravity_generator: true,
  min_operating_temp_c: -420,
  max_operating_temp_c: 500,
  extra_attributes: {},
  landable_planet_ids: [2, 3, 4, 5, 6, 7, 8, 9],
}

export const redPlanetGetaway: MissionPlanSummary = {
  id: 1,
  name: 'Red planet getaway',
  customer_name: 'Okafor family',
  passenger_count: 4,
  total_distance_km: 78_290_239.5,
  range_used_km: 91_442_999.7,
  duration_hours: 156.58,
  feasible: true,
  created_at: '2026-10-24T08:00:00.000Z',
  updated_at: '2026-10-24T08:00:00.000Z',
  spacecraft: { id: 5, name: 'Serenity XL' },
  stops: [
    { planet_id: 4, name: 'Earth' },
    { planet_id: 5, name: 'Mars' },
  ],
}

export const hopperToJupiter: MissionPlanSummary = {
  ...redPlanetGetaway,
  id: 2,
  name: 'Jupiter on a budget',
  customer_name: null,
  passenger_count: 0,
  total_distance_km: 628_823_719.1,
  range_used_km: 628_823_719.1,
  duration_hours: 1257.6,
  feasible: false,
  spacecraft: { id: 1, name: 'Millennial Hopper' },
  stops: [
    { planet_id: 4, name: 'Earth' },
    { planet_id: 6, name: 'Jupiter' },
  ],
}

export const redPlanetGetawayDetail: MissionPlan = {
  id: 1,
  name: 'Red planet getaway',
  customer_name: 'Okafor family',
  spacecraft_id: 5,
  passenger_count: 4,
  notes: 'Window seats',
  total_distance_km: 78_290_239.5,
  range_used_km: 91_442_999.7,
  duration_hours: 156.58,
  feasible: true,
  created_at: '2026-10-24T08:00:00.000Z',
  updated_at: '2026-10-24T08:00:00.000Z',
  planet_ids: [4, 5],
  mission: {
    feasible: true,
    spacecraft_id: 5,
    passenger_count: 4,
    totals: {
      distance_km: 78_290_239.5,
      range_used_km: 91_442_999.7,
      range_available_km: 15_000_000_000,
      duration_hours: 156.58,
    },
    legs: [
      {
        from_planet_id: 4,
        to_planet_id: 5,
        distance_km: 78_290_239.5,
        range_used_km: 91_442_999.7,
        duration_hours: 156.58,
        departure_wrap_km: 0,
        bypassed_planet_ids: [],
        arrival: { x: 227_896_610.5, y: 0 },
        segments: [
          { type: 'line', from: { x: 149_606_371, y: 0 }, to: { x: 227_896_610.5, y: 0 }, length_km: 78_290_239.5 },
        ],
      },
    ],
    violations: [],
    advisories: [],
  },
}
