import { useMissionPlans } from '../api/hooks'
import type { MissionPlanSummary } from '../api/schemas'
import { buttonStyles } from '../components/styles'
import { FeasibilityBadge, RouteDots, StatusScreen } from '../components/ui'
import { formatDistance, formatDuration, formatRelative } from '../lib/format'
import { hrefs } from '../lib/route'

/** Saved mission plans, from the cached totals (GET /api/mission_plans). */
export function MissionPlansView() {
  const plans = useMissionPlans()

  if (plans.isPending) return <StatusScreen eyebrow="Loading">Loading mission plans…</StatusScreen>
  if (plans.isError) {
    return (
      <StatusScreen eyebrow="Connection lost" title="Mission plans unavailable">
        <p className="text-muted">Could not load mission plans: {plans.error.message}</p>
        <p>
          <button type="button" className={buttonStyles.ghost} onClick={() => plans.refetch()}>
            Try again
          </button>
        </p>
      </StatusScreen>
    )
  }

  return (
    <section aria-labelledby="plans-title" className="mx-auto max-w-6xl px-5 py-8">
      <header className="mb-6">
        <p className="eyebrow">Saved plans · {plans.data.length}</p>
        <h1 id="plans-title" className="mt-1 text-[28px] font-medium tracking-[-0.02em]">
          Mission plans
        </h1>
      </header>

      {plans.data.length === 0 ? (
        <div className="grid justify-items-start gap-4 rounded border border-line bg-panel p-6">
          <p className="text-muted">No saved mission plans yet.</p>
          <a href={hrefs.newPlan} className={buttonStyles.primary}>
            + New plan
          </a>
        </div>
      ) : (
        <PlansTable plans={plans.data} />
      )}
    </section>
  )
}

function PlansTable({ plans }: { plans: MissionPlanSummary[] }) {
  const th = 'label px-3 py-2.5 text-left font-medium'
  const td = 'px-3 py-3 align-top'

  return (
    <div className="overflow-x-auto rounded border border-line bg-panel">
      <table className="w-full min-w-[860px] border-collapse text-sm">
        <thead className="border-b border-line">
          <tr>
            <th scope="col" className={th}>Mission</th>
            <th scope="col" className={th}>Spacecraft</th>
            <th scope="col" className={th}>Route</th>
            <th scope="col" className={`${th} text-right`}>Distance</th>
            <th scope="col" className={`${th} text-right`}>Duration</th>
            <th scope="col" className={th}>Status</th>
            <th scope="col" className={th}>Updated</th>
          </tr>
        </thead>
        <tbody>
          {plans.map((plan) => (
            <tr key={plan.id} className="border-b border-line last:border-b-0 hover:bg-panel-2">
              <td className={td}>
                <a href={hrefs.plan(plan.id)} className="font-semibold hover:text-blue">
                  {plan.name}
                </a>
                <div className="text-[12.5px] text-muted">{plan.customer_name || 'No customer'}</div>
              </td>
              <td className={td}>
                {plan.spacecraft.name}
                <div className="text-[12.5px] text-muted">
                  {plan.passenger_count} {plan.passenger_count === 1 ? 'passenger' : 'passengers'}
                </div>
              </td>
              <td className={td}>
                <RouteDots names={plan.stops.map((stop) => stop.name)} />
                <div className="mt-1 text-[12.5px] text-muted">{plan.stops.map((stop) => stop.name).join(' → ')}</div>
              </td>
              <td className={`${td} text-right tabular-nums`}>
                {plan.total_distance_km === null ? '—' : formatDistance(plan.total_distance_km)}
              </td>
              <td className={`${td} text-right tabular-nums`}>
                {plan.duration_hours === null ? '—' : formatDuration(plan.duration_hours)}
              </td>
              <td className={td}>
                <FeasibilityBadge feasible={plan.feasible} />
              </td>
              <td className={`${td} whitespace-nowrap text-muted`}>{formatRelative(plan.updated_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
