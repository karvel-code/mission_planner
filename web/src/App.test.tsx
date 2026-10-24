import { act, screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import App from './App'
import { hopperToJupiter, redPlanetGetaway } from './test/fixtures'
import { renderWithQuery } from './test/render'
import { server } from './test/server'

describe('Mission plans view', () => {
  it('lists saved plans from the API', async () => {
    server.use(http.get('*/api/mission_plans', () => HttpResponse.json([redPlanetGetaway, hopperToJupiter])))

    renderWithQuery(<App />)

    const rows = await screen.findAllByRole('row')
    const first = within(rows[1])
    expect(first.getByRole('link', { name: 'Red planet getaway' })).toHaveAttribute('href', '#/plans/1')
    expect(first.getByText('Okafor family')).toBeInTheDocument()
    expect(first.getByText('Serenity XL')).toBeInTheDocument()
    expect(first.getByText('4 passengers')).toBeInTheDocument()
    expect(first.getByRole('img', { name: 'Route: Earth, Mars' })).toBeInTheDocument()
    expect(first.getByText('78.3 million km')).toBeInTheDocument()
    expect(first.getByText('Feasible')).toBeInTheDocument()

    const second = within(rows[2])
    expect(second.getByText('No customer')).toBeInTheDocument()
    expect(second.getByText('Not feasible')).toBeInTheDocument()
    expect(screen.getByText('Saved plans · 2')).toBeInTheDocument()
  })

  it('invites the agent to create a plan when there are none', async () => {
    server.use(http.get('*/api/mission_plans', () => HttpResponse.json([])))

    renderWithQuery(<App />)

    expect(await screen.findByText('No saved mission plans yet.')).toBeInTheDocument()
  })

  it('explains when the API cannot be reached', async () => {
    server.use(http.get('*/api/mission_plans', () => HttpResponse.error()))

    renderWithQuery(<App />)

    expect(await screen.findByRole('heading', { name: 'Mission plans unavailable' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })
})

describe('Planner view', () => {
  it('opens a saved plan from its link', async () => {
    renderWithQuery(<App />)
    await screen.findByRole('link', { name: 'Red planet getaway' })

    act(() => {
      window.location.hash = '#/plans/1'
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    })

    expect(await screen.findByRole('heading', { name: 'Red planet getaway', level: 1 })).toBeInTheDocument()
    expect(screen.getByText('Okafor family')).toBeInTheDocument()
    expect(await screen.findByText('Serenity XL')).toBeInTheDocument()
    expect(screen.getByText('78.3 million km')).toBeInTheDocument()
  })

  it('starts a new plan', async () => {
    window.location.hash = '#/plans/new'

    renderWithQuery(<App />)

    expect(screen.getByRole('heading', { name: 'Untitled mission', level: 1 })).toBeInTheDocument()
    expect(screen.getByText('New mission plan')).toBeInTheDocument()
  })

  it('reports a plan that does not exist', async () => {
    window.location.hash = '#/plans/999'

    renderWithQuery(<App />)

    expect(await screen.findByRole('heading', { name: 'Mission plan not found' })).toBeInTheDocument()
  })
})
