import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import type { MissionCalculationInput } from '../api/schemas'
import { fakeCalculation } from '../test/fakeCalculation'
import { renderWithQuery } from '../test/render'
import { server } from '../test/server'
import { PlannerView } from '../views/PlannerView'

async function openNewPlan() {
  const user = userEvent.setup()
  renderWithQuery(<PlannerView planId={null} />)
  await screen.findByRole('heading', { name: 'Untitled mission' })
  return user
}

const route = () => within(screen.getByRole('list', { name: 'Route' }))
const palette = () => within(screen.getByRole('group', { name: 'Add a destination' }))
const addStop = (user: ReturnType<typeof userEvent.setup>, name: string) =>
  user.click(palette().getByRole('button', { name: new RegExp(`^Add ${name}`) }))
const chooseSpacecraft = (user: ReturnType<typeof userEvent.setup>, name: string) =>
  user.click(screen.getByRole('radio', { name: new RegExp(name) }))

describe('Spacecraft picker', () => {
  it('shows every spacecraft with its specs, the first one chosen', async () => {
    await openNewPlan()

    const radios = screen.getAllByRole('radio')
    expect(radios).toHaveLength(6)
    expect(radios[0]).toBeChecked()

    const serenity = screen.getByRole('radio', { name: /Serenity XL/ }).closest('label')!
    expect(within(serenity).getByText('Extra Large')).toBeInTheDocument()
    expect(within(serenity).getByText('30')).toBeInTheDocument()
    expect(within(serenity).getByText('500,000 km/h')).toBeInTheDocument()
    expect(within(serenity).getByText('15 billion km')).toBeInTheDocument()
    expect(serenity).toHaveTextContent('Gravity generator · operates -420 to 500 °C')
  })

  it('shows the chosen spacecraft in the hangar', async () => {
    const user = await openNewPlan()
    const hangar = () => screen.getByText('Selected spacecraft').parentElement!

    expect(within(hangar()).getByRole('heading', { name: 'Millennial Hopper' })).toBeInTheDocument()
    await chooseSpacecraft(user, 'Galactica Scout')
    expect(within(hangar()).getByRole('heading', { name: 'Galactica Scout' })).toBeInTheDocument()
  })

  it('shows which spacecraft can fly the route', async () => {
    const user = await openNewPlan()
    await addStop(user, 'Jupiter')

    const hopper = (await screen.findByRole('radio', { name: /Millennial Hopper/ })).closest('label')!
    expect(await within(hopper).findByText('Out of range')).toBeInTheDocument()
    const serenity = screen.getByRole('radio', { name: /Serenity XL/ }).closest('label')!
    expect(within(serenity).getByText('Fits route')).toBeInTheDocument()
  })
})

describe('Passengers', () => {
  it("keeps the count between 0 and the spacecraft's capacity", async () => {
    const user = await openNewPlan()
    const input = screen.getByRole('spinbutton', { name: 'Number of passengers' })

    await user.clear(input)
    await user.type(input, '99')
    expect(input).toHaveValue(5) // Millennial Hopper seats 5
    expect(screen.getByRole('button', { name: 'More passengers' })).toBeDisabled()
    expect(screen.getByText(/Up to 5 on Millennial Hopper/)).toBeInTheDocument()

    await user.clear(input)
    expect(screen.getByRole('button', { name: 'Fewer passengers' })).toBeDisabled()
  })

  it('moves with the slider and fills the seat map', async () => {
    const user = await openNewPlan()
    await chooseSpacecraft(user, 'Serenity XL')
    const slider = screen.getByRole('slider', { name: 'Passengers slider' })

    expect(slider).toHaveAttribute('max', '30')
    // jsdom doesn't move range inputs with the keyboard; set the value as a drag would.
    fireEvent.change(slider, { target: { value: '3' } })

    expect(screen.getByRole('spinbutton', { name: 'Number of passengers' })).toHaveValue(3)
    expect(screen.getByText('3', { selector: 'strong' }).parentElement).toHaveTextContent('3 of 30 seats')
  })

  it('shows how the load shortens the reach, and the route against it', async () => {
    const user = await openNewPlan()
    await chooseSpacecraft(user, 'Serenity XL')
    const input = screen.getByRole('spinbutton', { name: 'Number of passengers' })
    await user.clear(input)
    await user.type(input, '10')

    expect(screen.getByText('1.420')).toBeInTheDocument()
    expect(screen.getByText('R = 1 + 0.042 × 10')).toBeInTheDocument()
    expect(screen.getByText('30% less than empty')).toBeInTheDocument()

    await addStop(user, 'Mars')
    expect(await screen.findByRole('meter', { name: "Route distance as a share of the ship's reach" })).toBeInTheDocument()
  })

  it('lowers the count to fit a smaller spacecraft, and says so', async () => {
    const user = await openNewPlan()
    await chooseSpacecraft(user, 'Serenity XL')
    const input = screen.getByRole('spinbutton', { name: 'Number of passengers' })
    await user.clear(input)
    await user.type(input, '12')

    await chooseSpacecraft(user, 'Galactica Scout')

    expect(input).toHaveValue(3)
    expect(screen.getByText(/Reduced from 12 to 3: Galactica Scout seats 3/)).toBeInTheDocument()
  })
})

