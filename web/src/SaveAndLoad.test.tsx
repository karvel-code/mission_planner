import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { MissionPlan, MissionPlanInput } from './api/schemas'
import App from './App'
import { hopperToJupiter, redPlanetGetaway, redPlanetGetawayDetail } from './test/fixtures'
import { renderWithQuery } from './test/render'
import { server } from './test/server'

afterEach(() => vi.restoreAllMocks())

/** Records requests to an endpoint and answers them with `respond`. */
function record<T>(method: 'post' | 'patch' | 'delete', path: string, respond: (body: T) => Response) {
  const bodies: T[] = []
  server.use(
    http[method](`*${path}`, async ({ request }) => {
      const body = (method === 'delete' ? null : await request.json().catch(() => null)) as T
      bodies.push(body)
      return respond(body)
    }),
  )
  return bodies
}

const savedPlan = (overrides: Partial<MissionPlan>): MissionPlan => ({ ...redPlanetGetawayDetail, ...overrides })
const serveDetail = (plan: MissionPlan) => server.use(http.get(`*/api/mission_plans/${plan.id}`, () => HttpResponse.json(plan)))

async function openPlanner(hash: string) {
  window.location.hash = hash
  const user = userEvent.setup()
  renderWithQuery(<App />)
  await screen.findByRole('heading', { level: 1, name: hash === '#/plans/new' ? 'Untitled mission' : /./ })
  return user
}

const addStop = (user: ReturnType<typeof userEvent.setup>, name: string) =>
  user.click(within(screen.getByRole('group', { name: 'Add a destination' })).getByRole('button', { name: new RegExp(`^Add ${name}`) }))

describe('Saving a new plan', () => {
  it('saves the booking, spacecraft, passengers, and route, then opens the saved plan', async () => {
    const created = savedPlan({ id: 7, name: 'Outer giants tour' })
    const requests = record<MissionPlanInput>('post', '/api/mission_plans', () => HttpResponse.json(created, { status: 201 }))
    serveDetail(created)
    const user = await openPlanner('#/plans/new')

    await user.type(screen.getByRole('textbox', { name: 'Mission name' }), '  Outer giants tour ')
    await addStop(user, 'Mars')
    await user.click(screen.getByRole('button', { name: 'Save plan' }))

    await waitFor(() => expect(window.location.hash).toBe('#/plans/7'))
    expect(requests).toEqual([
      { name: 'Outer giants tour', customer_name: null, notes: null, spacecraft_id: 1, passenger_count: 1, planet_ids: [4, 5] },
    ])
    expect(await screen.findByRole('heading', { level: 1, name: 'Outer giants tour' })).toBeInTheDocument()
    expect(screen.getByText('Mission plan')).toBeInTheDocument()
  })

  it('asks for a name and a destination before saving', async () => {
    const requests = record('post', '/api/mission_plans', () => HttpResponse.json({}))
    const user = await openPlanner('#/plans/new')

    await user.click(screen.getByRole('button', { name: 'Save plan' }))

    expect(await screen.findByText('Give the mission a name')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Add at least one destination')
    const name = screen.getByRole('textbox', { name: 'Mission name' })
    expect(name).toHaveAttribute('aria-invalid', 'true')
    expect(name).toHaveAccessibleDescription('Give the mission a name')
    expect(requests).toHaveLength(0)
  })

  it("shows the API's errors next to the field they belong to", async () => {
    record('post', '/api/mission_plans', () =>
      HttpResponse.json({ errors: [{ field: 'route', message: 'Route must start at Earth' }] }, { status: 422 }),
    )
    const user = await openPlanner('#/plans/new')
    await user.type(screen.getByRole('textbox', { name: 'Mission name' }), 'Test')
    await addStop(user, 'Mars')

    await user.click(screen.getByRole('button', { name: 'Save plan' }))

    const alerts = await screen.findAllByRole('alert')
    expect(alerts.map((a) => a.textContent)).toEqual(
      expect.arrayContaining(['Route must start at Earth', "Couldn't save: Route must start at Earth"]),
    )
    expect(window.location.hash).toBe('#/plans/new')
  })
})

describe('Editing a saved plan', () => {
  it('saves only once something changed, then shows it as saved', async () => {
    const requests = record<MissionPlanInput>('patch', '/api/mission_plans/1', (body) =>
      HttpResponse.json(savedPlan({ customer_name: body.customer_name ?? null })),
    )
    const user = await openPlanner('#/plans/1')
    const save = screen.getByRole('button', { name: 'Save changes' })
    expect(save).toBeDisabled()

    const customer = screen.getByRole('textbox', { name: 'Customer' })
    await user.clear(customer)
    await user.type(customer, 'Mwangi family')
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument()
    await user.click(save)

    expect(await screen.findByText('Saved')).toBeInTheDocument()
    expect(requests[0]).toMatchObject({ name: 'Red planet getaway', customer_name: 'Mwangi family', planet_ids: [4, 5] })
    expect(save).toBeDisabled()
  })

  it('counts a new spacecraft as a change', async () => {
    const user = await openPlanner('#/plans/1')

    await user.click(screen.getByRole('radio', { name: /Galactica Scout/ }))

    expect(screen.getByRole('button', { name: 'Save changes' })).toBeEnabled()
  })

  it('duplicates the plan and opens the copy', async () => {
    const copy = savedPlan({ id: 8, name: 'Red planet getaway (copy)' })
    const requests = record('post', '/api/mission_plans/1/duplicate', () => HttpResponse.json(copy, { status: 201 }))
    serveDetail(copy)
    const user = await openPlanner('#/plans/1')

    await user.click(screen.getByRole('button', { name: 'Duplicate' }))

    await waitFor(() => expect(window.location.hash).toBe('#/plans/8'))
    expect(requests).toHaveLength(1)
    expect(await screen.findByRole('heading', { level: 1, name: 'Red planet getaway (copy)' })).toBeInTheDocument()
  })

  it('only duplicates once the changes are saved', async () => {
    const user = await openPlanner('#/plans/1')
    await user.type(screen.getByRole('textbox', { name: 'Notes' }), ' and snacks')

    expect(screen.getByRole('button', { name: 'Duplicate' })).toBeDisabled()
  })

  it('deletes the plan after confirmation and returns to the list', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true)
    const requests = record('delete', '/api/mission_plans/1', () => new HttpResponse(null, { status: 204 }))
    server.use(http.get('*/api/mission_plans', () => HttpResponse.json([hopperToJupiter])))
    const user = await openPlanner('#/plans/1')

    await user.click(screen.getByRole('button', { name: 'Delete' }))
    expect(confirm).toHaveBeenLastCalledWith('Delete "Red planet getaway"? This cannot be undone.')
    expect(requests).toHaveLength(0)

    await user.click(screen.getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(window.location.hash).toBe('#/plans'))
    expect(requests).toHaveLength(1)
    expect(await screen.findByRole('heading', { name: 'Mission plans' })).toBeInTheDocument()
  })
})

