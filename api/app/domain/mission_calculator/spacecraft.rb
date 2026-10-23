class MissionCalculator
  # A spacecraft as the mission calculator sees it. Units are km, km/h, and °C.
  Spacecraft = Data.define(
    :name, :capacity, :range_km, :speed_kmh, :gravity_generator, :min_operating_temp_c, :max_operating_temp_c
  ) do
    def gravity_generator? = gravity_generator

    # Inclusive at both ends (docs/ASSUMPTIONS.md #16).
    def operates_at?(temperature_c) = temperature_c.between?(min_operating_temp_c, max_operating_temp_c)
  end
end
