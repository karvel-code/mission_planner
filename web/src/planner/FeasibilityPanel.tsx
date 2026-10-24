import type { ReactNode } from 'react'
import type { MissionResult, Spacecraft } from '../api/schemas'
import { FeasibilityBadge } from '../components/ui'
import { formatDistance, formatDuration } from '../lib/format'
import { landingProblem, WINDOW_HOURS, type RouteNeeds } from '../lib/mission'
import { adviceFor } from './advice'

interface Props {
  result: MissionResult
  spacecraft: Spacecraft
  fleet: Spacecraft[]
  needs: RouteNeeds
}

/** Range, time, seats, and landing temperatures against their limits, then what to do about any violation. */
export function FeasibilityPanel({ result, spacecraft, fleet, needs }: Props) {
  const { totals } = result
  const tooHot = needs.landings.filter((planet) => landingProblem(planet, spacecraft))

  return (
    <section aria-labelledby="feasibility-title" className="grid gap-4 rounded border border-line bg-panel p-4">
      <header className="flex items-center justify-between gap-3">
        <h2 id="feasibility-title" className="text-lg font-medium">
          Feasibility
        </h2>
        <FeasibilityBadge feasible={result.feasible} />
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        <Meter
          label="Range"
          share={totals.range_used_km / totals.range_available_km}
          text={`${formatDistance(totals.range_used_km)} of ${formatDistance(totals.range_available_km)}`}
        />
        <Meter
          label="Duration"
          share={totals.duration_hours / WINDOW_HOURS}
          text={`${formatDuration(totals.duration_hours)} of the 42-year window`}
        />
        <Check label="Capacity" ok={result.passenger_count <= spacecraft.capacity}>
          {result.passenger_count} of {spacecraft.capacity} seats
        </Check>
        <Check label="Landing temperatures" ok={tooHot.length === 0}>
          {tooHot.length === 0
            ? `${spacecraft.name} can land at every stop`
            : `Can't land on ${tooHot.map((p) => p.name).join(', ')}`}
        </Check>
      </div>

      {result.violations.length > 0 && (
        <ul aria-label="Blocking problems" className="grid gap-2">
          {result.violations.map((violation, i) => (
            <li key={i} className="flex gap-2 rounded border border-error/40 bg-error-soft px-3 py-2 text-[13.5px]">
              <span className="font-semibold text-error">Blocker</span>
              <span>{adviceFor(violation, spacecraft, fleet, needs)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/** A limit as a bar: green within it, amber above 90%, red beyond it. */
function Meter({ label, share, text }: { label: string; share: number; text: string }) {
  const percent = Math.round(share * 100)
  const tone = share > 1 ? 'bg-error' : share > 0.9 ? 'bg-warn' : 'bg-ok'

  return (
    <div className="grid gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="label">{label}</span>
        <span className={`text-[13px] tabular-nums ${share > 1 ? 'text-error' : 'text-fg'}`}>
          {share > 1 && <span aria-hidden="true">! </span>}
          {percent}%
        </span>
      </div>
      <div
        role="meter"
        aria-label={`${label} used`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.min(percent, 100)}
        aria-valuetext={`${percent}%: ${text}`}
        className="h-1.5 overflow-hidden rounded-full bg-ink-2"
      >
        <span className={`block h-full ${tone}`} style={{ width: `${Math.max(Math.min(share, 1) * 100, 1)}%` }} />
      </div>
      <span className="text-[12.5px] text-muted">{text}</span>
    </div>
  )
}

function Check({ label, ok, children }: { label: string; ok: boolean; children: ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <span className="label">{label}</span>
      <span className={`text-[13.5px] ${ok ? 'text-fg' : 'text-error'}`}>
        <span aria-hidden="true" className={ok ? 'text-ok' : 'text-error'}>
          {ok ? '✓' : '✕'}{' '}
        </span>
        {children}
      </span>
    </div>
  )
}