describe('Leaving with unsaved changes', () => {
  const leaveForList = () =>
    act(() => {
      window.location.hash = '#/plans'
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    })

  it('asks first, and stays on the plan if the agent cancels', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const user = await openPlanner('#/plans/new')
    await user.type(screen.getByRole('textbox', { name: 'Mission name' }), 'Half done')

    leaveForList()

    expect(confirm).toHaveBeenCalledWith('Leave this plan? Your unsaved changes will be lost.')
    expect(window.location.hash).toBe('#/plans/new')
    expect(screen.getByRole('heading', { level: 1, name: 'Half done' })).toBeInTheDocument()
  })

  it('leaves if the agent confirms', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const user = await openPlanner('#/plans/new')
    await user.type(screen.getByRole('textbox', { name: 'Mission name' }), 'Half done')

    leaveForList()

    expect(await screen.findByRole('heading', { name: 'Mission plans' })).toBeInTheDocument()
  })

  it("doesn't ask when nothing changed", async () => {
    const confirm = vi.spyOn(window, 'confirm')
    await openPlanner('#/plans/1')

    leaveForList()

    expect(confirm).not.toHaveBeenCalled()
    expect(await screen.findByRole('heading', { name: 'Mission plans' })).toBeInTheDocument()
  })

  it('warns before closing or reloading the tab', async () => {
    const user = await openPlanner('#/plans/new')
    const unloadUnchanged = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(unloadUnchanged)
    expect(unloadUnchanged.defaultPrevented).toBe(false)

    await user.type(screen.getByRole('textbox', { name: 'Mission name' }), 'Half done')
    const unloadChanged = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(unloadChanged)

    expect(unloadChanged.defaultPrevented).toBe(true)
  })
})

describe('Mission plans list', () => {
  async function openList() {
    server.use(http.get('*/api/mission_plans', () => HttpResponse.json([redPlanetGetaway, hopperToJupiter])))
    const user = userEvent.setup()
    renderWithQuery(<App />)
    await screen.findByRole('link', { name: 'Red planet getaway' })
    return user
  }

  const planNames = () => within(screen.getByRole('table')).getAllByRole('link').map((link) => link.textContent)

  it('searches by mission name or customer, ignoring case', async () => {
    const user = await openList()
    const search = screen.getByRole('searchbox', { name: 'Search mission plans by name or customer' })

    await user.type(search, 'JUPITER')
    expect(planNames()).toEqual(['Jupiter on a budget'])

    await user.clear(search)
    await user.type(search, 'okafor')
    expect(planNames()).toEqual(['Red planet getaway'])

    await user.clear(search)
    await user.type(search, 'Saturn')
    expect(screen.getByText('No plans match "Saturn".')).toBeInTheDocument()
  })

  it('duplicates a plan from its row', async () => {
    const requests = record('post', '/api/mission_plans/2/duplicate', () =>
      HttpResponse.json(savedPlan({ id: 9, name: 'Jupiter on a budget (copy)' }), { status: 201 }),
    )
    const user = await openList()

    await user.click(screen.getByRole('button', { name: 'Duplicate Jupiter on a budget' }))

    await waitFor(() => expect(requests).toHaveLength(1))
  })

  it('deletes a plan from its row after confirmation', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const requests = record('delete', '/api/mission_plans/1', () => new HttpResponse(null, { status: 204 }))
    const user = await openList()

    await user.click(screen.getByRole('button', { name: 'Delete Red planet getaway' }))

    expect(confirm).toHaveBeenCalledWith('Delete "Red planet getaway"? This cannot be undone.')
    await waitFor(() => expect(requests).toHaveLength(1))
  })
})
