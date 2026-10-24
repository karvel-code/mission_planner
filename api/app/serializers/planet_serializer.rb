# JSON for one catalog body: every stored field, plus whether it can be a destination.
module PlanetSerializer
  FIELDS = %i[
    id name slug body_type radius_km distance_from_sun_km average_temperature_c potentially_habitable
    weather_patterns radiation_levels_msv gravity_m_per_s2 moons extra_attributes
  ].freeze

  module_function

  def call(planet) = planet.slice(*FIELDS).merge(destination: !planet.star?)
end
