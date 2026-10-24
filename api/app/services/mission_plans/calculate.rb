module MissionPlans
  # Runs MissionCalculator on database records: converts them to the
  # calculator's value objects and supplies every body as an obstacle and the
  # advisory thresholds from config/advisories.yml.
  module Calculate
    module_function

    def call(route:, spacecraft:, passengers:)
      MissionCalculator.call(
        route: route.map(&:to_mission_body),
        bodies: Planet.all.map(&:to_mission_body),
        spacecraft: spacecraft.to_mission_spacecraft,
        passengers: passengers,
        thresholds: thresholds
      )
    end

    def thresholds = MissionCalculator::Thresholds.new(**Rails.application.config_for(:advisories))
  end
end
