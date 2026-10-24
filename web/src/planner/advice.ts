import type { Issue, Spacecraft } from '../api/schemas'
import { alternativesFor, maxPassengersInRange, type RouteNeeds } from '../lib/mission'

const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? '' : 's'}`
const sentence = (options: string[]) => {
  const text = options.join(' or ')
  return text ? ` ${text[0].toUpperCase()}${text.slice(1)}.` : ''
}

/**
 * A violation as an actionable message, e.g. "Exceeds range by 2%. Reduce to
 * 20 passengers or choose Serenity XL." Falls back to the API's own message.
 */
export function adviceFor(violation: Issue, spacecraft: Spacecraft, fleet: Spacecraft[], needs: RouteNeeds): string {
  const alternative = alternativesFor(spacecraft, fleet, needs)[0]
  const choose = alternative ? [`choose ${alternative.name}`] : []

  switch (violation.code) {
    case 'range_exceeded': {
      const used = Number(violation.details.range_used)
      const over = Math.max(1, Math.round((used / spacecraft.range_km - 1) * 100))
      const fits = maxPassengersInRange(spacecraft, needs.distanceKm)
      const reduce = fits !== null && fits < needs.passengers ? [`reduce to ${plural(fits, 'passenger')}`] : []
      return `Exceeds range by ${over}%.${sentence([...reduce, ...choose])}`
    }
    case 'over_capacity':
      return `${violation.message}${sentence([`reduce to ${plural(spacecraft.capacity, 'passenger')}`, ...choose])}`
    case 'duration_exceeded':
    case 'temperature_incompatible':
      return `${violation.message}${sentence(choose)}`
    default:
      return violation.message
  }
}
