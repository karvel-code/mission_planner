import { describe, expect, it } from 'vitest'
import { hrefs, parseHash } from './route'

describe('parseHash', () => {
  it('shows the mission plans by default', () => {
    expect(parseHash('')).toEqual({ view: 'plans' })
    expect(parseHash(hrefs.plans)).toEqual({ view: 'plans' })
    expect(parseHash('#/something-else')).toEqual({ view: 'plans' })
  })

  it('opens the planner for a new plan', () => {
    expect(parseHash(hrefs.newPlan)).toEqual({ view: 'planner', planId: null })
  })

  it('opens the planner for a saved plan', () => {
    expect(parseHash(hrefs.plan(42))).toEqual({ view: 'planner', planId: 42 })
  })
})