describe('Route builder', () => {
  it('starts at Earth and never offers the Sun', async () => {
    await openNewPlan()

    expect(route().getByText('Earth')).toBeInTheDocument()
    expect(palette().queryByRole('button', { name: /Sun/ })).not.toBeInTheDocument()
    expect(palette().getAllByRole('button')).toHaveLength(8)
  })

  it('adds, reorders, and removes stops', async () => {
    const user = await openNewPlan()
    await addStop(user, 'Mars')
    await addStop(user, 'Jupiter')
    await addStop(user, 'Saturn')

    await user.click(route().getByRole('button', { name: 'Move Saturn earlier' }))
    expect(route().getAllByRole('button', { name: /^(Mars|Jupiter|Saturn)$/ }).map((b) => b.textContent)).toEqual([
      'Mars',
      'Saturn',
      'Jupiter',
    ])

    await user.click(route().getByRole('button', { name: 'Remove Mars' }))
    expect(route().queryByRole('button', { name: 'Mars' })).not.toBeInTheDocument()
  })

  it('blocks the same planet twice in a row', async () => {
    const user = await openNewPlan()

    expect(palette().getByRole('button', { name: /^Add Earth/ })).toBeDisabled()
    await addStop(user, 'Mars')
    expect(palette().getByRole('button', { name: /^Add Mars/ })).toBeDisabled()

    // Earth → Mars → Earth: moving that Earth earlier would put Earth after Earth.
    await addStop(user, 'Earth')
    expect(route().getByRole('button', { name: 'Move Earth earlier' })).toBeDisabled()
    expect(route().getByRole('button', { name: 'Remove Mars' })).toBeDisabled()
  })

  it("flags a stop the spacecraft can't land on, with the reason", async () => {
    const user = await openNewPlan()
    await chooseSpacecraft(user, 'Nostromo II')

    expect(palette().getByRole('button', { name: "Add Venus (Venus 464 °C exceeds Nostromo II's max 100 °C)" })).toBeInTheDocument()
    await addStop(user, 'Venus')

    expect(route().getByText(/Can't land: Venus 464 °C exceeds Nostromo II's max 100 °C/)).toBeInTheDocument()
  })

  it('shows a planet card on hover', async () => {
    const user = await openNewPlan()

    await user.hover(palette().getByRole('button', { name: /^Add Jupiter/ }))

    const card = within(screen.getByRole('region', { name: 'Jupiter details' }))
    expect(card.getByText('-110 °C')).toBeInTheDocument()
    expect(card.getByText('24.79 m/s² (2.5× Earth)')).toBeInTheDocument()
    expect(card.getByText('2,000 mSv')).toBeInTheDocument()
    expect(card.getByText('No')).toBeInTheDocument()
    expect(card.getByText('Intense storms, Great Red Spot')).toBeInTheDocument()
    expect(card.getByText('Europa, Ganymede, Io, Callisto')).toBeInTheDocument()
  })
})

describe('Live calculation', () => {
  it('calculates once the agent pauses, sending the whole route from Earth', async () => {
    const requests: MissionCalculationInput[] = []
    server.use(
      http.post('*/api/mission_calculations', async ({ request }) => {
        const body = (await request.json()) as MissionCalculationInput
        requests.push(body)
        return HttpResponse.json(fakeCalculation(body))
      }),
    )
    const user = await openNewPlan()

    await addStop(user, 'Mars')
    await addStop(user, 'Jupiter')

    expect(await screen.findByRole('table')).toBeInTheDocument()
    await waitFor(() => expect(requests).toHaveLength(1))
    expect(requests[0]).toEqual({ spacecraft_id: 1, passenger_count: 1, planet_ids: [4, 5, 6] })
  })

  it('shows the totals, a leg table, and advisories apart from blockers', async () => {
    const user = await openNewPlan()
    await chooseSpacecraft(user, 'Serenity XL')
    await addStop(user, 'Mars')
    await addStop(user, 'Jupiter')

    const table = await screen.findByRole('table')
    const rows = within(table).getAllByRole('row')
    expect(rows[1]).toHaveTextContent('Earth→Mars')
    expect(rows[2]).toHaveTextContent('Mars→Jupiter')
    expect(rows[3]).toHaveTextContent('Total · 1 passenger')

    const advisories = within(screen.getByRole('region', { name: 'Advisories' }))
    expect(advisories.getByText("Jupiter surface gravity is 24.79 m/s² (2.5× Earth's).")).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Blocking problems' })).not.toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Feasibility' })).getByText('Feasible')).toBeInTheDocument()
  })

  it('says what to do when the range is exceeded', async () => {
    const user = await openNewPlan()
    await chooseSpacecraft(user, 'Nyx Odyssey')
    const input = screen.getByRole('spinbutton', { name: 'Number of passengers' })
    await user.clear(input)
    await user.type(input, '21')
    await addStop(user, 'Neptune')

    const blockers = await screen.findByRole('list', { name: 'Blocking problems' })
    expect(blockers).toHaveTextContent('Exceeds range by 2%. Reduce to 20 passengers or choose Serenity XL.')
    expect(screen.getByRole('meter', { name: 'Range used' })).toHaveAttribute('aria-valuenow', '100')
  })

  it("suggests another spacecraft when this one can't land", async () => {
    const user = await openNewPlan()
    await chooseSpacecraft(user, 'Nostromo II')
    await addStop(user, 'Venus')

    const blockers = await screen.findByRole('list', { name: 'Blocking problems' })
    // Galactica Scout (max 555 °C, 3 seats) fits one passenger with the least range to spare.
    expect(blockers).toHaveTextContent('Choose Galactica Scout.')
    expect(within(screen.getByRole('region', { name: 'Feasibility' })).getByText(/Can't land on Venus/)).toBeInTheDocument()
  })
})

