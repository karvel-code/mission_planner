import type { ReactNode } from 'react'
import { hrefs, type Route } from '../lib/route'
import { buttonStyles } from './styles'

/** The top bar from the TEC concept, with links to the two views. */
export function Layout({ route, children }: { route: Route; children: ReactNode }) {
  const onList = route.view === 'plans'

  return (
    <div className="grid min-h-dvh grid-rows-[64px_1fr] bg-black">
      <header className="sticky top-0 z-10 flex items-center gap-5 border-b border-line bg-[linear-gradient(#000_60%,rgb(0_0_0/0.85))] px-5">
        <a href={hrefs.plans} className="flex items-center gap-2.5 text-[15px] whitespace-nowrap">
          <svg viewBox="0 0 32 32" aria-hidden="true" className="size-[26px] fill-none stroke-fg stroke-[1.5]">
            <circle cx="12" cy="18" r="9" />
            <circle cx="25" cy="7" r="4" className="fill-orange stroke-none" />
          </svg>
          <span>
            <strong className="mr-1 font-bold tracking-[0.06em]">TEC</strong> Mission Planner
          </span>
        </a>

        <nav aria-label="Main" className="flex flex-1 items-center gap-2 border-l border-line pl-5">
          <a
            href={hrefs.plans}
            aria-current={onList ? 'page' : undefined}
            className={`text-sm ${onList ? 'text-fg' : 'text-muted hover:text-fg'}`}
          >
            Mission plans
          </a>
        </nav>

        <a href={hrefs.newPlan} className={buttonStyles.primary}>
          + New plan
        </a>
      </header>

      <main className="min-w-0">{children}</main>
    </div>
  )
}
