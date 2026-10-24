import type { Issue } from '../api/schemas'

/** Warnings that don't block the mission, kept apart from the blocking problems. */
export function AdvisoriesPanel({ advisories }: { advisories: Issue[] }) {
  if (advisories.length === 0) return null

  return (
    <section aria-labelledby="advisories-title" className="grid gap-3 rounded border border-warn/30 bg-warn-soft p-4">
      <header>
        <h2 id="advisories-title" className="text-lg font-medium">
          Advisories
        </h2>
        <p className="text-[12.5px] text-muted">Worth telling the customer. These don't stop the mission.</p>
      </header>
      <ul className="grid gap-1.5 text-[13.5px]">
        {advisories.map((advisory, i) => (
          <li key={i} className="flex gap-2">
            <span aria-hidden="true" className="text-warn">
              ⓘ
            </span>
            <span>
              <span className="sr-only">Advisory: </span>
              {advisory.message}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