describe('Route diagram', () => {
  async function planEarthMarsJupiter() {
    const user = await openNewPlan()
    await chooseSpacecraft(user, 'Serenity XL')
    await addStop(user, 'Mars')
    await addStop(user, 'Jupiter')
    await screen.findByRole('table')
    return user
  }

  const diagramLeg = (n: number) => document.querySelector<SVGGElement>(`g[data-leg="${n}"]`)!
  const tableRow = (n: number) => within(screen.getByRole('table')).getAllByRole('row')[n]

  it('shows every planet before there is a route', async () => {
    await openNewPlan()

    const diagram = screen.getByRole('img', { name: 'Side view of the planets, not to scale' })
    expect(within(diagram).getByText('Sun')).toBeInTheDocument()
    expect(within(diagram).getByText('Neptune')).toBeInTheDocument()
    expect(diagram.querySelectorAll('g[data-leg]')).toHaveLength(0)
  })

  it('draws each leg, numbered, and says it is not to scale', async () => {
    await planEarthMarsJupiter()

    const diagram = screen.getByRole('img', { name: /Side view of the route, not to scale/ })
    expect(diagram).toHaveAccessibleName(
      'Side view of the route, not to scale: leg 1, Earth to Mars; leg 2, Mars to Jupiter',
    )
    expect(screen.getByText('Not to scale')).toBeVisible()
    expect(diagram.querySelectorAll('g[data-leg]')).toHaveLength(2)
    expect(within(diagram).getByText('Neptune')).toBeInTheDocument() // every body is drawn
  })

  it('keeps leg numbers apart when a return leg retraces the outbound one', async () => {
    const user = await openNewPlan()
    await chooseSpacecraft(user, 'Serenity XL')
    await addStop(user, 'Mercury')
    await addStop(user, 'Earth')
    await screen.findByRole('table')

    const labelY = (n: number) => Number(diagramLeg(n).querySelector('circle')!.getAttribute('cy'))
    expect(Math.abs(labelY(1) - labelY(2))).toBeGreaterThanOrEqual(18)
  })

  it('highlights the matching table row when a leg is hovered', async () => {
    const user = await planEarthMarsJupiter()

    await user.hover(diagramLeg(2))

    expect(tableRow(2)).toHaveAttribute('data-highlighted', 'true')
    expect(tableRow(1)).toHaveAttribute('data-highlighted', 'false')
    expect(diagramLeg(2)).toHaveAttribute('data-highlighted', 'true')

    await user.unhover(diagramLeg(2))
    expect(tableRow(2)).toHaveAttribute('data-highlighted', 'false')
  })

  it('highlights the matching leg when a table row is hovered', async () => {
    const user = await planEarthMarsJupiter()

    await user.hover(tableRow(1))

    expect(diagramLeg(1)).toHaveAttribute('data-highlighted', 'true')
    expect(diagramLeg(2)).toHaveAttribute('data-highlighted', 'false')
  })
})

describe('A saved plan', () => {
  it('opens with its values filled in and calculates', async () => {
    renderWithQuery(<PlannerView planId={1} />)

    expect(await screen.findByRole('heading', { name: 'Red planet getaway' })).toBeInTheDocument()
    expect(screen.getByDisplayValue('Okafor family')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Serenity XL/ })).toBeChecked()
    expect(screen.getByRole('spinbutton', { name: 'Number of passengers' })).toHaveValue(4)
    expect(route().getByRole('button', { name: 'Mars' })).toBeInTheDocument()
    expect(await screen.findByRole('table')).toHaveTextContent('Earth→Mars')
  })
})
