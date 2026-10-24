import { z } from 'zod'
import {
  apiErrorsSchema,
  missionPlanSchema,
  missionPlanSummarySchema,
  missionResultSchema,
  planetSchema,
  spacecraftSchema,
  type FieldError,
  type MissionCalculationInput,
  type MissionPlanInput,
} from './schemas'

/**
 * A failed API request. `errors` holds the API's field errors
 * ({ field, message }) when it sent any, so forms can show them in place.
 */
export class ApiError extends Error {
  readonly status: number
  readonly errors: FieldError[]

  constructor(status: number, errors: FieldError[]) {
    super(errors.map((e) => e.message).join(' ') || `Request failed (${status})`)
    this.name = 'ApiError'
    this.status = status
    this.errors = errors
  }
}

async function request<T>(path: string, schema: z.ZodType<T> | null, init?: RequestInit): Promise<T> {
  // Absolute so it also works outside a browser (tests run on Node's fetch).
  const response = await fetch(new URL(path, window.location.origin), {
    ...init,
    headers: { Accept: 'application/json', ...(init?.body ? { 'Content-Type': 'application/json' } : {}) },
  })

  if (!response.ok) {
    const body = apiErrorsSchema.safeParse(await response.json().catch(() => null))
    throw new ApiError(response.status, body.success ? body.data.errors : [])
  }
  if (schema === null) return undefined as T

  return schema.parse(await response.json())
}

const send = (method: string, body?: unknown): RequestInit => ({
  method,
  body: body === undefined ? undefined : JSON.stringify(body),
})

export const api = {
  planets: () => request('/api/planets', z.array(planetSchema)),
  spacecraft: () => request('/api/spacecraft', z.array(spacecraftSchema)),
  calculateMission: (input: MissionCalculationInput) =>
    request('/api/mission_calculations', missionResultSchema, send('POST', input)),
  missionPlans: () => request('/api/mission_plans', z.array(missionPlanSummarySchema)),
  missionPlan: (id: number) => request(`/api/mission_plans/${id}`, missionPlanSchema),
  createMissionPlan: (input: MissionPlanInput) => request('/api/mission_plans', missionPlanSchema, send('POST', input)),
  updateMissionPlan: (id: number, input: Partial<MissionPlanInput>) =>
    request(`/api/mission_plans/${id}`, missionPlanSchema, send('PATCH', input)),
  deleteMissionPlan: (id: number) => request(`/api/mission_plans/${id}`, null, send('DELETE')),
  duplicateMissionPlan: (id: number) => request(`/api/mission_plans/${id}/duplicate`, missionPlanSchema, send('POST')),
}
