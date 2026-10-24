import type { Leg, Planet, Segment } from '../api/schemas'

// Maps the API's true-scale trajectory onto a schematic side view. At true
// scale every planet would be far smaller than a pixel, so planets are spread
// out on a non-linear scale and drawn much larger. The path is never
// recomputed here: each segment is sampled and its points are transformed.
//
// Within a planet's own span (centre ± radius) the transform is a uniform
// scale and shift, so surface points, arcs, and departure wraps land exactly
// on the enlarged schematic circle. Between planets the scale blends linearly.

export interface Point {
  x: number
  y: number
}

export interface SchematicBody {
  planet: Planet
  /** Screen centre x and radius. Every centre sits on the axis. */
  cx: number
  r: number
}

export interface Schematic {
  width: number
  height: number
  /** Screen y of the axis the planets sit on. */
  axisY: number
  bodies: SchematicBody[]
  /** A true-scale point (km, Sun at the origin) in screen coordinates. */
  toScreen: (point: Point) => Point
}

export interface Layout {
  width: number
  height: number
  axisY: number
  margin: number
}

// Paths rise no higher than the largest drawn planet (MAX_RADIUS), so the view
// only needs room for that, stacked leg labels above it, and names below.
export const DEFAULT_LAYOUT: Layout = { width: 1000, height: 160, axisY: 105, margin: 36 }

/** How much of the spacing is even (vs logarithmic by distance from the Sun). */
const EVEN_WEIGHT = 0.5
/** Distance (km) that softens the log scale near the Sun. */
const LOG_SOFTENING_KM = 2e7
/** Largest schematic radius, and the radius of the largest planet before capping. */
const MAX_RADIUS = 30
const PLANET_RADIUS = 24

export function buildSchematic(planets: Planet[], layout: Layout = DEFAULT_LAYOUT): Schematic {
  const sorted = [...planets].sort((a, b) => a.distance_from_sun_km - b.distance_from_sun_km)
  const n = sorted.length
  const maxDistance = sorted[n - 1].distance_from_sun_km
  const largestPlanet = Math.max(...sorted.filter((p) => p.destination).map((p) => p.radius_km))
  const span = layout.width - 2 * layout.margin

  const logOf = (d: number) => Math.log1p(d / LOG_SOFTENING_KM) / Math.log1p(maxDistance / LOG_SOFTENING_KM)
  const centres = sorted.map(
    (p, i) => layout.margin + span * (EVEN_WEIGHT * (n === 1 ? 0 : i / (n - 1)) + (1 - EVEN_WEIGHT) * logOf(p.distance_from_sun_km)),
  )

  // Radii grow with the square root of the true radius, then are capped so
  // neighbours never touch and nothing rises above the top of the view.
  const radii = sorted.map((p, i) => {
    const wanted = Math.min(MAX_RADIUS, 4 + PLANET_RADIUS * Math.sqrt(p.radius_km / largestPlanet))
    const gaps = [i > 0 ? centres[i] - centres[i - 1] : Infinity, i < n - 1 ? centres[i + 1] - centres[i] : Infinity]
    return Math.min(wanted, 0.45 * Math.min(...gaps), layout.axisY - 8)
  })

  // Control points along true x: each body's left surface, centre, and right
  // surface, with their screen x and the scale that applies there.
  const knots = sorted.flatMap((p, i) => {
    const scale = radii[i] / p.radius_km
    return [-1, 0, 1].map((side) => ({
      x: p.distance_from_sun_km + side * p.radius_km,
      screenX: centres[i] + side * radii[i],
      scale,
    }))
  })

  const toScreen = ({ x, y }: Point): Point => {
    const { screenX, scale } = interpolate(knots, x)
    return { x: screenX, y: layout.axisY - y * scale }
  }

  return {
    width: layout.width,
    height: layout.height,
    axisY: layout.axisY,
    bodies: sorted.map((planet, i) => ({ planet, cx: centres[i], r: radii[i] })),
    toScreen,
  }
}

type Knot = { x: number; screenX: number; scale: number }

/** Piecewise-linear screen x and scale at true x; beyond the ends, the end scale carries on. */
function interpolate(knots: Knot[], x: number): { screenX: number; scale: number } {
  const first = knots[0]
  const last = knots[knots.length - 1]
  if (x <= first.x) return { screenX: first.screenX + (x - first.x) * first.scale, scale: first.scale }
  if (x >= last.x) return { screenX: last.screenX + (x - last.x) * last.scale, scale: last.scale }

  let i = 1
  while (knots[i].x < x) i++
  const a = knots[i - 1]
  const b = knots[i]
  const t = (x - a.x) / (b.x - a.x)
  return { screenX: a.screenX + t * (b.screenX - a.screenX), scale: a.scale + t * (b.scale - a.scale) }
}

/** True-scale points along a segment, close enough together to draw smoothly once mapped. */
export function sampleSegment(segment: Segment): Point[] {
  if (segment.type === 'arc') {
    const steps = Math.max(8, Math.ceil(Math.abs(segment.sweep) / (Math.PI / 36)))
    return Array.from({ length: steps + 1 }, (_, i) => {
      const angle = segment.start_angle + (segment.sweep * i) / steps
      return {
        x: segment.centre.x + segment.radius_km * Math.cos(angle),
        y: segment.centre.y + segment.radius_km * Math.sin(angle),
      }
    })
  }

  const steps = 24
  return Array.from({ length: steps + 1 }, (_, i) => ({
    x: segment.from.x + ((segment.to.x - segment.from.x) * i) / steps,
    y: segment.from.y + ((segment.to.y - segment.from.y) * i) / steps,
  }))
}

/** A leg as screen points, in flight order. */
export const legPoints = (leg: Leg, schematic: Schematic): Point[] =>
  leg.segments.flatMap((segment) => sampleSegment(segment)).map(schematic.toScreen)

/** SVG path data through `points`. */
export const pathData = (points: Point[]) =>
  points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ')
