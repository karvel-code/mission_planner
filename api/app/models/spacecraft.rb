# A spacecraft from the catalog (data/data.yml). Seeded by Catalog::Seeder.
class Spacecraft < ApplicationRecord
  # Landing needs the planet's average temperature within the operating
  # range, inclusive (docs/ASSUMPTIONS.md #16). Stars are never landable.
  def can_land_on?(planet)
    !planet.star? && to_mission_spacecraft.operates_at?(planet.average_temperature_c)
  end

  def to_mission_spacecraft
    MissionCalculator::Spacecraft.new(
      name:, capacity:, range_km:, speed_kmh:, gravity_generator:, min_operating_temp_c:, max_operating_temp_c:
    )
  end
end
