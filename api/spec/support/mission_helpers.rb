# Builders for MissionCalculator inputs from the real data, shared by the specs in spec/domain.
module MissionHelpers
  def body(key) = MissionCalculator::Body.new(**RealData::BODIES.fetch(key))

  # Every real body, Sun first: the obstacles for every leg.
  def all_bodies = RealData::BODIES.keys.map { |key| body(key) }

  def route(*keys) = keys.map { |key| body(key) }

  # A real spacecraft, optionally with some attributes changed (e.g. speed_kmh: 1).
  def spacecraft(key, **overrides) = MissionCalculator::Spacecraft.new(**RealData::SPACECRAFT.fetch(key).merge(overrides))

  # The defaults in config/advisories.yml, optionally with some changed.
  def thresholds(**overrides)
    defaults = { high_gravity_m_per_s2: 15, high_radiation_msv: 500, max_days_without_gravity_generator: 30 }

    MissionCalculator::Thresholds.new(**defaults.merge(overrides))
  end
end

RSpec.configure do |config|
  config.include MissionHelpers, file_path: %r{spec/domain/}
end
