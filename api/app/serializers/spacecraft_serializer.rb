# JSON for one spacecraft: every stored field, plus the ids of the `planets`
# it can land on (by operating temperature).
module SpacecraftSerializer
  FIELDS = %i[
    id name slug size mass_kg capacity range_km speed_kmh gravity_generator
    min_operating_temp_c max_operating_temp_c extra_attributes
  ].freeze

  module_function

  def call(spacecraft, planets)
    spacecraft.slice(*FIELDS).merge(
      landable_planet_ids: planets.select { |planet| spacecraft.can_land_on?(planet) }.map(&:id)
    )
  end
end
