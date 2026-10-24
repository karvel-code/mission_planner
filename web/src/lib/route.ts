import { useEffect, useSyncExternalStore } from 'react'

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

// The hash the app is showing. It only follows the URL once the leave guard
// (if any) agrees, so a cancelled navigation never reaches the views.
let shownHash = ''
let leaveGuard: (() => boolean) | null = null
let unguardedHash: string | null = null
const listeners = new Set<() => void>()

function onHashChange() {
  const next = window.location.hash
  if (next === shownHash) return

  const allowed = next === unguardedHash || !leaveGuard || leaveGuard()
  unguardedHash = null
  if (!allowed) {
    // Put the URL back without another hashchange.
    history.replaceState(null, '', shownHash || window.location.pathname + window.location.search)
    return
  }

  shownHash = next
  listeners.forEach((listener) => listener())
}

const subscribe = (onChange: () => void) => {
  if (listeners.size === 0) {
    shownHash = window.location.hash
    window.addEventListener('hashchange', onHashChange)
  }
  listeners.add(onChange)

  return () => {
    listeners.delete(onChange)
    if (listeners.size === 0) window.removeEventListener('hashchange', onHashChange)
  }
}

/** The current route, updated whenever the hash changes (and the leave guard allows it). */
export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, () => (listeners.size ? shownHash : window.location.hash))
  return parseHash(hash)
}

/**
 * While `active`, leaving the current view (a link, the back button, closing
 * or reloading the tab) asks for confirmation with `message` first.
 */
export function useLeaveGuard(active: boolean, message: string) {
  useEffect(() => {
    if (!active) return

    leaveGuard = () => window.confirm(message)
    const warnOnUnload = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', warnOnUnload)

    return () => {
      leaveGuard = null
      window.removeEventListener('beforeunload', warnOnUnload)
    }
  }, [active, message])
}

/** Goes to `href` without the leave guard, e.g. after saving or deleting. */
export function navigate(href: string) {
  unguardedHash = href
  window.location.hash = href
}
