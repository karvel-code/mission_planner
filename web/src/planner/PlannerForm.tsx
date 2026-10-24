import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo, useState, type ReactNode } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { useMissionCalculation } from '../api/hooks'
import type { MissionPlan, Planet, Spacecraft } from '../api/schemas'
import { Field, inputClass } from '../components/Field'
import { EARTH, type RouteNeeds } from '../lib/mission'
import { useDebouncedValue } from '../lib/useDebouncedValue'
import { AdvisoriesPanel } from './AdvisoriesPanel'
import { FeasibilityPanel } from './FeasibilityPanel'
import { initialValues, plannerFormSchema, type PlannerFormValues } from './form'
import { LegTable } from './LegTable'
import { PassengerInput } from './PassengerInput'
import { PlanetInfoCard } from './PlanetInfoCard'
import { RouteBuilder } from './RouteBuilder'
import { SpacecraftPicker } from './SpacecraftPicker'
import { TrajectoryView } from './TrajectoryView'

/** How long the planner waits after the last change before recalculating. */
export const CALCULATION_DELAY_MS = 300

interface Props {
  plan: MissionPlan | null
  planets: Planet[]
  fleet: Spacecraft[]
}

/**
 * The planner workspace from the TEC concept: numbered steps on the left, the
 * live mission on the right. Every change recalculates through
 * POST /api/mission_calculations once the agent pauses.
 */
export function PlannerForm({ plan, planets, fleet }: Props) {
  const { control, register, setValue, getValues } = useForm<PlannerFormValues>({
    resolver: zodResolver(plannerFormSchema),
    defaultValues: initialValues(plan, fleet),
  })
  const [name, spacecraftId, passengers, stops] = useWatch({
    control,
    name: ['name', 'spacecraft_id', 'passenger_count', 'stops'],
  })
  const [reducedFrom, setReducedFrom] = useState<number | null>(null)
  const [inspected, setInspected] = useState<Planet | null>(null)
  const [highlightedLeg, setHighlightedLeg] = useState<number | null>(null)

  const earth = planets.find((p) => p.name === EARTH)!
  const destinations = planets.filter((p) => p.destination)
  const spacecraft = fleet.find((s) => s.id === spacecraftId) ?? fleet[0]

  // Recalculate only for a route with somewhere to go, after a pause.
  const stopsKey = stops.join(',')
  const input = useMemo(
    () =>
      stopsKey
        ? { spacecraft_id: spacecraftId, passenger_count: passengers, planet_ids: [earth.id, ...stopsKey.split(',').map(Number)] }
        : null,
    [spacecraftId, passengers, stopsKey, earth.id],
  )
  const settledInput = useDebouncedValue(input, CALCULATION_DELAY_MS)
  const calculation = useMissionCalculation(settledInput)
  const result = input && calculation.data ? calculation.data : null
  const updating = input !== settledInput || calculation.isFetching

  const byId = new Map(planets.map((p) => [p.id, p]))
  const needs: RouteNeeds | null = result && {
    distanceKm: result.totals.distance_km,
    passengers,
    landings: stops.map((id) => byId.get(id)!),
  }

  // Switching to a smaller spacecraft lowers the passenger count to fit.
  const chooseSpacecraft = (craft: Spacecraft) => {
    setValue('spacecraft_id', craft.id)
    const current = getValues('passenger_count')
    setReducedFrom(current > craft.capacity ? current : null)
    if (current > craft.capacity) setValue('passenger_count', craft.capacity)
  }

  return (
    <div className="grid min-h-[calc(100dvh-64px)] grid-cols-1 lg:grid-cols-[clamp(380px,32vw,480px)_1fr]">
      <section aria-label="Mission configuration" className="border-line bg-bg lg:border-r">
        <header className="border-b border-line px-[22px] py-5">
          <p className="eyebrow">{plan ? 'Mission plan' : 'New mission plan'}</p>
          <h1 className="mt-1 truncate text-[22px] font-medium tracking-[-0.01em]">{name.trim() || 'Untitled mission'}</h1>
        </header>

        <Step n="01" title="Booking">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Mission name">
              <input className={inputClass} placeholder="e.g. Outer giants tour" {...register('name')} />
            </Field>
            <Field label="Customer" hint="Person or group booking">
              <input className={inputClass} placeholder="e.g. Okafor family" {...register('customer_name')} />
            </Field>
            <div className="col-span-2">
              <Field label="Notes">
                <input className={inputClass} placeholder="Internal notes" {...register('notes')} />
              </Field>
            </div>
          </div>
        </Step>

        <Step n="02" title="Spacecraft">
          <SpacecraftPicker spacecraft={fleet} value={spacecraft.id} onChange={chooseSpacecraft} needs={needs} />
        </Step>

        <Step n="03" title="Passengers">
          <Controller
            control={control}
            name="passenger_count"
            render={({ field }) => (
              <PassengerInput
                value={field.value}
                onChange={(n) => {
                  setReducedFrom(null)
                  field.onChange(n)
                }}
                spacecraft={spacecraft}
                reducedFrom={reducedFrom}
                routeKm={result?.totals.distance_km ?? null}
              />
            )}
          />
        </Step>

        <Step n="04" title="Route">
          <Controller
            control={control}
            name="stops"
            render={({ field }) => (
              <RouteBuilder
                earth={earth}
                destinations={destinations}
                stops={field.value}
                onChange={field.onChange}
                spacecraft={spacecraft}
                onInspect={setInspected}
              />
            )}
          />
          {inspected && (
            <div className="mt-4">
              <PlanetInfoCard planet={inspected} spacecraft={spacecraft} />
            </div>
          )}
        </Step>
      </section>

      <section aria-label="Mission" aria-busy={updating} className="grid min-w-0 content-start">
        <TrajectoryView
          result={result}
          planets={planets}
          fleet={fleet}
          spacecraft={spacecraft}
          routeIds={input?.planet_ids ?? []}
          highlighted={highlightedLeg}
          onHighlight={setHighlightedLeg}
          updating={updating}
        />

        <div className="grid content-start gap-4 p-[22px]">
          {!input ? (
            <p className="text-muted">Add a destination in step 04 to see the legs, travel time, and range.</p>
          ) : calculation.isError ? (
            <p role="alert" className="text-error">
              Could not calculate this mission: {calculation.error.message}
            </p>
          ) : !result || !needs ? (
            <p className="text-muted">Calculating…</p>
          ) : (
            <>
              <FeasibilityPanel result={result} spacecraft={spacecraft} fleet={fleet} needs={needs} />
              <AdvisoriesPanel advisories={result.advisories} />
              <LegTable result={result} planets={planets} highlighted={highlightedLeg} onHighlight={setHighlightedLeg} />
            </>
          )}
        </div>
      </section>
    </div>
  )
}

function Step({ n, title, children }: { n: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={`step-${n}`} className="border-b border-line px-[22px] pt-[22px] pb-[26px]">
      <header className="mb-4 flex items-baseline gap-3">
        <span className="text-[11px] font-semibold tracking-[0.1em] text-orange tabular-nums">{n}</span>
        <h2 id={`step-${n}`} className="text-xl font-medium tracking-[-0.015em]">
          {title}
        </h2>
      </header>
      {children}
    </section>
  )
}
