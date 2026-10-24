import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { Spacecraft } from '../api/schemas'
import { Chip } from '../components/ui'
import { fleetScale, shipSpec } from '../gl/fleet'
import type { HangarScene } from '../gl/hangar'
import { webglAvailable } from '../gl/support'
import { formatDistance, formatNumber } from '../lib/format'
import { fitProblem, type RouteNeeds } from '../lib/mission'

interface Props {
  spacecraft: Spacecraft[]
  value: number
  onChange: (spacecraft: Spacecraft) => void
  /** The current route, once there is one, to show which spacecraft can fly it. */
  needs: RouteNeeds | null
}

/**
 * The concept's spacecraft picker: a 3D hangar showing the chosen ship, then a
 * row per spacecraft with its specs and bars against the fleet's best.
 */
export function SpacecraftPicker({ spacecraft, value, onChange, needs }: Props) {
  const selected = spacecraft.find((s) => s.id === value) ?? spacecraft[0]
  const best = fleetScale(spacecraft)

  return (
    <div className="grid gap-3">
      <Hangar craft={selected} fleet={spacecraft} />

      <div role="radiogroup" aria-label="Spacecraft" className="grid gap-1.5">
        {spacecraft.map((craft) => {
          const isSelected = craft.id === value
          const problem = needs && fitProblem(craft, needs)

          return (
            <label
              key={craft.id}
              className={`group relative grid cursor-pointer gap-2 rounded border px-3.5 py-[11px] transition-colors duration-300 ease-io has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-blue ${
                isSelected
                  ? 'border-blue/55 bg-[linear-gradient(90deg,var(--color-blue-soft),transparent_70%)] shadow-[inset_2px_0_0_var(--color-blue)]'
                  : 'border-line bg-panel hover:border-line-strong'
              }`}
            >
              <input
                type="radio"
                name="spacecraft"
                className="pointer-events-none absolute opacity-0"
                checked={isSelected}
                onChange={() => onChange(craft)}
              />
              <span className="flex items-center justify-between gap-2">
                <span>
                  <span className="font-medium">{craft.name}</span>
                  {craft.size && <span className="ml-2 text-[12.5px] text-muted">{craft.size}</span>}
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

              <span className="grid grid-cols-3 gap-3">
                <Bar label="Speed" value={`${formatNumber(craft.speed_kmh)} km/h`} share={craft.speed_kmh / best.speedKmh} on={isSelected} />
                <Bar label="Range" value={formatDistance(craft.range_km)} share={craft.range_km / best.range} on={isSelected} />
                <Bar label="Seats" value={String(craft.capacity)} share={craft.capacity / best.capacity} on={isSelected} />
              </span>

              <span className="text-[12px] text-muted">
                {craft.gravity_generator ? 'Gravity generator' : 'No gravity generator'} · operates{' '}
                {formatNumber(craft.min_operating_temp_c)} to {formatNumber(craft.max_operating_temp_c)} °C
              </span>
            </label>
          )
        })}
      </div>
    </div>
  )
}

function Bar({ label, value, share, on }: { label: string; value: string; share: number; on: boolean }) {
  return (
    <span className="grid gap-1" title={`${label}: ${Math.round(share * 100)}% of the fleet's best`}>
      <span className="flex items-baseline justify-between gap-1.5 text-[10.5px] tracking-[0.06em] uppercase">
        <span className="text-muted">{label}</span>
        <span className="truncate text-fg normal-case tabular-nums">{value}</span>
      </span>
      <span className="h-[3px] overflow-hidden rounded-sm bg-ink-2">
        <span
          className={`block h-full transition-[width] duration-500 ease-io ${on ? 'bg-blue shadow-[0_0_8px_var(--color-blue)]' : 'bg-grey'}`}
          style={{ width: `${Math.max(4, Math.min(1, share) * 100)}%` }}
        />
      </span>
    </span>
  )
}

/** The chosen ship as a holographic blueprint (three.js, loaded on demand). */
function Hangar({ craft, fleet }: { craft: Spacecraft; fleet: Spacecraft[] }) {
  const container = useRef<HTMLDivElement>(null)
  const [webgl] = useState(webglAvailable)
  const [scene, setScene] = useState<HangarScene | null>(null)

  useEffect(() => {
    if (!webgl) return
    let created: HangarScene | null = null
    let cancelled = false
    import('../gl/hangar').then(({ HangarScene }) => {
      if (cancelled || !container.current) return
      created = new HangarScene(container.current, fleetScale(fleet))
      setScene(created)
    })
    return () => {
      cancelled = true
      created?.dispose()
      setScene(null)
    }
  }, [webgl, fleet])

  useEffect(() => {
    scene?.setShip(shipSpec(craft))
  }, [scene, craft])

  return (
    <div
      ref={container}
      className={`relative isolate overflow-hidden rounded border border-line bg-[radial-gradient(80%_70%_at_50%_60%,#061427,#000)] ${
        webgl ? 'aspect-[16/11]' : 'min-h-[150px]'
      }`}
    >
      <div className="pointer-events-none absolute inset-x-4 top-3.5">
        <p className="eyebrow">Selected spacecraft</p>
        <h3 className="mt-1 text-[22px] font-medium tracking-[-0.02em]">{craft.name}</h3>
        {craft.size && <p className="text-[13px] text-muted">{craft.size}</p>}
      </div>
      {webgl && <span className="pointer-events-none absolute top-4 right-4 text-[11px] text-grey">Drag to rotate</span>}

      <dl className="pointer-events-none absolute inset-x-0 bottom-0 grid grid-cols-3 border-t border-line bg-[linear-gradient(rgb(0_0_0/0.35),rgb(0_0_0/0.75))] backdrop-blur-sm [&>div+div]:border-l [&>div+div]:border-line">
        <HangarSpec label="Cruise speed">
          {formatNumber(craft.speed_kmh)} <small className="text-[11px] font-normal text-muted">km/h</small>
        </HangarSpec>
        <HangarSpec label="Range">{formatDistance(craft.range_km)}</HangarSpec>
        <HangarSpec label="Seats">{craft.capacity}</HangarSpec>
      </dl>
    </div>
  )
}

function HangarSpec({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="px-3.5 py-2.5">
      <dt className="text-[10.5px] tracking-[0.08em] text-muted uppercase">{label}</dt>
      <dd className="text-[17px] font-medium tabular-nums">{children}</dd>
    </div>
  )
}
