import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import type { MissionCalculationInput } from '../api/schemas'
import { fleet, planets } from './catalog'
import { fakeCalculation } from './fakeCalculation'
import { redPlanetGetaway, redPlanetGetawayDetail } from './fixtures'

// A mock of the Rails API for tests. Override a handler in a test with
// server.use(http.get(...)).
export const server = setupServer(
  http.get('*/api/planets', () => HttpResponse.json(planets)),
  http.get('*/api/spacecraft', () => HttpResponse.json(fleet)),
  http.post('*/api/mission_calculations', async ({ request }) =>
    HttpResponse.json(fakeCalculation((await request.json()) as MissionCalculationInput)),
  ),
  http.get('*/api/mission_plans', () => HttpResponse.json([redPlanetGetaway])),
  http.get('*/api/mission_plans/1', () => HttpResponse.json(redPlanetGetawayDetail)),
  http.get('*/api/mission_plans/:id', () =>
    HttpResponse.json({ errors: [{ field: null, message: 'Mission plan not found' }] }, { status: 404 }),
  ),
)
