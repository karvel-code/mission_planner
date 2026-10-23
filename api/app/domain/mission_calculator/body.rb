class MissionCalculator
  # A planet or star as the mission calculator sees it. Units are km, °C, m/s², and mSv.
  Body = Data.define(
    :name, :body_type, :distance_from_sun_km, :radius_km,
    :average_temperature_c, :gravity_m_per_s2, :radiation_levels_msv
  ) do
    def star? = body_type == "Star"

    def circle = Geometry::Circle.new(Geometry::Point.new(distance_from_sun_km, 0), radius_km)
  end
end
