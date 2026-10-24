import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { earth, redPlanetGetaway, redPlanetGetawayDetail, serenity } from './fixtures'

// A mock of the Rails API for tests. Override a handler in a test with
// server.use(http.get(...)).
export const server = setupServer(
  http.get('*/api/planets', () => HttpResponse.json([earth])),
  http.get('*/api/spacecraft', () => HttpResponse.json([serenity])),
  http.get('*/api/mission_plans', () => HttpResponse.json([redPlanetGetaway])),
  http.get('*/api/mission_plans/1', () => HttpResponse.json(redPlanetGetawayDetail)),
  http.get('*/api/mission_plans/:id', () =>
    HttpResponse.json({ errors: [{ field: null, message: 'Mission plan not found' }] }, { status: 404 }),
  ),
)
