import { describe, expect, it } from 'vitest'
import { fleet, planetNamed, spacecraftNamed } from '../test/catalog'
import {
  alternativesFor,
  fitProblem,
  hasConsecutiveDuplicate,
  landingProblem,
  maxPassengersInRange,
  rangeRate,
  timesEarthGravity,
} from './mission'

describe('mission rules', () => {
  it('uses R = 1 + 0.042 × passengers', () => {
    expect(rangeRate(10) * 1_000).toBeCloseTo(1_420)
  })

  it('expresses gravity in g', () => {
    expect(timesEarthGravity(24.79).toFixed(1)).toBe('2.5')
  })

  it('spots the same planet twice in a row', () => {
    expect(hasConsecutiveDuplicate([4, 5, 4])).toBe(false)
    expect(hasConsecutiveDuplicate([4, 5, 5])).toBe(true)
  })
})

describe('landingProblem', () => {
  it('explains a planet that is too hot or too cold', () => {
    expect(landingProblem(planetNamed('Venus'), spacecraftNamed('Nostromo II'))).toBe(
      "Venus 464 °C exceeds Nostromo II's max 100 °C",
    )
    expect(landingProblem(planetNamed('Neptune'), { ...spacecraftNamed('Serenity XL'), min_operating_temp_c: -150 })).toBe(
      "Neptune -200 °C is below Serenity XL's min -150 °C",
    )
  })

  it('accepts the inclusive boundary', () => {
    expect(landingProblem(planetNamed('Venus'), spacecraftNamed('Star Explorer 1'))).toBeNull()
  })

  it('never allows landing on a star', () => {
    expect(landingProblem(planetNamed('Sun'), spacecraftNamed('Serenity XL'))).toBe("Sun can't be landed on")
  })
})

describe('maxPassengersInRange', () => {
  const toNeptune = 4_345_369_007

  it('fits 20 on Nyx Odyssey to Neptune (PLAN.md section 4b)', () => {
    expect(maxPassengersInRange(spacecraftNamed('Nyx Odyssey'), toNeptune)).toBe(20)
  })

  it('never exceeds the seats', () => {
    expect(maxPassengersInRange(spacecraftNamed('Serenity XL'), 1_000)).toBe(30)
  })

  it('is null when even an empty ship is out of range', () => {
    expect(maxPassengersInRange(spacecraftNamed('Millennial Hopper'), 628_823_719)).toBeNull()
  })
})

describe('fitProblem and alternativesFor', () => {
  const venus = { distanceKm: 41_387_577, passengers: 2, landings: [planetNamed('Venus')] }

  it('names the first thing that stops a spacecraft flying the route', () => {
    expect(fitProblem(spacecraftNamed('Galactica Scout'), { ...venus, passengers: 4 })).toBe('Seats 3')
    expect(fitProblem(spacecraftNamed('Millennial Hopper'), { ...venus, distanceKm: 628_823_719 })).toBe('Out of range')
    expect(fitProblem(spacecraftNamed('Nostromo II'), venus)).toBe("Can't land on Venus")
    expect(fitProblem(spacecraftNamed('Star Explorer 1'), venus)).toBeNull()
  })

  it('lists the other spacecraft that fit, smallest range first', () => {
    expect(alternativesFor(spacecraftNamed('Nostromo II'), fleet, venus).map((s) => s.name)).toEqual([
      'Galactica Scout',
      'Star Explorer 1',
      'Serenity XL',
    ])
  })
})
