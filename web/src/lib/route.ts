import { useSyncExternalStore } from 'react'

// Two views, addressed by the URL hash so plans can be linked to:
//   #/plans          Mission plans (list); also the default
//   #/plans/new      Planner, new plan
//   #/plans/<id>     Planner, saved plan
export type Route = { view: 'plans' } | { view: 'planner'; planId: number | null }

export const hrefs = {
  plans: '#/plans',
  newPlan: '#/plans/new',
  plan: (id: number) => `#/plans/${id}`,
}

export function parseHash(hash: string): Route {
  if (hash === hrefs.newPlan) return { view: 'planner', planId: null }

  const match = /^#\/plans\/(\d+)$/.exec(hash)
  return match ? { view: 'planner', planId: Number(match[1]) } : { view: 'plans' }
}

const subscribe = (onChange: () => void) => {
  window.addEventListener('hashchange', onChange)
  return () => window.removeEventListener('hashchange', onChange)
}

/** The current route, updated whenever the hash changes. */
export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash)
  return parseHash(hash)
}
