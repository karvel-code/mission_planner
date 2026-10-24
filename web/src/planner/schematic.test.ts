import { describe, expect, it } from 'vitest'
import type { Leg } from '../api/schemas'
import { planetNamed, planets } from '../test/catalog'
import { buildSchematic, legPoints, sampleSegment } from './schematic'

const schematic = buildSchematic(planets)
const body = (name: string) => schematic.bodies.find((b) => b.planet.name === name)!
const distanceFromCentre = (name: string, p: { x: number; y: number }) =>
  Math.hypot(p.x - body(name).cx, p.y - schematic.axisY)

// Mars → Jupiter as the API returns it after landing on Mars's Earth-facing
// side: an arc a quarter of the way round Mars, then the tangent line towards
// Jupiter's centre, stopping at its surface.
const mars = planetNamed('Mars')
const jupiter = planetNamed('Jupiter')
const d = jupiter.distance_from_sun_km - mars.distance_from_sun_km
const tangentAngle = Math.acos(mars.radius_km / d)
const tangentPoint = {
  x: mars.distance_from_sun_km + mars.radius_km * Math.cos(tangentAngle),
  y: mars.radius_km * Math.sin(tangentAngle),
}
const towardsJupiter = { x: jupiter.distance_from_sun_km - tangentPoint.x, y: -tangentPoint.y }
const scale = jupiter.radius_km / Math.hypot(towardsJupiter.x, towardsJupiter.y)
const arrival = { x: jupiter.distance_from_sun_km - towardsJupiter.x * scale, y: -towardsJupiter.y * scale }

const marsToJupiter: Leg = {
  from_planet_id: mars.id,
  to_planet_id: jupiter.id,
  distance_km: 0,
  range_used_km: 0,
  duration_hours: 0,
  departure_wrap_km: 0,
  bypassed_planet_ids: [],
  arrival,
  segments: [
    {
      type: 'arc',
      centre: { x: mars.distance_from_sun_km, y: 0 },
      radius_km: mars.radius_km,
      from: { x: mars.distance_from_sun_km - mars.radius_km, y: 0 },
      to: tangentPoint,
      start_angle: Math.PI,
      sweep: tangentAngle - Math.PI,
      length_km: 0,
    },
    { type: 'line', from: tangentPoint, to: arrival, length_km: 0 },
  ],
}

describe('buildSchematic', () => {
  it('places every body on the axis, left to right by distance from the Sun', () => {
    expect(schematic.bodies.map((b) => b.planet.name)).toEqual(planets.map((p) => p.name))
    schematic.bodies.slice(1).forEach((b, i) => expect(b.cx).toBeGreaterThan(schematic.bodies[i].cx))
  })

  it('never lets neighbours touch, and keeps everything inside the view', () => {
    schematic.bodies.slice(1).forEach((b, i) => {
      const previous = schematic.bodies[i]
      expect(b.cx - b.r).toBeGreaterThan(previous.cx + previous.r)
    })
    schematic.bodies.forEach((b) => {
      expect(b.cx - b.r).toBeGreaterThanOrEqual(0)
      expect(b.cx + b.r).toBeLessThanOrEqual(schematic.width)
      expect(schematic.axisY - b.r).toBeGreaterThan(0)
    })
  })

  it('draws bigger planets bigger', () => {
    expect(body('Jupiter').r).toBeGreaterThan(body('Earth').r)
    expect(body('Earth').r).toBeGreaterThan(body('Mercury').r)
  })

  it('maps any point on a planet surface onto its schematic circle', () => {
    for (const name of ['Earth', 'Mars', 'Jupiter', 'Neptune']) {
      const planet = planetNamed(name)
      for (const angle of [0, 0.4, Math.PI / 2, 2.5, Math.PI]) {
        const point = schematic.toScreen({
          x: planet.distance_from_sun_km + planet.radius_km * Math.cos(angle),
          y: planet.radius_km * Math.sin(angle),
        })
        expect(distanceFromCentre(name, point)).toBeCloseTo(body(name).r, 6)
      }
    }
  })

  it('keeps points above the axis above it', () => {
    expect(schematic.toScreen({ x: 500_000_000, y: 10_000 }).y).toBeLessThan(schematic.axisY)
    expect(schematic.toScreen({ x: 500_000_000, y: 0 }).y).toBe(schematic.axisY)
  })
})

describe('legPoints', () => {
  const points = legPoints(marsToJupiter, schematic)

  it('starts on Mars and ends on Jupiter', () => {
    expect(distanceFromCentre('Mars', points[0])).toBeCloseTo(body('Mars').r, 6)
    expect(distanceFromCentre('Jupiter', points.at(-1)!)).toBeCloseTo(body('Jupiter').r, 6)
  })

  it('draws the departure wrap along Mars', () => {
    const arc = legPoints({ ...marsToJupiter, segments: [marsToJupiter.segments[0]] }, schematic)

    arc.forEach((p) => expect(distanceFromCentre('Mars', p)).toBeCloseTo(body('Mars').r, 6))
    expect(Math.min(...arc.map((p) => p.y))).toBeLessThan(schematic.axisY - body('Mars').r * 0.99)
  })

  it('moves steadily from Mars to Jupiter, above the axis', () => {
    points.slice(1).forEach((p, i) => expect(p.x).toBeGreaterThanOrEqual(points[i].x - 1e-9))
    points.forEach((p) => expect(p.y).toBeLessThanOrEqual(schematic.axisY + 1e-9))
  })
})

describe('sampleSegment', () => {
  it('samples an arc finely enough to look round', () => {
    const arc = marsToJupiter.segments[0]
    expect(sampleSegment(arc).length).toBeGreaterThan(16)
  })

  it('keeps a line straight at true scale', () => {
    const line = sampleSegment({ type: 'line', from: { x: 0, y: 0 }, to: { x: 100, y: 50 }, length_km: 0 })
    line.forEach((p) => expect(p.y).toBeCloseTo(p.x / 2, 9))
  })
})
