import type { Issue, MissionCalculationInput, MissionResult } from '../api/schemas'
import { fleet, planets } from './catalog'

/**
 * A stand-in for POST /api/mission_calculations, good enough to drive the
 * planner in tests: straight legs between surfaces (planets in between are
 * listed as bypassed), the real range formula, and the capacity, range, and
 * landing-temperature checks with API-style messages.
 */
export function fakeCalculation({ spacecraft_id, passenger_count, planet_ids }: MissionCalculationInput): MissionResult {
  const craft = fleet.find((s) => s.id === spacecraft_id)!
  const route = planet_ids.map((id) => planets.find((p) => p.id === id)!)
  const rate = 1 + 0.042 * passenger_count

  const legs = route.slice(1).map((to, i) => {
    const from = route[i]
    const [near, far] = [from, to].sort((a, b) => a.distance_from_sun_km - b.distance_from_sun_km)
    const distance = far.distance_from_sun_km - near.distance_from_sun_km - from.radius_km - to.radius_km
    const x = (p: (typeof planets)[number]) => p.distance_from_sun_km

    return {
      from_planet_id: from.id,
      to_planet_id: to.id,
      distance_km: distance,
      range_used_km: distance * rate,
      duration_hours: distance / craft.speed_kmh,
      departure_wrap_km: 0,
      bypassed_planet_ids: planets.filter((p) => x(p) > x(near) && x(p) < x(far)).map((p) => p.id),
      arrival: { x: x(to), y: 0 },
      segments: [{ type: 'line' as const, from: { x: x(from), y: 0 }, to: { x: x(to), y: 0 }, length_km: distance }],
    }
  })

  const distance = legs.reduce((sum, leg) => sum + leg.distance_km, 0)
  const violations: Issue[] = []
  if (passenger_count > craft.capacity) {
    violations.push({ code: 'over_capacity', message: `${passenger_count} passengers exceed ${craft.name}'s capacity of ${craft.capacity}.`, details: {} })
  }
  if (distance * rate > craft.range_km) {
    violations.push({ code: 'range_exceeded', message: 'Range exceeded.', details: { range_used: distance * rate, range_km: craft.range_km } })
  }
  route.slice(1).forEach((stop, i) => {
    if (craft.landable_planet_ids.includes(stop.id)) return
    violations.push({
      code: 'temperature_incompatible',
      message: `${stop.name} (${stop.average_temperature_c} °C) exceeds ${craft.name}'s maximum operating temperature of ${craft.max_operating_temp_c} °C.`,
      details: { stop_index: i + 1, planet: stop.name },
    })
  })

  const advisories = route
    .slice(1)
    .filter((stop) => stop.gravity_m_per_s2 > 15)
    .map((stop) => ({ code: 'high_gravity', message: `${stop.name} surface gravity is ${stop.gravity_m_per_s2} m/s² (2.5× Earth's).`, details: {} }))

  return {
    feasible: violations.length === 0,
    spacecraft_id,
    passenger_count,
    totals: {
      distance_km: distance,
      range_used_km: distance * rate,
      range_available_km: craft.range_km,
      duration_hours: distance / craft.speed_kmh,
    },
    legs,
    violations,
    advisories,
  }
}
