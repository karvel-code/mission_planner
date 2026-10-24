import type { Spacecraft } from '../api/schemas'
import type { FleetScale, ShipSpec } from './ship'

// The concept's ship builder takes its own field names; these adapt the API's.

export const shipSpec = (spacecraft: Spacecraft): ShipSpec => ({
  capacity: spacecraft.capacity,
  range: spacecraft.range_km,
  speedKmh: spacecraft.speed_kmh,
})

/** Fleet maxima, so each ship is proportioned relative to the others. */
export const fleetScale = (fleet: Spacecraft[]): FleetScale => ({
  capacity: Math.max(...fleet.map((s) => s.capacity)),
  range: Math.max(...fleet.map((s) => s.range_km)),
  speedKmh: Math.max(...fleet.map((s) => s.speed_kmh)),
})
