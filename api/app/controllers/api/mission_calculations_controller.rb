module Api
  # POST /api/mission_calculations: works out a mission without saving it.
  #
  #   { spacecraft_id:, passenger_count: (default 0), planet_ids: [] }
  #
  # Only input that cannot be calculated is rejected (422). Route problems such
  # as a missing Earth start are returned as violations, so the planner can
  # preview a route while it is being built.
  class MissionCalculationsController < BaseController
    def create
      errors = []

      spacecraft = Spacecraft.find_by(id: calculation_params[:spacecraft_id])
      errors << { field: "spacecraft_id", message: "Spacecraft not found (id #{calculation_params[:spacecraft_id]})" } unless spacecraft

      passengers = passenger_count
      errors << { field: "passenger_count", message: "must be a whole number of 0 or more" } if passengers.nil?

      planets = route(errors)
      return render_errors(errors) if errors.any?

      mission = MissionPlans::Calculate.call(route: planets, spacecraft: spacecraft, passengers: passengers)
      render json: MissionResultSerializer.call(mission, spacecraft:, planet_ids_by_name:)
    end

    private

    # The request body is top-level (PLAN.md Phase 6), so there is no root key to require.
    def calculation_params
      @calculation_params ||= params.permit(:spacecraft_id, :passenger_count, planet_ids: [])
    end

    # An Integer, or nil if the value is not a whole number of 0 or more.
    def passenger_count
      value = calculation_params.fetch(:passenger_count, 0).to_s
      Integer(value, 10) if value.match?(/\A\d+\z/)
    end

    def route(errors)
      ids = calculation_params[:planet_ids]
      unless ids.is_a?(Array)
        errors << { field: "planet_ids", message: "must be a list of planet ids" }
        return []
      end

      planets, unknown_ids = Planet.find_in_order(ids)
      unknown_ids.each { |id| errors << { field: "planet_ids", message: "includes an unknown planet (id #{id})" } }
      planets
    end
  end
end
