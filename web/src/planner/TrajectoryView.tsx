import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { MissionResult, Planet, Spacecraft } from '../api/schemas'
import { buttonStyles } from '../components/styles'
import { formatDistance, formatDuration, formatNumber } from '../lib/format'
import { fleetScale } from '../gl/fleet'
import { webglAvailable } from '../gl/support'
import type { TrajectoryScene } from '../gl/trajectory'
import { RouteDiagram } from './RouteDiagram'

interface Props {
  /** The calculated mission, or null before there is a route. */
  result: MissionResult | null
  planets: Planet[]
  fleet: Spacecraft[]
  spacecraft: Spacecraft
  /** The route's planet ids, Earth first, so stops light up before the result arrives. */
  routeIds: number[]
  highlighted: number | null
  onHighlight: (leg: number | null) => void
  updating: boolean
}

/**
 * The trajectory: the concept's 3D view (three.js, loaded on demand) with the
 * key figures over it, or the 2D side view where WebGL isn't available.
 */
export function TrajectoryView(props: Props) {
  const [webgl] = useState(webglAvailable)
  return webgl ? <Trajectory3D {...props} /> : <Trajectory2D {...props} />
}

function Trajectory3D({ result, planets, fleet, spacecraft, routeIds, highlighted, onHighlight, updating }: Props) {
  const container = useRef<HTMLDivElement>(null)
  const [scene, setScene] = useState<TrajectoryScene | null>(null)
  const latestOnHighlight = useRef(onHighlight)
  useEffect(() => {
    latestOnHighlight.current = onHighlight
  }, [onHighlight])

  // Load three.js and build the scene once per catalog.
  useEffect(() => {
    let created: TrajectoryScene | null = null
    let cancelled = false
    import('../gl/trajectory').then(({ TrajectoryScene }) => {
      if (cancelled || !container.current) return
      created = new TrajectoryScene(container.current, planets, fleetScale(fleet), {
        onHoverLeg: (leg) => latestOnHighlight.current(leg),
      })
      setScene(created)
    })
    return () => {
      cancelled = true
      created?.dispose()
      setScene(null)
    }
  }, [planets, fleet])

  const routeKey = routeIds.join(',')
  useEffect(() => {
    scene?.setResult(result, routeKey ? routeKey.split(',').map(Number) : [], spacecraft)
  }, [scene, result, routeKey, spacecraft])

  useEffect(() => {
    scene?.highlightLeg(highlighted)
  }, [scene, highlighted, result])

  const share = result ? result.totals.range_used_km / result.totals.range_available_km : 0

  return (
    <div ref={container} className="relative isolate h-[max(460px,min(64vh,700px))] overflow-hidden border-b border-line bg-black">
      <div className="pointer-events-none absolute inset-x-5 top-[18px] z-[2] flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Trajectory</p>
          {result ? (
            <p role="status" className="mt-1.5 flex items-center gap-2 text-[22px] font-medium tracking-[-0.02em]">
              <span
                aria-hidden="true"
                className={`size-2 rounded-full ${result.feasible ? 'bg-ok shadow-[0_0_10px_var(--color-ok)]' : 'animate-pulse bg-error shadow-[0_0_10px_var(--color-error)]'}`}
              />
              {result.feasible ? 'Cleared to fly' : 'Cannot fly as planned'}
              {updating && <span className="text-[12.5px] font-normal text-muted">Updating…</span>}
            </p>
          ) : (
            <p className="mt-1.5 text-lg text-muted">Add a destination to plot a course</p>
          )}
        </div>
        <button
          type="button"
          className={`${buttonStyles.ghost} pointer-events-auto min-h-8 bg-black/55 text-[12.5px] backdrop-blur-md`}
          onClick={() => scene?.fit()}
        >
          Fit route
        </button>
      </div>

      {result && (
        <dl className="absolute inset-x-5 bottom-10 z-[2] grid grid-cols-2 rounded border border-line bg-[rgb(3_6_12/0.62)] backdrop-blur-md sm:grid-cols-4 [&>div+div]:border-l [&>div+div]:border-line">
          <Kpi label="Distance" sub={`${result.legs.length} ${result.legs.length === 1 ? 'leg' : 'legs'}`}>
            {formatDistance(result.totals.distance_km)}
          </Kpi>
          <Kpi label="Duration" sub={`at ${formatNumber(spacecraft.speed_kmh)} km/h`}>
            {formatDuration(result.totals.duration_hours)}
          </Kpi>
          <Kpi label="Range used" sub={`${formatDistance(result.totals.range_used_km)} of ${formatDistance(result.totals.range_available_km)}`}>
            <span className={share > 1 ? 'text-error' : undefined}>{Math.round(share * 100)}%</span>
          </Kpi>
          <Kpi label="Passengers" sub={spacecraft.name}>
            {result.passenger_count}
          </Kpi>
        </dl>
      )}

      <p className="pointer-events-none absolute inset-x-5 bottom-3 z-[2] text-[11px] text-grey">
        <span className="font-semibold text-muted">Not to scale</span> · planets enlarged and spaced out · drag to orbit,
        scroll to zoom, click a planet to focus
      </p>
    </div>
  )
}

function Kpi({ label, sub, children }: { label: string; sub: string; children: ReactNode }) {
  return (
    <div className="grid min-w-0 content-start gap-[3px] px-4 py-3">
      <dt className="label">{label}</dt>
      <dd className="text-2xl font-medium tracking-[-0.02em] tabular-nums">{children}</dd>
      <dd className="truncate text-xs text-muted">{sub}</dd>
    </div>
  )
}

/** Without WebGL: the key figures, then the SVG side view. */
function Trajectory2D({ result, planets, highlighted, onHighlight, updating }: Props) {
  return (
    <div className="grid gap-4 px-[22px] pt-[22px]">
      {result && (
        <div className="flex flex-wrap items-baseline gap-x-8 gap-y-2">
          <Stat label="Distance">{formatDistance(result.totals.distance_km)}</Stat>
          <Stat label="Duration">{formatDuration(result.totals.duration_hours)}</Stat>
          <Stat label="Range used">{formatDistance(result.totals.range_used_km)}</Stat>
          <span role="status" className="text-[12.5px] text-muted">
            {updating ? 'Updating…' : ''}
          </span>
        </div>
      )}
      <RouteDiagram result={result} planets={planets} highlighted={highlighted} onHighlight={onHighlight} />
    </div>
  )
}

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid">
      <span className="label">{label}</span>
      <span className="text-2xl font-medium tracking-[-0.01em] tabular-nums">{children}</span>
    </div>
  )
}
