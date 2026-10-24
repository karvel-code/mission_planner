import type { Spacecraft } from '../api/schemas'
import { inputClass } from '../components/Field'
import { clamp, rangeRate } from '../lib/mission'

interface Props {
  value: number
  onChange: (passengers: number) => void
  spacecraft: Spacecraft
  /** Set when switching spacecraft lowered the count to fit, to explain why. */
  reducedFrom: number | null
}

/** Passenger count, kept within 0…the spacecraft's capacity. */
export function PassengerInput({ value, onChange, spacecraft, reducedFrom }: Props) {
  const capacity = spacecraft.capacity
  const set = (n: number) => onChange(clamp(Number.isFinite(n) ? Math.round(n) : 0, 0, capacity))
  const stepper =
    'grid size-[38px] place-items-center rounded border border-line-strong text-lg hover:enabled:border-fg ' +
    'disabled:cursor-not-allowed disabled:opacity-40'

  return (
    <div className="grid gap-2">
      <div className="flex items-center gap-2">
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
          className={`${inputClass} w-24 text-center tabular-nums`}
        />
        <button
          type="button"
          className={stepper}
          aria-label="More passengers"
          onClick={() => set(value + 1)}
          disabled={value >= capacity}
        >
          +
        </button>
      </div>

      <p id="passenger-hint" className="text-[12.5px] text-muted">
        Up to {capacity} on {spacecraft.name}. Each passenger adds {(rangeRate(1) - rangeRate(0)).toFixed(3)} range per km
        (now {rangeRate(value).toFixed(3)}).
      </p>
      {reducedFrom !== null && (
        <p role="status" className="text-[12.5px] text-warn">
          <span aria-hidden="true">⚠</span> Reduced from {reducedFrom} to {capacity}: {spacecraft.name} seats {capacity}.
        </p>
      )}
    </div>
  )
}
