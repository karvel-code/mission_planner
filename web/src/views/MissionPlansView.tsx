import { useState } from 'react'
import { useDeleteMissionPlan, useDuplicateMissionPlan, useMissionPlans } from '../api/hooks'
import type { MissionPlanSummary } from '../api/schemas'
import { inputClass } from '../components/Field'
import { buttonStyles } from '../components/styles'
import { FeasibilityBadge, RouteDots, StatusScreen } from '../components/ui'
import { formatDistance, formatDuration, formatRelative } from '../lib/format'
import { hrefs } from '../lib/route'

/** Saved mission plans, from the cached totals (GET /api/mission_plans). */
export function MissionPlansView() {
  const plans = useMissionPlans()
  const [query, setQuery] = useState('')

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
        <>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by mission or customer"
            aria-label="Search mission plans by name or customer"
            className={`${inputClass} mb-4 max-w-sm rounded-full px-4`}
          />
          <PlansTable plans={matching(plans.data, query)} query={query} />
        </>
      )}
    </section>
  )
}

/** Plans whose name or customer contains `query`, ignoring case. */
function matching(plans: MissionPlanSummary[], query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return plans
  return plans.filter((plan) => [plan.name, plan.customer_name ?? ''].some((text) => text.toLowerCase().includes(q)))
}

function PlansTable({ plans, query }: { plans: MissionPlanSummary[]; query: string }) {
  const duplicatePlan = useDuplicateMissionPlan()
  const deletePlan = useDeleteMissionPlan()
  const [failure, setFailure] = useState<string | null>(null)
  const busy = duplicatePlan.isPending || deletePlan.isPending

  const duplicate = (plan: MissionPlanSummary) =>
    duplicatePlan.mutate(plan.id, { onError: (e) => setFailure(`Couldn't duplicate "${plan.name}": ${e.message}`) })
  const remove = (plan: MissionPlanSummary) => {
    if (!window.confirm(`Delete "${plan.name}"? This cannot be undone.`)) return
    deletePlan.mutate(plan.id, { onError: (e) => setFailure(`Couldn't delete "${plan.name}": ${e.message}`) })
  }

  if (plans.length === 0) return <p className="text-muted">No plans match "{query.trim()}".</p>

  const th = 'label px-3 py-2.5 text-left font-medium'
  const td = 'px-3 py-3 align-top'

  return (
    <>
      {failure && (
        <p role="alert" className="mb-3 text-[13px] text-error">
          {failure}
        </p>
      )}
      <div className="overflow-x-auto rounded border border-line bg-panel">
        <table className="w-full min-w-[1000px] border-collapse text-sm">
          <thead className="border-b border-line">
            <tr>
              <th scope="col" className={th}>Mission</th>
              <th scope="col" className={th}>Spacecraft</th>
              <th scope="col" className={th}>Route</th>
              <th scope="col" className={`${th} text-right`}>Distance</th>
              <th scope="col" className={`${th} text-right`}>Duration</th>
              <th scope="col" className={th}>Status</th>
              <th scope="col" className={th}>Updated</th>
              <th scope="col" className={th}>
                <span className="sr-only">Actions</span>
              </th>
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
                <td className={`${td} whitespace-nowrap text-right`}>
                  <span className="inline-flex gap-1.5">
                    <button
                      type="button"
                      className={`${buttonStyles.ghost} min-h-7 px-3 text-[12.5px]`}
                      onClick={() => duplicate(plan)}
                      disabled={busy}
                      aria-label={`Duplicate ${plan.name}`}
                    >
                      Duplicate
                    </button>
                    <button
                      type="button"
                      className={`${buttonStyles.danger} min-h-7 px-3 text-[12.5px]`}
                      onClick={() => remove(plan)}
                      disabled={busy}
                      aria-label={`Delete ${plan.name}`}
                    >
                      Delete
                    </button>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
