module MissionPlans
  # Creates or updates a mission plan and its route, working out the mission
  # first so its totals can be cached on the plan.
  #
  #   result = MissionPlans::Save.call(plan: MissionPlan.new, attributes: {...}, planet_ids: [1, 4, 5])
  #   result.success?  # false when the plan is invalid; see result.plan.errors
  #   result.mission   # the MissionResult, with legs, violations, and advisories
  #
  # Leave `planet_ids` out to keep the plan's current route.
  class Save
    Result = Data.define(:plan, :mission) do
      def success? = !mission.nil?
    end

    def self.call(...) = new(...).call

    def initialize(plan:, attributes: {}, planet_ids: nil)
      @plan = plan
      @attributes = attributes
      @planet_ids = planet_ids
    end

    def call
      @plan.assign_attributes(@attributes)
      unknown_ids = assign_route unless @planet_ids.nil?

      valid = @plan.valid?
      unknown_ids&.each { |id| @plan.errors.add(:route, "includes an unknown planet (id #{id})") }
      return Result.new(plan: @plan, mission: nil) unless valid && unknown_ids.blank?

      mission = Calculate.call(route: @plan.route, spacecraft: @plan.spacecraft, passengers: @plan.passenger_count)
      @plan.assign_attributes(
        total_distance_km: mission.total_length_km,
        range_used_km: mission.total_range_used,
        duration_hours: mission.total_duration_h,
        feasible: mission.feasible?
      )
      # Saves the plan and its stops in one transaction.
      @plan.save!

      Result.new(plan: @plan, mission: mission)
    end

    private

    # Sets the route from the ids, in order. Returns the ids that match no planet.
    def assign_route
      ids = @planet_ids.map(&:to_i)
      planets = Planet.where(id: ids).index_by(&:id)

      @plan.route = ids.filter_map { |id| planets[id] }
      ids.reject { |id| planets.key?(id) }
    end
  end
end
