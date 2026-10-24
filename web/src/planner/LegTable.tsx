import type { MissionResult, Planet } from '../api/schemas'
import { formatDistance, formatDuration } from '../lib/format'
import { planetColour } from '../lib/planets'

/** One row per leg, with the mission totals underneath. */
export function LegTable({ result, planets }: { result: MissionResult; planets: Planet[] }) {
  const byId = new Map(planets.map((p) => [p.id, p]))
  const name = (id: number) => byId.get(id)?.name ?? `Planet ${id}`
  const th = 'label px-3 py-2.5 text-left font-medium'
  const num = 'px-3 py-2.5 text-right tabular-nums'

  return (
    <section aria-labelledby="legs-title" className="rounded border border-line bg-panel">
      <h2 id="legs-title" className="px-4 pt-4 text-lg font-medium">
        Flight plan
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-[13.5px]">
          <thead className="border-b border-line">
            <tr>
              <th scope="col" className={th}>Leg</th>
              <th scope="col" className={`${th} text-right`}>Distance</th>
              <th scope="col" className={`${th} text-right`}>Range used</th>
              <th scope="col" className={`${th} text-right`}>Duration</th>
              <th scope="col" className={th}>Flies around</th>
              <th scope="col" className={`${th} text-right`}>Departure wrap</th>
            </tr>
          </thead>
          <tbody>
            {result.legs.map((leg, i) => (
              <tr key={i} className="border-b border-line">
                <td className="px-3 py-2.5">
                  <span className="flex items-center gap-1.5">
                    <Dot planet={byId.get(leg.from_planet_id)} />
                    {name(leg.from_planet_id)}
                    <span aria-label="to" className="text-muted">
                      →
                    </span>
                    <Dot planet={byId.get(leg.to_planet_id)} />
                    {name(leg.to_planet_id)}
                  </span>
                </td>
                <td className={num}>{formatDistance(leg.distance_km)}</td>
                <td className={num}>{formatDistance(leg.range_used_km)}</td>
                <td className={num}>{formatDuration(leg.duration_hours)}</td>
                <td className="px-3 py-2.5 text-muted">
                  {leg.bypassed_planet_ids.length > 0 ? leg.bypassed_planet_ids.map(name).join(', ') : '—'}
                </td>
                <td className={num}>{leg.departure_wrap_km > 0 ? formatDistance(leg.departure_wrap_km) : '—'}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="font-semibold">
              <td className="px-3 py-2.5">
                Total · {result.passenger_count} {result.passenger_count === 1 ? 'passenger' : 'passengers'}
              </td>
              <td className={num}>{formatDistance(result.totals.distance_km)}</td>
              <td className={num}>{formatDistance(result.totals.range_used_km)}</td>
              <td className={num}>{formatDuration(result.totals.duration_hours)}</td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="px-4 py-3 text-[12.5px] text-muted">
        Each leg leaves from where the last one landed and flies around any planet in its way. Departure wrap is the
        distance flown around a planet before leaving it.
      </p>
    </section>
  )
}

function Dot({ planet }: { planet: Planet | undefined }) {
  return (
    <span
      aria-hidden="true"
      className="inline-block size-[9px] rounded-full"
      style={{ background: planetColour(planet?.slug ?? '') }}
    />
  )
}
