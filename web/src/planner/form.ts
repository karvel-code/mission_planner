import { z } from 'zod'
import type { MissionPlan, MissionPlanInput, Spacecraft } from '../api/schemas'

/** The planner's form. `stops` are the planet ids after Earth, in visiting order. */
export const plannerFormSchema = z.object({
  name: z.string().trim().min(1, 'Give the mission a name'),
  customer_name: z.string(),
  notes: z.string(),
  spacecraft_id: z.number(),
  passenger_count: z.number().int().min(0),
  stops: z.array(z.number()).min(1, 'Add at least one destination'),
})

export type PlannerFormValues = z.infer<typeof plannerFormSchema>

/** A saved plan's values, or a blank plan on the first spacecraft. */
export function initialValues(plan: MissionPlan | null, fleet: Spacecraft[]): PlannerFormValues {
  if (!plan) {
    return { name: '', customer_name: '', notes: '', spacecraft_id: fleet[0].id, passenger_count: 1, stops: [] }
  }

  return {
    name: plan.name,
    customer_name: plan.customer_name ?? '',
    notes: plan.notes ?? '',
    spacecraft_id: plan.spacecraft_id,
    passenger_count: plan.passenger_count,
    // Saved routes always start at Earth (the API validates it).
    stops: plan.planet_ids.slice(1),
  }
}

/** The body to save: blank text fields become null, and the route starts at Earth. */
export const toPlanInput = (values: PlannerFormValues, earthId: number): MissionPlanInput => ({
  name: values.name.trim(),
  customer_name: values.customer_name.trim() || null,
  notes: values.notes.trim() || null,
  spacecraft_id: values.spacecraft_id,
  passenger_count: values.passenger_count,
  planet_ids: [earthId, ...values.stops],
})
