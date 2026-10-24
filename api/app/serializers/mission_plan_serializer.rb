# JSON for saved mission plans. `summary` uses only the cached totals, for
# lists; `detail` adds the plan's own fields and a full mission calculation.
module MissionPlanSerializer
  CACHED = %i[total_distance_km range_used_km duration_hours feasible].freeze

  module_function

  def summary(plan)
    plan.slice(:id, :name, :customer_name, :passenger_count, *CACHED, :created_at, :updated_at).merge(
      spacecraft: plan.spacecraft.slice(:id, :name),
      stops: plan.route.map { |planet| { planet_id: planet.id, name: planet.name } }
    )
  end

  def detail(plan, mission, planet_ids_by_name:)
    plan.slice(:id, :name, :customer_name, :spacecraft_id, :passenger_count, :notes, *CACHED, :created_at, :updated_at).merge(
      planet_ids: plan.route.map(&:id),
      mission: MissionResultSerializer.call(mission, spacecraft: plan.spacecraft, planet_ids_by_name:)
    )
  end
end
