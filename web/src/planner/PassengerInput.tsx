import type { CSSProperties } from 'react'
import type { Spacecraft } from '../api/schemas'
import { formatDistance } from '../lib/format'
import { BASE_RANGE_RATE, clamp, PASSENGER_RANGE_RATE, rangeRate } from '../lib/mission'

interface Props {
  value: number
  onChange: (passengers: number) => void
  spacecraft: Spacecraft
  /** Set when switching spacecraft lowered the count to fit, to explain why. */
  reducedFrom: number | null
  /** The route's length once calculated, to compare with the ship's reach. */
  routeKm: number | null
}

/** Large spacecraft: one square stands for several seats so the map stays readable. */
const MAX_SEAT_SQUARES = 240

/**
 * The concept's passenger picker: a stepper, a slider, and a seat map, kept
 * within 0…the spacecraft's capacity, with how the load shortens the ship's reach.
 */
export function PassengerInput({ value, onChange, spacecraft, reducedFrom, routeKm }: Props) {
  const capacity = spacecraft.capacity
  const set = (n: number) => onChange(clamp(Number.isFinite(n) ? Math.round(n) : 0, 0, capacity))
  const reach = spacecraft.range_km / rangeRate(value)
  const perSquare = Math.ceil(capacity / MAX_SEAT_SQUARES)
  const squares = Math.ceil(capacity / perSquare)
  const filled = Math.ceil(value / perSquare)
  const stepper =
    'w-11 text-xl text-muted transition-colors hover:enabled:bg-panel-2 hover:enabled:text-fg disabled:cursor-default disabled:opacity-30'

  return (
    <div className="grid gap-3.5">
      <div className="flex flex-wrap items-center gap-4">
        <div className="inline-flex overflow-hidden rounded-full border border-line-strong">
          <button type="button" className={stepper} aria-label="Fewer passengers" onClick={() => set(value - 1)} disabled={value <= 0}>
            −
          </button>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={capacity}
            value={value}
            onChange={(e) => set(e.target.valueAsNumber)}
            aria-label="Number of passengers"
            aria-describedby="passenger-hint"
            className="h-[52px] w-[76px] [appearance:textfield] border-x border-line bg-panel text-center text-[26px] font-medium tabular-nums focus:bg-panel-2 focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <button type="button" className={stepper} aria-label="More passengers" onClick={() => set(value + 1)} disabled={value >= capacity}>
            +
          </button>
        </div>
        <p className="text-sm">
          <strong className="font-semibold tabular-nums">{value}</strong> of {capacity} seats
          <span className="text-muted"> · {spacecraft.name}</span>
        </p>
      </div>

      <input
        type="range"
        min={0}
        max={capacity}
        value={value}
        onChange={(e) => set(e.target.valueAsNumber)}
        aria-label="Passengers slider"
        className="pax-slider"
        style={{ '--fill': `${(value / Math.max(1, capacity)) * 100}%` } as CSSProperties}
      />

      <div aria-hidden="true" className="grid grid-cols-[repeat(auto-fill,minmax(11px,1fr))] gap-1">
        {Array.from({ length: squares }, (_, i) => (
          <span
            key={i}
            className={`aspect-square rounded-[2px] border transition-colors duration-300 ${
              i < filled ? 'border-blue bg-blue shadow-[0_0_6px_rgb(0_161_255/0.5)]' : 'border-ink-2'
            }`}
          />
        ))}
      </div>
      {perSquare > 1 && <p className="text-[12.5px] text-muted">Each square is {perSquare} seats.</p>}

      <p id="passenger-hint" className="text-[12.5px] text-muted">
        Up to {capacity} on {spacecraft.name}.
      </p>
      {reducedFrom !== null && (
        <p role="status" className="text-[12.5px] text-warn">
          <span aria-hidden="true">⚠</span> Reduced from {reducedFrom} to {capacity}: {spacecraft.name} seats {capacity}.
        </p>
      )}

      <div className="grid grid-cols-2 rounded border border-line [&>div+div]:border-l [&>div+div]:border-line">
        <div className="grid gap-0.5 px-3.5 py-3">
          <span className="label">Range per km</span>
          <span className="text-[22px] font-medium tracking-[-0.01em] tabular-nums">{rangeRate(value).toFixed(3)}</span>
          <span className="text-xs text-muted tabular-nums">
            R = {BASE_RANGE_RATE} + {PASSENGER_RANGE_RATE} × {value}
          </span>
        </div>
        <div className="grid gap-0.5 px-3.5 py-3">
          <span className="label">Max reach at this load</span>
          <span className="text-[22px] font-medium tracking-[-0.01em] tabular-nums">{formatDistance(reach)}</span>
          <span className="text-xs text-muted tabular-nums">
            {Math.round((1 - reach / spacecraft.range_km) * 100)}% less than empty
          </span>
        </div>
      </div>

      {routeKm !== null && <ReachMeter routeKm={routeKm} reachKm={reach} />}
    </div>
  )
}

/** The route's length as a share of how far the ship can go with this load. */
function ReachMeter({ routeKm, reachKm }: { routeKm: number; reachKm: number }) {
  const share = routeKm / reachKm
  const tone = share > 1 ? 'error' : share > 0.9 ? 'warn' : 'ok'
  const colours = { error: ['text-error', 'bg-error'], warn: ['text-warn', 'bg-warn'], ok: ['text-ok', 'bg-blue'] }[tone]

  return (
    <div className="grid gap-1.5">
      <div className="flex justify-between text-[13px] tabular-nums">
        <span className="label">Route vs reach</span>
        <span className={colours[0]}>
          {share > 1 && <span aria-hidden="true">! </span>}
          {Math.round(share * 100)}%
        </span>
      </div>
      <div
        role="meter"
        aria-label="Route distance as a share of the ship's reach"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.min(100, Math.round(share * 100))}
        className="h-1 overflow-hidden rounded-sm bg-ink-2"
      >
        <span className={`block h-full transition-[width] duration-500 ${colours[1]}`} style={{ width: `${Math.min(share, 1) * 100}%` }} />
      </div>
    </div>
  )
}
