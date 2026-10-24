import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'
import type { MissionCalculationInput, MissionPlan, MissionPlanInput } from './schemas'

export const queryKeys = {
  planets: ['planets'] as const,
  spacecraft: ['spacecraft'] as const,
  missionPlans: ['mission-plans'] as const,
  missionPlan: (id: number) => ['mission-plans', id] as const,
  calculation: (input: MissionCalculationInput) => ['mission-calculation', input] as const,
}

// The catalog only changes when the YAML is re-seeded, so it is fetched once.
export const usePlanets = () => useQuery({ queryKey: queryKeys.planets, queryFn: api.planets, staleTime: Infinity })

export const useSpacecraft = () =>
  useQuery({ queryKey: queryKeys.spacecraft, queryFn: api.spacecraft, staleTime: Infinity })

export const useMissionPlans = () => useQuery({ queryKey: queryKeys.missionPlans, queryFn: api.missionPlans })

export const useMissionPlan = (id: number | null) =>
  useQuery({
    queryKey: queryKeys.missionPlan(id ?? 0),
    queryFn: () => api.missionPlan(id!),
    enabled: id !== null,
  })

/**
 * A live calculation for the planner. Pass null to skip (e.g. no spacecraft
 * yet). The previous result stays on screen while the next one loads.
 */
export const useMissionCalculation = (input: MissionCalculationInput | null) =>
  useQuery({
    queryKey: queryKeys.calculation(input ?? { spacecraft_id: 0, passenger_count: 0, planet_ids: [] }),
    queryFn: () => api.calculateMission(input!),
    enabled: input !== null,
    placeholderData: keepPreviousData,
  })

/** After a save, refresh the list and store the returned plan as the detail. */
function useStorePlan() {
  const queryClient = useQueryClient()

  return (plan: MissionPlan) => {
    queryClient.setQueryData(queryKeys.missionPlan(plan.id), plan)
    return queryClient.invalidateQueries({ queryKey: queryKeys.missionPlans, exact: true })
  }
}

export function useCreateMissionPlan() {
  const storePlan = useStorePlan()
  return useMutation({ mutationFn: (input: MissionPlanInput) => api.createMissionPlan(input), onSuccess: storePlan })
}

export function useUpdateMissionPlan(id: number) {
  const storePlan = useStorePlan()
  return useMutation({
    mutationFn: (input: Partial<MissionPlanInput>) => api.updateMissionPlan(id, input),
    onSuccess: storePlan,
  })
}

export function useDuplicateMissionPlan() {
  const storePlan = useStorePlan()
  return useMutation({ mutationFn: (id: number) => api.duplicateMissionPlan(id), onSuccess: storePlan })
}

export function useDeleteMissionPlan() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => api.deleteMissionPlan(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: queryKeys.missionPlan(id) })
      return queryClient.invalidateQueries({ queryKey: queryKeys.missionPlans, exact: true })
    },
  })
}
