# A body from the catalog (data/data.yml), the Sun included. Seeded by Catalog::Seeder.
class Planet < ApplicationRecord
  STAR = "Star"

  # Bodies a mission can land on: every planet, never a star.
  scope :destinations, -> { where(body_type: "Planet") }

  # The planets for `ids` in the order given, repeats kept, plus the ids that
  # match no planet: [planets, unknown_ids].
  def self.find_in_order(ids)
    ids = ids.map(&:to_i)
    found = where(id: ids).index_by(&:id)

    [ ids.filter_map { |id| found[id] }, ids.reject { |id| found.key?(id) } ]
  end

  def star? = body_type == STAR

  def to_mission_body
    MissionCalculator::Body.new(
      name:, body_type:, distance_from_sun_km:, radius_km:,
      average_temperature_c:, gravity_m_per_s2:, radiation_levels_msv:
    )
  end
end
