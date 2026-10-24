import type { ReactNode } from 'react'
import { useMissionPlan, useSpacecraft } from '../api/hooks'
import type { MissionPlan } from '../api/schemas'
import { buttonStyles } from '../components/styles'
import { FeasibilityBadge, StatusScreen } from '../components/ui'
import { formatDistance, formatDuration } from '../lib/format'
import { hrefs } from '../lib/route'

/**
 * The planner workspace from the TEC concept: numbered steps on the left, the
 * mission on the right. Phase 7 lays out the shell and shows a saved plan;
 * the editing controls arrive in Phase 8.
 */
export function PlannerView({ planId }: { planId: number | null }) {
  const plan = useMissionPlan(planId)

  if (planId !== null && plan.isPending) return <StatusScreen eyebrow="Loading">Loading mission plan…</StatusScreen>
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

  return <Workspace plan={plan.data ?? null} />
}

function Workspace({ plan }: { plan: MissionPlan | null }) {
  const spacecraft = useSpacecraft()
  const craft = spacecraft.data?.find((s) => s.id === plan?.spacecraft_id)

  return (
    <div className="grid min-h-[calc(100dvh-64px)] grid-cols-1 lg:grid-cols-[clamp(380px,32vw,480px)_1fr]">
      <section aria-label="Mission configuration" className="border-line bg-bg lg:border-r">
        <header className="border-b border-line px-[22px] py-5">
          <p className="eyebrow">{plan ? 'Mission plan' : 'New mission plan'}</p>
          <h1 className="mt-1 truncate text-[22px] font-medium tracking-[-0.01em]">{plan?.name || 'Untitled mission'}</h1>
        </header>

        <Step n="01" title="Booking">
          {plan ? (
            <dl className="grid grid-cols-2 gap-3">
              <Detail label="Customer">{plan.customer_name || '—'}</Detail>
              <Detail label="Notes">{plan.notes || '—'}</Detail>
            </dl>
          ) : (
            <Pending />
          )}
        </Step>
        <Step n="02" title="Spacecraft">{plan ? <p>{craft?.name ?? '…'}</p> : <Pending />}</Step>
        <Step n="03" title="Passengers">{plan ? <p>{plan.passenger_count}</p> : <Pending />}</Step>
        <Step n="04" title="Route">
          {plan ? <p>{plan.mission.legs.length + 1} stops</p> : <Pending />}
        </Step>
      </section>

      <section aria-label="Mission summary" className="min-w-0 p-[22px]">
        {plan ? (
          <dl className="grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
            <Detail label="Distance">{formatDistance(plan.mission.totals.distance_km)}</Detail>
            <Detail label="Duration">{formatDuration(plan.mission.totals.duration_hours)}</Detail>
            <Detail label="Range used">{formatDistance(plan.mission.totals.range_used_km)}</Detail>
            <Detail label="Status">
              <FeasibilityBadge feasible={plan.mission.feasible} />
            </Detail>
          </dl>
        ) : (
          <p className="text-muted">Choose a spacecraft, passengers, and a route to see the mission here.</p>
        )}
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

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1">
      <dt className="label">{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}

function Pending() {
  return <p className="text-sm text-muted">Editing arrives with the planner controls.</p>
}
