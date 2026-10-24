module Api
  # Saved mission plans. Request bodies are
  #
  #   { name:, customer_name:, spacecraft_id:, passenger_count:, notes:, planet_ids: [] }
  #
  # On update every field is optional; leaving out planet_ids keeps the route.
  class MissionPlansController < BaseController
    # GET /api/mission_plans: summaries from the cached totals, most recently updated first.
    def index
      plans = MissionPlan.includes(:spacecraft, mission_stops: :planet).order(updated_at: :desc)
      render json: plans.map { |plan| MissionPlanSerializer.summary(plan) }
    end

    # GET /api/mission_plans/:id: the plan with a fresh calculation, so it
    # reflects the current catalog.
    def show
      plan = find_plan
      mission = MissionPlans::Calculate.call(route: plan.route, spacecraft: plan.spacecraft, passengers: plan.passenger_count)
      render json: MissionPlanSerializer.detail(plan, mission, planet_ids_by_name:)
    end

    def create = save(MissionPlan.new, status: :created)

    def update = save(find_plan, status: :ok)

    def destroy
      find_plan.destroy!
      head :no_content
    end

    # POST /api/mission_plans/:id/duplicate: a copy named "<name> (copy)".
    # `dup` copies every column except the id and timestamps, but not the
    # stops, so the route is passed separately. Save recalculates the totals.
    def duplicate
      original = find_plan
      copy = original.dup
      copy.name = "#{original.name} (copy)"

      respond(MissionPlans::Save.call(plan: copy, planet_ids: original.route.map(&:id)), status: :created)
    end

    private

    def find_plan = MissionPlan.includes(mission_stops: :planet).find(params[:id])

    # The request body is top-level (PLAN.md Phase 6), so there is no root key to require.
    def mission_plan_params
      params.permit(:name, :customer_name, :spacecraft_id, :passenger_count, :notes, planet_ids: [])
    end

    def save(plan, status:)
      permitted = mission_plan_params
      # A missing planet_ids keeps the route; one given as null or empty clears it (and fails validation).
      planet_ids = params.key?(:planet_ids) ? Array(permitted[:planet_ids]) : nil

      respond(MissionPlans::Save.call(plan:, attributes: permitted.except(:planet_ids), planet_ids:), status:)
    end

    def respond(result, status:)
      return render_errors(model_errors(result.plan)) unless result.success?

      render json: MissionPlanSerializer.detail(result.plan, result.mission, planet_ids_by_name:), status:
    end
  end
end
