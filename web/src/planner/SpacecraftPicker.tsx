import type { ReactNode } from 'react'
import type { Spacecraft } from '../api/schemas'
import { Chip } from '../components/ui'
import { formatDistance, formatNumber } from '../lib/format'
import { fitProblem, type RouteNeeds } from '../lib/mission'

interface Props {
  spacecraft: Spacecraft[]
  value: number
  onChange: (spacecraft: Spacecraft) => void
  /** The current route, once there is one, to show which spacecraft can fly it. */
  needs: RouteNeeds | null
}

/** Spacecraft cards as a radio group, with each one's specs and fit for the route. */
export function SpacecraftPicker({ spacecraft, value, onChange, needs }: Props) {
  return (
    <div role="radiogroup" aria-label="Spacecraft" className="grid gap-2">
      {spacecraft.map((craft) => {
        const selected = craft.id === value
        const problem = needs && fitProblem(craft, needs)

        return (
          <label
            key={craft.id}
            className={`grid cursor-pointer gap-2.5 rounded border p-3.5 transition-colors duration-300 ease-io ${
              selected
                ? 'border-blue bg-[linear-gradient(90deg,var(--color-blue-soft),transparent_70%)]'
                : 'border-line bg-panel hover:border-line-strong'
            }`}
          >
            <span className="flex items-start justify-between gap-2">
              <span className="flex items-center gap-2.5">
                <input
                  type="radio"
                  name="spacecraft"
                  className="accent-blue"
                  checked={selected}
                  onChange={() => onChange(craft)}
                />
                <span>
                  <span className="block font-semibold">{craft.name}</span>
                  {craft.size && <span className="text-[12.5px] text-muted">{craft.size}</span>}
                </span>
              </span>
              {needs &&
                (problem ? (
                  <Chip tone="error">
                    <span aria-hidden="true">✕</span> {problem}
                  </Chip>
                ) : (
                  <Chip tone="ok">
                    <span aria-hidden="true">✓</span> Fits route
                  </Chip>
                ))}
            </span>

            <dl className="grid grid-cols-3 gap-x-3 gap-y-2 text-[13px]">
              <Spec label="Seats">{craft.capacity}</Spec>
              <Spec label="Speed">{formatNumber(craft.speed_kmh)} km/h</Spec>
              <Spec label="Range">{formatDistance(craft.range_km)}</Spec>
              <Spec label="Gravity">{craft.gravity_generator ? 'Generator' : 'None'}</Spec>
              <Spec label="Operating" wide>
                {formatNumber(craft.min_operating_temp_c)} to {formatNumber(craft.max_operating_temp_c)} °C
              </Spec>
            </dl>
          </label>
        )
      })}
    </div>
  )
}

function Spec({ label, wide, children }: { label: string; wide?: boolean; children: ReactNode }) {
  return (
    <div className={wide ? 'col-span-2' : undefined}>
      <dt className="label">{label}</dt>
      <dd className="tabular-nums">{children}</dd>
    </div>
  )
}
