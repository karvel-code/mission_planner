import type { Planet, Spacecraft } from '../api/schemas'
import { hasConsecutiveDuplicate, landingProblem } from '../lib/mission'
import { planetColour } from '../lib/planets'

interface Props {
  earth: Planet
  /** Destinations that can be added: every planet, never the Sun. */
  destinations: Planet[]
  /** Planet ids after Earth, in visiting order. */
  stops: number[]
  onChange: (stops: number[]) => void
  spacecraft: Spacecraft
  /** Shows a planet's details, e.g. on hover or focus. */
  onInspect: (planet: Planet) => void
}

/**
 * The route, starting at Earth: add destinations in order, then reorder or
 * remove them. Any change that would put the same planet twice in a row is
 * blocked, and stops the spacecraft can't land on are flagged with the reason.
 */
export function RouteBuilder({ earth, destinations, stops, onChange, spacecraft, onInspect }: Props) {
  const byId = new Map([earth, ...destinations].map((p) => [p.id, p]))
  const planet = (id: number) => byId.get(id)!
  const last = stops.at(-1) ?? earth.id
  // Earth leads the route, so it counts when checking for repeats.
  const allowed = (next: number[]) => !hasConsecutiveDuplicate([earth.id, ...next])

  const move = (i: number, delta: number) => {
    const next = [...stops]
    ;[next[i], next[i + delta]] = [next[i + delta], next[i]]
    return next
  }
  const without = (i: number) => stops.filter((_, j) => j !== i)
  const iconButton =
    'grid size-7 place-items-center rounded border border-transparent text-muted hover:enabled:border-line-strong ' +
    'hover:enabled:text-fg disabled:cursor-default disabled:opacity-25'

  return (
    <div className="grid gap-4">
      <div>
        <p className="mb-2 text-[12.5px] text-muted">Add destinations in the order the customer wants to visit them.</p>
        <div role="group" aria-label="Add a destination" className="flex flex-wrap gap-1.5">
          {destinations.map((p) => {
            const problem = landingProblem(p, spacecraft)
            const repeat = p.id === last

            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onChange([...stops, p.id])}
                onMouseEnter={() => onInspect(p)}
                onFocus={() => onInspect(p)}
                disabled={repeat}
                title={repeat ? `Already at ${p.name}` : (problem ?? undefined)}
                aria-label={`Add ${p.name}${problem ? ` (${problem})` : ''}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-panel px-3 py-1 text-[13px] hover:enabled:border-fg disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span className="size-[9px] rounded-full" style={{ background: planetColour(p.slug) }} />
                {p.name}
                {problem && (
                  <span className="text-warn">
                    <span aria-hidden="true">⚠</span>
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <ol aria-label="Route" className="grid gap-1.5">
        <li className="flex items-center gap-2.5 rounded border border-line bg-panel px-3 py-2">
          <Marker colour={planetColour(earth.slug)} />
          <span>
            Earth <span className="text-[12.5px] text-muted">Departure</span>
          </span>
        </li>

        {stops.map((id, i) => {
          const p = planet(id)
          const problem = landingProblem(p, spacecraft)

          return (
            <li key={`${id}-${i}`} className="grid gap-1 rounded border border-line bg-panel px-3 py-2">
              <span className="flex items-center gap-2.5">
                <Marker colour={planetColour(p.slug)} label={String(i + 1)} />
                <button type="button" className="flex-1 text-left hover:text-blue" onClick={() => onInspect(p)}>
                  {p.name}
                </button>
                <span className="flex gap-1">
                  <button
                    type="button"
                    className={iconButton}
                    aria-label={`Move ${p.name} earlier`}
                    disabled={i === 0 || !allowed(move(i, -1))}
                    onClick={() => onChange(move(i, -1))}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className={iconButton}
                    aria-label={`Move ${p.name} later`}
                    disabled={i === stops.length - 1 || !allowed(move(i, 1))}
                    onClick={() => onChange(move(i, 1))}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className={`${iconButton} hover:enabled:border-error hover:enabled:text-error`}
                    aria-label={`Remove ${p.name}`}
                    disabled={!allowed(without(i))}
                    title={allowed(without(i)) ? undefined : 'Removing this stop would repeat a planet'}
                    onClick={() => onChange(without(i))}
                  >
                    ×
                  </button>
                </span>
              </span>
              {problem && (
                <span className="text-[12.5px] text-warn">
                  <span aria-hidden="true">⚠</span> Can't land: {problem}
                </span>
              )}
            </li>
          )
        })}

        {stops.length === 0 && <li className="px-3 py-2 text-[12.5px] text-muted">No destinations yet</li>}
      </ol>
    </div>
  )
}

function Marker({ colour, label }: { colour: string; label?: string }) {
  return (
    <span
      aria-hidden="true"
      className="grid size-[22px] flex-none place-items-center rounded-full border-2 text-[11px] font-semibold tabular-nums"
      style={{ borderColor: colour }}
    >
      {label}
    </span>
  )
}
