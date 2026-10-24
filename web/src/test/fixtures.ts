import type { MissionPlan, MissionPlanSummary } from '../api/schemas'
import { planetNamed, spacecraftNamed } from './catalog'

// Responses shaped like the Rails API's, with values from data/data.yml.

export const earth = planetNamed('Earth')
export const serenity = spacecraftNamed('Serenity XL')

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
