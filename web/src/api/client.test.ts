import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { ZodError } from 'zod'
import { redPlanetGetaway } from '../test/fixtures'
import { server } from '../test/server'
import { api, ApiError } from './client'

describe('api client', () => {
  it('parses a response with its schema', async () => {
    await expect(api.missionPlans()).resolves.toEqual([redPlanetGetaway])
  })

  it("throws an ApiError carrying the API's field errors", async () => {
    server.use(
      http.post('*/api/mission_plans', () =>
        HttpResponse.json(
          {
            errors: [
              { field: 'name', message: "Name can't be blank" },
              { field: 'route', message: 'Route must start at Earth' },
            ],
          },
          { status: 422 },
        ),
      ),
    )

    const error = await api
      .createMissionPlan({ name: '', spacecraft_id: 5, passenger_count: 0, planet_ids: [] })
      .catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 422, errors: [{ field: 'name' }, { field: 'route' }] })
    expect((error as ApiError).message).toBe("Name can't be blank Route must start at Earth")
  })

  it('throws an ApiError with a generic message when the body has no errors', async () => {
    server.use(http.get('*/api/planets', () => new HttpResponse('Bad gateway', { status: 502 })))

    await expect(api.planets()).rejects.toThrow('Request failed (502)')
  })

  it("rejects a response that doesn't match the schema", async () => {
    server.use(http.get('*/api/mission_plans', () => HttpResponse.json([{ id: 'not-a-number' }])))

    await expect(api.missionPlans()).rejects.toBeInstanceOf(ZodError)
  })

  it('sends JSON and returns nothing for a delete', async () => {
    let method = ''
    server.use(
      http.delete('*/api/mission_plans/1', ({ request }) => {
        method = request.method
        return new HttpResponse(null, { status: 204 })
      }),
    )

    await expect(api.deleteMissionPlan(1)).resolves.toBeUndefined()
    expect(method).toBe('DELETE')
  })
})
