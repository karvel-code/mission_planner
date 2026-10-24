import type { Planet, Spacecraft } from '../api/schemas'
import { formatNumber } from './format'

// The mission rules from PLAN.md section 5, mirrored for hints and suggestions
// in the planner. The API's calculation stays the source of truth for every
// number shown as a result.

/** Range per km travelled: R = Rb + Rp × passengers. */
export const BASE_RANGE_RATE = 1
export const PASSENGER_RANGE_RATE = 0.042
/** The planets stay aligned for 42 years. */
export const WINDOW_HOURS = 42 * 365.25 * 24
export const STANDARD_GRAVITY_M_PER_S2 = 9.80665
export const EARTH = 'Earth'

export const rangeRate = (passengers: number) => BASE_RANGE_RATE + PASSENGER_RANGE_RATE * passengers

export const timesEarthGravity = (gravity: number) => gravity / STANDARD_GRAVITY_M_PER_S2

export const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max)

/** True when the same planet appears twice in a row, which the planner blocks. */
export const hasConsecutiveDuplicate = (ids: number[]) => ids.some((id, i) => i > 0 && ids[i - 1] === id)

/**
 * Why `spacecraft` can't land on `planet`, e.g. "Venus 464 °C exceeds Nostromo
 * II's max 100 °C", or null if it can. Matches Spacecraft#can_land_on? in the API.
 */
export function landingProblem(planet: Planet, spacecraft: Spacecraft): string | null {
  if (!planet.destination) return `${planet.name} can't be landed on`
  const t = planet.average_temperature_c
  if (t > spacecraft.max_operating_temp_c) {
    return `${planet.name} ${formatNumber(t)} °C exceeds ${spacecraft.name}'s max ${formatNumber(spacecraft.max_operating_temp_c)} °C`
  }
  if (t < spacecraft.min_operating_temp_c) {
    return `${planet.name} ${formatNumber(t)} °C is below ${spacecraft.name}'s min ${formatNumber(spacecraft.min_operating_temp_c)} °C`
  }
  return null
}

/**
 * The most passengers `spacecraft` can take over `distanceKm` within both its
 * range and its seats, or null if the distance is out of range even when empty.
 */
export function maxPassengersInRange(spacecraft: Spacecraft, distanceKm: number): number | null {
  if (distanceKm <= 0) return spacecraft.capacity

  const byRange = Math.floor((spacecraft.range_km / distanceKm - BASE_RANGE_RATE) / PASSENGER_RANGE_RATE + 1e-9)
  return byRange < 0 ? null : Math.min(byRange, spacecraft.capacity)
}

export interface RouteNeeds {
  /** The route's length; it doesn't depend on the spacecraft. */
  distanceKm: number
  passengers: number
  /** Planets the ship lands on (every stop after the start). */
  landings: Planet[]
}

/** Why `spacecraft` can't fly the route, in a few words, or null if it can. */
export function fitProblem(spacecraft: Spacecraft, needs: RouteNeeds): string | null {
  if (needs.passengers > spacecraft.capacity) return `Seats ${spacecraft.capacity}`
  if (needs.distanceKm * rangeRate(needs.passengers) > spacecraft.range_km) return 'Out of range'
  if (needs.distanceKm / spacecraft.speed_kmh > WINDOW_HOURS) return 'Too slow'
  const hot = needs.landings.find((planet) => landingProblem(planet, spacecraft))
  return hot ? `Can't land on ${hot.name}` : null
}

/** Other spacecraft that can fly the route, smallest range first. */
export const alternativesFor = (current: Spacecraft, fleet: Spacecraft[], needs: RouteNeeds) =>
  fleet
    .filter((s) => s.id !== current.id && fitProblem(s, needs) === null)
    .sort((a, b) => a.range_km - b.range_km)
