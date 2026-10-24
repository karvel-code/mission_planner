import type { ReactNode } from 'react'
import type { Planet, Spacecraft } from '../api/schemas'
import { Chip } from '../components/ui'
import { formatNumber } from '../lib/format'
import { landingProblem, timesEarthGravity } from '../lib/mission'
import { planetColour } from '../lib/planets'

/** A planet's details, and whether the chosen spacecraft can land there. */
export function PlanetInfoCard({ planet, spacecraft }: { planet: Planet; spacecraft: Spacecraft }) {
  const problem = landingProblem(planet, spacecraft)
  const habitable = planet.potentially_habitable === null ? 'Unknown' : planet.potentially_habitable ? 'Yes' : 'No'

  return (
    <section aria-label={`${planet.name} details`} className="grid gap-3 rounded border border-line bg-panel-2 p-3.5">
      <header className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 font-semibold">
          <span className="size-2.5 rounded-full" style={{ background: planetColour(planet.slug) }} />
          {planet.name}
        </h3>
        {problem ? (
          <Chip tone="warn">
            <span aria-hidden="true">⚠</span> Can't land
          </Chip>
        ) : (
          <Chip tone="ok">
            <span aria-hidden="true">✓</span> Can land
          </Chip>
        )}
      </header>
      {problem && <p className="text-[12.5px] text-warn">{problem}</p>}

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[13px]">
        <Item label="Temperature">{formatNumber(planet.average_temperature_c)} °C</Item>
        <Item label="Gravity">
          {planet.gravity_m_per_s2} m/s² ({timesEarthGravity(planet.gravity_m_per_s2).toFixed(1)}× Earth)
        </Item>
        <Item label="Radiation">{formatNumber(planet.radiation_levels_msv)} mSv</Item>
        <Item label="Habitable">{habitable}</Item>
        <Item label="Weather" wide>
          {planet.weather_patterns ?? 'Not recorded'}
        </Item>
        <Item label="Moons" wide>
          {planet.moons.length > 0 ? planet.moons.join(', ') : 'None'}
        </Item>
      </dl>
    </section>
  )
}

function Item({ label, wide, children }: { label: string; wide?: boolean; children: ReactNode }) {
  return (
    <div className={wide ? 'col-span-2' : undefined}>
      <dt className="label">{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}
