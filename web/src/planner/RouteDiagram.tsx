import { useMemo } from 'react'
import type { MissionResult, Planet } from '../api/schemas'
import { formatDistance } from '../lib/format'
import { planetColour } from '../lib/planets'
import { buildSchematic, legPoints, pathData, pointAlong, type Point } from './schematic'

interface Props {
  /** The calculated mission, or null to show just the planets. */
  result: MissionResult | null
  planets: Planet[]
  /** Index of the highlighted leg, shared with the leg table. */
  highlighted: number | null
  onHighlight: (leg: number | null) => void
}

/**
 * A side view of the route: every body on the axis at a schematic scale, and
 * each leg drawn from the API's path and numbered as in the leg table.
 */
export function RouteDiagram({ result, planets, highlighted, onHighlight }: Props) {
  const schematic = useMemo(() => buildSchematic(planets), [planets])
  const resultLegs = result?.legs ?? []
  const legs = resultLegs.map((leg) => legPoints(leg, schematic))
  const labels = placeLabels(legs.map((points) => pointAlong(points, 0.5)))
  const onRoute = new Set(resultLegs.flatMap((leg) => [leg.from_planet_id, leg.to_planet_id]))
  const name = (id: number) => planets.find((p) => p.id === id)?.name ?? `Planet ${id}`

  return (
    <figure className="grid gap-2 rounded border border-line bg-panel p-4">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-medium">Route</h2>
        <span className="eyebrow">Not to scale</span>
      </figcaption>

      <svg
        viewBox={`0 0 ${schematic.width} ${schematic.height}`}
        className="w-full"
        role="img"
        aria-label={
          result
            ? `Side view of the route, not to scale: ${resultLegs
                .map((leg, i) => `leg ${i + 1}, ${name(leg.from_planet_id)} to ${name(leg.to_planet_id)}`)
                .join('; ')}`
            : 'Side view of the planets, not to scale'
        }
      >
        <line
          x1={0}
          x2={schematic.width}
          y1={schematic.axisY}
          y2={schematic.axisY}
          className="stroke-line-strong"
          strokeDasharray="2 6"
        />

        {schematic.bodies.map(({ planet, cx, r }) => (
          <g key={planet.id} opacity={!result || onRoute.has(planet.id) ? 1 : 0.45}>
            <circle cx={cx} cy={schematic.axisY} r={r} fill={planetColour(planet.slug)} fillOpacity={0.25} stroke={planetColour(planet.slug)} />
            <text x={cx} y={schematic.axisY + Math.max(r, 6) + 16} textAnchor="middle" className="fill-muted text-[12px]">
              {planet.name}
            </text>
          </g>
        ))}

        {legs.map((points, i) => {
          const active = highlighted === i
          const dimmed = highlighted !== null && !active
          const label = labels[i]
          const leg = resultLegs[i]

          return (
            <g
              key={i}
              data-leg={i + 1}
              data-highlighted={active}
              onMouseEnter={() => onHighlight(i)}
              onMouseLeave={() => onHighlight(null)}
              opacity={dimmed ? 0.3 : 1}
              className="cursor-pointer"
            >
              <title>
                {`Leg ${i + 1}: ${name(leg.from_planet_id)} → ${name(leg.to_planet_id)}, ${formatDistance(leg.distance_km)}`}
              </title>
              {/* A wide invisible stroke makes thin legs easy to hover. */}
              <path d={pathData(points)} fill="none" stroke="transparent" strokeWidth={14} />
              <path
                d={pathData(points)}
                fill="none"
                className={active ? 'stroke-orange' : 'stroke-blue'}
                strokeWidth={active ? 3 : 2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              <circle cx={label.x} cy={label.y - 14} r={9} className={active ? 'fill-orange' : 'fill-blue'} />
              <text x={label.x} y={label.y - 10} textAnchor="middle" className="fill-blue-ink text-[11px] font-semibold">
                {i + 1}
              </text>
            </g>
          )
        })}
      </svg>

      <p className="text-[12.5px] text-muted">
        Planets are enlarged and spaced out so the route is visible; at true scale each would be far smaller than a
        pixel. The path is the calculated one, mapped onto this layout. Hover a leg to find it in the flight plan.
      </p>
    </figure>
  )
}

const LABEL_SPACING = 22

/**
 * Leg number positions: each leg's midpoint, raised further when it would sit
 * on an earlier label (a return leg retraces the outbound one, for example).
 */
function placeLabels(midpoints: Point[]): Point[] {
  const placed: Point[] = []
  for (const midpoint of midpoints) {
    const label = { ...midpoint }
    while (placed.some((p) => Math.hypot(p.x - label.x, p.y - label.y) < LABEL_SPACING)) label.y -= LABEL_SPACING
    placed.push(label)
  }
  return placed
}
