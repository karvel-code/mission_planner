import { useMissionPlan, usePlanets, useSpacecraft } from '../api/hooks'
import { buttonStyles } from '../components/styles'
import { StatusScreen } from '../components/ui'
import { hrefs } from '../lib/route'
import { PlannerForm } from '../planner/PlannerForm'

/** Loads the catalog (and the saved plan, if any), then shows the planner. */
export function PlannerView({ planId }: { planId: number | null }) {
  const plan = useMissionPlan(planId)
  const planets = usePlanets()
  const spacecraft = useSpacecraft()

  if (plan.isError) {
    return (
      <StatusScreen eyebrow="Not available" title="Mission plan not found">
        <p className="text-muted">{plan.error.message}</p>
        <p>
          <a href={hrefs.plans} className={buttonStyles.ghost}>
            Back to mission plans
          </a>
        </p>
      </StatusScreen>
    )
  }
  if (planets.isError || spacecraft.isError) {
    return (
      <StatusScreen eyebrow="Connection lost" title="Planner unavailable">
        <p className="text-muted">Could not load planets and spacecraft: {(planets.error ?? spacecraft.error)?.message}</p>
      </StatusScreen>
    )
  }
  if ((planId !== null && plan.isPending) || planets.isPending || spacecraft.isPending) {
    return <StatusScreen eyebrow="Loading">Loading planning data…</StatusScreen>
  }

  return <PlannerForm plan={plan.data ?? null} planets={planets.data} fleet={spacecraft.data} />
}
